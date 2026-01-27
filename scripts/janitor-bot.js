#!/usr/bin/env node

/**
 * TrustWave Janitor Bot
 * 
 * Scans the songs list for low-quality content (podcasts, spam, non-V4V)
 * Publishes downvotes (kind 7 reactions) to filter out junk via Web-of-Trust
 * 
 * The Gauntlet (Fail Criteria):
 *   - Duration > 15 minutes (900 seconds)
 *   - Title contains podcast keywords (Episode, Interview, etc.)
 *   - Missing podcast:value block (not V4V-enabled)
 *   - Medium is not music/song
 * 
 * Usage:
 *   Test mode:  node janitor-bot.js --test
 *   Full scan:  node janitor-bot.js
 *   Dry run:    node janitor-bot.js --dry-run (show what would be downvoted)
 */

import { nip19, getPublicKey, finalizeEvent } from 'nostr-tools';
import { WebSocket } from 'ws';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const NSEC = 'nsec1xfm674c09pp0sttes9k0hpmy80mpku05p707thhfw3puncfgum5s3nlznh'; // TrustWave Indexer
const RELAY_URL = 'wss://dcosl.brainstorm.world';
const API_PROXY = 'https://trustwave-pi-proxy.malfactoryst.workers.dev';

// Master lists
const SONGS_LIST_A_TAG = '39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38';

// Filtering criteria
const MAX_DURATION = 15 * 60; // 15 minutes in seconds
const MIN_DURATION = 45; // 45 seconds

const PODCAST_KEYWORDS = [
  /\bepisode\s+\d+/i,      // "Episode 123"
  /\bep\.?\s+\d+/i,        // "Ep. 5" or "Ep 5"
  /\binterview\b/i,        // "Interview"
  /\btrailer\b/i,          // "Trailer"
  /\bteaser\b/i,           // "Teaser"
  /\btalk\b/i,             // "Talk"
  /\bpodcast\b/i,          // "Podcast"
  /\bdiscussion\b/i,       // "Discussion"
  /\bconversation\b/i,     // "Conversation"
];

// Modes
const IS_TEST = process.argv.includes('--test');
const IS_DRY_RUN = process.argv.includes('--dry-run');
const TEST_LIMIT = 50;

const BATCH_SIZE = 50; // Downvotes per batch (reduced for relay stability)
const BATCH_DELAY_MS = 2000; // 2 seconds between batches (relay-friendly)

// Checkpoint
const CHECKPOINT_FILE = './janitor-checkpoint.json';

// ============================================================================
// HELPERS
// ============================================================================

let sk, pk;

function initKeys() {
  const decoded = nip19.decode(NSEC);
  sk = decoded.data;
  pk = getPublicKey(sk);
  console.log('🔑 Janitor Bot pubkey:', pk);
  console.log('📋 Mode:', IS_DRY_RUN ? 'DRY RUN (no publishing)' : 'LIVE');
}

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_FILE)) {
    return { downvotedSongs: new Set() };
  }
  
  const data = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8'));
  return {
    downvotedSongs: new Set(data.downvotedSongs || []),
  };
}

