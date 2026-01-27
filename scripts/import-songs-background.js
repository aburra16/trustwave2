#!/usr/bin/env node

/**
 * TrustWave Background Song Importer
 * 
 * Slowly imports all songs for all musicians from Podcast Index API
 * Rate-limited to 1 call per second (API-friendly)
 * Resumable with checkpoint tracking
 * 
 * Usage:
 *   Test mode:  node import-songs-background.js --test
 *   Full run:   node import-songs-background.js
 *   Resume:     node import-songs-background.js --resume
 */

import { nip19, getPublicKey, finalizeEvent } from 'nostr-tools';
import { WebSocket } from 'ws';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const NSEC = 'nsec1xfm674c09pp0sttes9k0hpmy80mpku05p707thhfw3puncfgum5s3nlznh';
const RELAY_URL = 'wss://dcosl.brainstorm.world';
const API_PROXY = 'https://trustwave-pi-proxy.malfactoryst.workers.dev';
const SONGS_LIST_A_TAG = '39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38';

// Rate limiting
const API_DELAY_MS = 1000; // 1 second between API calls (3,600/hour)
const BATCH_SIZE = 100; // Publish 100 songs at a time
const BATCH_DELAY_MS = 500; // 500ms between batches

// Test mode
const IS_TEST = process.argv.includes('--test');
const TEST_LIMIT = 10; // Process 10 artists in test mode

// Resume mode
const IS_RESUME = process.argv.includes('--resume');
const CHECKPOINT_FILE = process.env.CHECKPOINT_PATH || './songs-import-checkpoint.json';

// ============================================================================
// HELPERS
// ============================================================================

let sk, pk;

function initKeys() {
  const decoded = nip19.decode(NSEC);
  sk = decoded.data;
  pk = getPublicKey(sk);
  console.log('🔑 Using pubkey:', pk);
}

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_FILE)) {
    return { processedMusicians: new Set(), lastProcessedIndex: 0 };
  }
  
  const data = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8'));
  return {
    processedMusicians: new Set(data.processedMusicians || []),
    lastProcessedIndex: data.lastProcessedIndex || 0,
  };
}

function saveCheckpoint(processedMusicians, lastProcessedIndex) {
  const data = {
    processedMusicians: Array.from(processedMusicians),
    lastProcessedIndex,
    lastUpdated: new Date().toISOString(),
  };
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createSongEvent(episode, musicianName, feedId, feedGuid, artwork) {
  return finalizeEvent({
    kind: 9999,
    content: '',
    tags: [
      ['z', SONGS_LIST_A_TAG],
      ['medium', 'music'], // Quality stamp - validated at import time
      ['t', episode.guid],
      ['title', episode.title],
      ['artist', musicianName],
      ['url', episode.enclosureUrl],
      ['duration', String(episode.duration || 0)],
      ['feedId', String(feedId)],
      ['feedGuid', feedGuid || ''],
      ['artwork', episode.image || artwork || ''],
      ['alt', `Song: ${episode.title} by ${musicianName}`],
    ].filter(tag => tag[1]),
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
    }, 30000);
  });
}

async function fetchMusicians(ws) {
  console.log('📡 Fetching musicians from relay (may take multiple batches)...');
  const musicians = [];
  const RELAY_LIMIT = 10000;
  let oldestTimestamp = undefined;
  let batchCount = 0;
  
  while (true) {
    batchCount++;
    const reqId = `fetch-musicians-${Date.now()}`;
    
    const batch = await new Promise((resolve) => {
      const batchMusicians = [];
      
      const messageHandler = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg[0] === 'EVENT' && msg[1] === reqId) {
            const event = msg[2];
            const feedId = event.tags.find(t => t[0] === 'feedId')?.[1];
            const feedGuid = event.tags.find(t => t[0] === 'feedGuid')?.[1];
            const name = event.tags.find(t => t[0] === 'name')?.[1];
            const artwork = event.tags.find(t => t[0] === 'artwork')?.[1];
            
            if (feedId && feedGuid) {
              batchMusicians.push({ id: event.id, feedId, feedGuid, name, artwork, createdAt: event.created_at });
            }
          } else if (msg[0] === 'EOSE' && msg[1] === reqId) {
            ws.off('message', messageHandler);
            resolve(batchMusicians);
          }
        } catch (e) {}
      };
      
      ws.on('message', messageHandler);
      
      const filter = {
        kinds: [9999, 39999],
        '#z': ['39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:8623051e-1736-437d-92b1-9049b86def30'],
        limit: IS_TEST ? TEST_LIMIT : RELAY_LIMIT,
      };
      
      if (oldestTimestamp !== undefined) {
        filter.until = oldestTimestamp - 1;
      }
      
      console.log(`  Fetching batch ${batchCount} (until: ${oldestTimestamp || 'none'})...`);
      ws.send(JSON.stringify(['REQ', reqId, filter]));
    });
    
    console.log(`  Received ${batch.length} musicians in batch ${batchCount}`);
    
    if (batch.length === 0) {
      console.log('  No more musicians to fetch\n');
      break;
    }
    
    musicians.push(...batch);
    
    // Update oldest timestamp for pagination
    const oldest = batch.reduce((min, m) => Math.min(min, m.createdAt), Infinity);
    oldestTimestamp = oldest;
    
    // If we got less than relay limit, we've reached the end
    if (batch.length < RELAY_LIMIT) {
      console.log('  Reached end of musicians list\n');
      break;
    }
    
    // In test mode, only do one batch
    if (IS_TEST) break;
  }
  
  return musicians;
}