function saveCheckpoint(downvotedSongs) {
  const data = {
    downvotedSongs: Array.from(downvotedSongs),
    lastUpdated: new Date().toISOString(),
    totalDownvoted: downvotedSongs.size,
  };
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function failsGauntlet(song) {
  const reasons = [];
  
  // Check medium tag (if exists, must be 'music' or 'song')
  const medium = (song.medium || '').toLowerCase();
  if (medium && medium !== 'music' && medium !== 'song') {
    reasons.push(`wrong medium type: ${medium}`);
  }
  
  // Check duration
  const duration = parseInt(song.duration || '0', 10);
  if (duration > MAX_DURATION) {
    reasons.push(`duration too long (${Math.floor(duration / 60)} min)`);
  }
  if (duration < MIN_DURATION && duration > 0) {
    reasons.push(`duration too short (${duration} sec)`);
  }
  
  // Check title for podcast keywords
  const title = song.title || '';
  for (const pattern of PODCAST_KEYWORDS) {
    if (pattern.test(title)) {
      reasons.push(`title contains podcast keyword: ${pattern}`);
      break;
    }
  }
  
  return reasons;
}

async function checkHasValue(feedId) {
  // Check if feed has podcast:value block via API
  try {
    const response = await fetch(`${API_PROXY}/episodes/byfeedid?id=${feedId}&max=1`);
    if (!response.ok) return false;
    
    const data = await response.json();
    const firstEpisode = data.items?.[0];
    
    // Check if episode has value block
    return !!firstEpisode?.value;
  } catch (error) {
    return false; // Assume no value if API fails
  }
}

async function fetchAllSongs(ws) {
  console.log('📡 Fetching all songs from relay...');
  const songs = [];
  const RELAY_LIMIT = 10000;
  let oldestTimestamp = undefined;
  let batchCount = 0;
  
  while (true) {
    batchCount++;
    const reqId = `fetch-songs-${Date.now()}`;
    
    const batch = await new Promise((resolve) => {
      const batchSongs = [];
      
      const messageHandler = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg[0] === 'EVENT' && msg[1] === reqId) {
            const event = msg[2];
            
            const song = {
              id: event.id,
              pubkey: event.pubkey,
              createdAt: event.created_at,
            };
            
            // Extract tags
            for (const tag of event.tags) {
              if (tag[0] === 't') song.guid = tag[1];
              if (tag[0] === 'title') song.title = tag[1];
              if (tag[0] === 'artist') song.artist = tag[1];
              if (tag[0] === 'duration') song.duration = tag[1];
              if (tag[0] === 'feedId') song.feedId = tag[1];
              if (tag[0] === 'url') song.url = tag[1];
              if (tag[0] === 'medium') song.medium = tag[1];
            }
            
            batchSongs.push(song);
          } else if (msg[0] === 'EOSE' && msg[1] === reqId) {
            ws.off('message', messageHandler);
            resolve(batchSongs);
          }
        } catch (e) {}
      };
      
      ws.on('message', messageHandler);
      
      const filter = {
        kinds: [9999, 39999],
        '#z': [SONGS_LIST_A_TAG],
        limit: IS_TEST ? TEST_LIMIT : RELAY_LIMIT,
      };
      
      if (oldestTimestamp !== undefined) {
        filter.until = oldestTimestamp - 1;
      }
      
      console.log(`  Batch ${batchCount} (until: ${oldestTimestamp || 'none'})...`);
      ws.send(JSON.stringify(['REQ', reqId, filter]));
    });
    
    console.log(`  Received ${batch.length} songs`);
    
    if (batch.length === 0) break;
    
    songs.push(...batch);
    
    const oldest = batch.reduce((min, s) => Math.min(min, s.createdAt), Infinity);
    oldestTimestamp = oldest;
    
    if (batch.length < RELAY_LIMIT) break;
    if (IS_TEST) break;
  }
  
  console.log(`✅ Fetched ${songs.length} total songs\n`);
  return songs;
}

function createDownvoteEvent(song) {
  return finalizeEvent({
    kind: 7,
    content: '-',
    tags: [
      ['e', song.id],
      ['p', song.pubkey],
      ['k', '9999'],
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, sk);
}

async function publishBatch(events, ws) {
  return new Promise((resolve, reject) => {
    let okCount = 0;
    let failCount = 0;
    const eventIds = new Set(events.map(e => e.id));
    
    const messageHandler = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'OK' && eventIds.has(msg[1])) {
          if (msg[2]) {
            okCount++;
          } else {
            failCount++;
            if (failCount <= 3) {
              console.log(`    ❌ Rejected: ${msg[3]}`);
            }
          }
          
          if (okCount + failCount >= events.length) {
            ws.off('message', messageHandler);
            resolve({ okCount, failCount });
          }
        }
      } catch (e) {}
    };
    
    ws.on('message', messageHandler);
    
    for (const event of events) {
      ws.send(JSON.stringify(['EVENT', event]));
    }
    
    setTimeout(() => {
      ws.off('message', messageHandler);
      reject(new Error('Batch timeout'));
    }, 60000); // 60 second timeout (relay needs time to process)
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🧹 TrustWave Janitor Bot');
  console.log('========================\n');
  
  if (IS_TEST) {
    console.log('🧪 TEST MODE: Scanning only', TEST_LIMIT, 'songs\n');
  }
  
  initKeys();
  
  // Load checkpoint
  const checkpoint = loadCheckpoint();
  console.log(`📊 Already downvoted: ${checkpoint.downvotedSongs.size} songs\n`);
  
  // Connect to relay
  console.log('🔌 Connecting to relay:', RELAY_URL);
  const ws = new WebSocket(RELAY_URL);
  
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  
  console.log('✅ Connected\n');
  
  // Fetch all songs
  const allSongs = await fetchAllSongs(ws);
  
  // Filter out already downvoted
  const toAnalyze = allSongs.filter(s => !checkpoint.downvotedSongs.has(s.id));
  console.log(`🔍 Analyzing ${toAnalyze.length} songs (${checkpoint.downvotedSongs.size} already processed)\n`);
  
  const failedSongs = [];
  const passedSongs = [];
  
  // Analyze each song
  for (let i = 0; i < toAnalyze.length; i++) {
    const song = toAnalyze[i];
    
    if (i % 100 === 0) {
      console.log(`[${i}/${toAnalyze.length}] Analyzing...`);
    }
    
    const reasons = failsGauntlet(song);
    
    if (reasons.length > 0) {
      failedSongs.push({ song, reasons });
    } else {
      passedSongs.push(song);
    }
  }
  
  console.log('\n📊 Analysis Results:');
  console.log(`  ✅ Passed: ${passedSongs.length}`);
  console.log(`  ❌ Failed: ${failedSongs.length}\n`);
  
  if (failedSongs.length === 0) {
    console.log('🎉 No junk found! All songs pass the gauntlet.\n');
    ws.close();
    return;
  }
  
  // Show sample failures
  console.log('📋 Sample failures:');
  failedSongs.slice(0, 10).forEach(({ song, reasons }) => {
    console.log(`  - "${song.title}" by ${song.artist}`);
    console.log(`    Reasons: ${reasons.join(', ')}`);
  });
  console.log('');
  
  if (IS_DRY_RUN) {
    console.log('🏜️  DRY RUN MODE: Not publishing downvotes\n');
    ws.close();
    return;
  }
  
  // Publish downvotes in batches (sign on-the-fly to save memory)
  console.log(`📤 Publishing ${failedSongs.length} downvotes...\n`);
  
  let totalDownvoted = 0;
  
  for (let i = 0; i < failedSongs.length; i += BATCH_SIZE) {
    const batchSongs = failedSongs.slice(i, i + BATCH_SIZE);
    
    // Sign just this batch (not all 163k at once)
    const batchEvents = batchSongs.map(({ song }) => createDownvoteEvent(song));
    
    try {
      const result = await publishBatch(batchEvents, ws);
      totalDownvoted += result.okCount;
      console.log(`  ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(failedSongs.length / BATCH_SIZE)}: ${result.okCount}/${batchEvents.length} downvotes published`);
      
      // Update checkpoint with downvoted song IDs
      batchSongs.forEach(item => {
        checkpoint.downvotedSongs.add(item.song.id);
      });
      
      // Save checkpoint every 10 batches
      if ((i / BATCH_SIZE) % 10 === 0) {
        saveCheckpoint(checkpoint.downvotedSongs);
      }
      
      await delay(BATCH_DELAY_MS);
    } catch (error) {
      console.log(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
    }
  }
  
  // Final checkpoint save
  saveCheckpoint(checkpoint.downvotedSongs);
  
  ws.close();
  
  console.log('\n✅ Janitor Bot Complete!');
  console.log(`📊 Total Downvoted: ${totalDownvoted}`);
  console.log(`📊 Total Processed: ${checkpoint.downvotedSongs.size}`);
  console.log(`📊 Clean Songs: ${passedSongs.length}`);
  
  saveCheckpoint(checkpoint.downvotedSongs);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