// Podcast keyword patterns (same as janitor bot)
const PODCAST_PATTERNS = [
  /\bepisode\s+\d+/i,      // "Episode 123"
  /\bep\.?\s+\d+/i,        // "Ep. 5" or "Ep 5"
  /\binterview\b/i,        // "Interview"
  /\btrailer\b/i,          // "Trailer"
  /\bteaser\b/i,           // "Teaser"
  /\btalk\b/i,             // "Talk"
  /\bpodcast\b/i,          // "Podcast"
  /\bdiscussion\b/i,       // "Discussion"
  /\bconversation\b/i,     // "Conversation"
  /\bnews\b/i,             // "News"
];

const MAX_MUSIC_DURATION = 15 * 60; // 15 minutes
const MIN_MUSIC_DURATION = 45; // 45 seconds

async function fetchEpisodesFromAPI(feedId) {
  try {
    const response = await fetch(`${API_PROXY}/episodes/byfeedid?id=${feedId}&max=100`);
    if (!response.ok) {
      console.log(`    ⚠️  API error ${response.status}`);
      return [];
    }
    const data = await response.json();
    const episodes = data.items || [];
    
    // FILTER: Only return episodes that look like music
    const validEpisodes = episodes.filter(ep => {
      const duration = ep.duration || 0;
      const title = (ep.title || '').toLowerCase();
      
      // Duration checks
      if (duration < MIN_MUSIC_DURATION || duration > MAX_MUSIC_DURATION) {
        return false;
      }
      
      // Keyword checks
      const hasPodcastKeyword = PODCAST_PATTERNS.some(pattern => pattern.test(title));
      if (hasPodcastKeyword) {
        return false;
      }
      
      return true;
    });
    
    if (validEpisodes.length < episodes.length) {
      console.log(`    🧹 Filtered out ${episodes.length - validEpisodes.length} non-music episodes`);
    }
    
    return validEpisodes;
  } catch (error) {
    console.log(`    ⚠️  API error: ${error.message}`);
    return [];
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🎵 TrustWave Background Song Importer');
  console.log('=====================================\n');
  
  if (IS_TEST) {
    console.log('🧪 TEST MODE: Processing only', TEST_LIMIT, 'artists\n');
  }
  
  initKeys();
  
  // Load checkpoint
  const checkpoint = IS_RESUME ? loadCheckpoint() : { processedMusicians: new Set(), lastProcessedIndex: 0 };
  console.log(`📊 Checkpoint: ${checkpoint.processedMusicians.size} musicians already processed\n`);
  
  // Connect to relay
  console.log('🔌 Connecting to relay:', RELAY_URL);
  const ws = new WebSocket(RELAY_URL);
  
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  
  console.log('✅ Connected\n');
  
  // Fetch all musicians
  console.log('📡 Fetching musicians from relay...');
  const musicians = await fetchMusicians(ws);
  console.log(`✅ Found ${musicians.length} musicians\n`);
  
  // Filter out already processed
  const toProcess = musicians.filter(m => !checkpoint.processedMusicians.has(m.id));
  console.log(`🎯 Processing ${toProcess.length} musicians (${checkpoint.processedMusicians.size} already done)\n`);
  
  let totalSongs = 0;
  let failedMusicians = 0;
  
  for (let i = 0; i < toProcess.length; i++) {
    const musician = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] ${musician.name || musician.feedGuid}`);
    
    // Fetch episodes from API
    const episodes = await fetchEpisodesFromAPI(musician.feedId);
    console.log(`  📀 ${episodes.length} episodes`);
    
    await delay(API_DELAY_MS); // Rate limit API calls
    
    if (episodes.length === 0) {
      checkpoint.processedMusicians.add(musician.id);
      continue;
    }
    
    // Create song events
    const songEvents = episodes.map(ep => 
      createSongEvent(ep, musician.name, musician.feedId, musician.feedGuid, musician.artwork)
    );
    
    // Publish in batches
    let publishedCount = 0;
    for (let j = 0; j < songEvents.length; j += BATCH_SIZE) {
      const batch = songEvents.slice(j, j + BATCH_SIZE);
      
      try {
        const result = await publishBatch(batch, ws);
        publishedCount += result.okCount;
        console.log(`  ✅ Published ${result.okCount}/${batch.length} songs`);
        
        if (result.failCount > 0) {
          console.log(`  ⚠️  ${result.failCount} rejected`);
        }
        
        await delay(BATCH_DELAY_MS);
      } catch (error) {
        console.log(`  ❌ Batch failed: ${error.message}`);
      }
    }
    
    totalSongs += publishedCount;
    checkpoint.processedMusicians.add(musician.id);
    checkpoint.lastProcessedIndex = i;
    
    // Save checkpoint every 10 musicians
    if (i % 10 === 0) {
      saveCheckpoint(checkpoint.processedMusicians, i);
    }
    
    console.log(`  📊 Total songs: ${totalSongs}\n`);
  }
  
  ws.close();
  
  console.log('\n✅ Import Complete!');
  console.log(`📊 Total Songs Imported: ${totalSongs}`);
  console.log(`📊 Musicians Processed: ${checkpoint.processedMusicians.size}`);
  console.log(`📊 Failed Musicians: ${failedMusicians}`);
  
  saveCheckpoint(checkpoint.processedMusicians, toProcess.length);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
