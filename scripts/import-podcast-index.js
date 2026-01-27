#!/usr/bin/env node

/**
 * TrustWave Bulk Import Script
 * 
 * Imports music from Podcast Index SQLite database to TrustWave decentralized lists
 * 
 * Usage:
 *   1. npm install (installs dependencies)
 *   2. Update NSEC and DB_PATH below
 *   3. node scripts/import-podcast-index.js
 */

import Database from 'better-sqlite3';
import { nip19, getPublicKey, finalizeEvent } from 'nostr-tools';
import { WebSocket } from 'ws';

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

const NSEC = 'nsec1xfm674c09pp0sttes9k0hpmy80mpku05p707thhfw3puncfgum5s3nlznh'; // TrustWave Indexer nsec
const DB_PATH = '/Users/avinashburra/downloads/podcastindex'; // Path to your SQLite DB file
const RELAY_URL = 'wss://dcosl.brainstorm.world';
const BATCH_SIZE = 500; // Events per batch (match relay maxFilterLimit)
const BATCH_DELAY_MS = 2000; // Delay between batches (2 seconds)

// Master list a-tags
const SONGS_LIST_A_TAG = '39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38';
const MUSICIANS_LIST_A_TAG = '39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:8623051e-1736-437d-92b1-9049b86def30';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

let sk;
let pk;

function initKeys() {
  const decoded = nip19.decode(NSEC);
  sk = decoded.data;
  pk = getPublicKey(sk);
  console.log('🔑 Using pubkey:', pk);
}

function createMusicianEvent(feed) {
  return finalizeEvent({
    kind: 9999,
    content: '',
    tags: [
      ['z', MUSICIANS_LIST_A_TAG],
      ['t', feed.podcastGuid],
      ['name', feed.author || feed.title],
      ['feedUrl', feed.url],
      ['feedId', String(feed.id)],
      ['feedGuid', feed.podcastGuid],
      ['artwork', feed.artwork || feed.image || ''],
      ['alt', `Musician: ${feed.author || feed.title}`],
    ].filter(tag => tag[1]), // Remove empty values
    created_at: Math.floor(Date.now() / 1000),
  }, sk);
}

function createSongEvent(episode, feed) {
  return finalizeEvent({
    kind: 9999,
    content: '',
    tags: [
      ['z', SONGS_LIST_A_TAG],
      ['t', episode.guid],
      ['title', episode.title],
      ['artist', feed.author || feed.title],
      ['url', episode.enclosureUrl],
      ['duration', String(episode.duration || 0)],
      ['feedId', String(feed.id)],
      ['feedGuid', feed.podcastGuid],
      ['artwork', episode.image || feed.artwork || feed.image || ''],
      ['alt', `Song: ${episode.title} by ${feed.author || feed.title}`],
    ].filter(tag => tag[1]),
    created_at: Math.floor(Date.now() / 1000),
  }, sk);
}

async function publishBatch(events, ws) {
  return new Promise((resolve, reject) => {
    let okCount = 0;
    let failCount = 0;
    const eventIds = new Set(events.map(e => e.id));
    
    // Listen for OK messages
    const messageHandler = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'OK' && eventIds.has(msg[1])) {
          if (msg[2]) {
            okCount++;
          } else {
            failCount++;
            console.log(`  ❌ Rejected: ${msg[3]}`);
          }
          
          // All responses received?
          if (okCount + failCount >= events.length) {
            ws.off('message', messageHandler);
            resolve({ okCount, failCount });
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    
    ws.on('message', messageHandler);
    
    // Send all events
    for (const event of events) {
      ws.send(JSON.stringify(['EVENT', event]));
    }
    
    // Timeout after 30 seconds
    setTimeout(() => {
      ws.off('message', messageHandler);
      reject(new Error('Batch timeout'));
    }, 30000);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN IMPORT LOGIC
// ============================================================================

async function main() {
  console.log('🎵 TrustWave Bulk Import Script');
  console.log('================================\n');
  
  initKeys();
  
  // Open SQLite database
  console.log('📂 Opening database:', DB_PATH);
  const db = new Database(DB_PATH, { readonly: true });
  
  // Get count of music feeds
  const musicFeedsCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM feeds 
    WHERE medium = 'music'
  `).get();
  
  console.log(`📊 Found ${musicFeedsCount.count} music feeds in database\n`);
  
  // Connect to relay
  console.log('🔌 Connecting to relay:', RELAY_URL);
  const ws = new WebSocket(RELAY_URL);
  
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  
  console.log('✅ Connected to relay\n');
  
  // Query music feeds
  const feeds = db.prepare(`
    SELECT id, podcastGuid, title, author, url, artwork, image
    FROM feeds 
    WHERE medium = 'music'
    LIMIT 100
  `).all(); // Start with 100 for testing
  
  console.log(`🎸 Processing ${feeds.length} music feeds...\n`);
  
  let totalMusicians = 0;
  let totalSongs = 0;
  
  for (let i = 0; i < feeds.length; i++) {
    const feed = feeds[i];
    console.log(`[${i + 1}/${feeds.length}] Processing: ${feed.author || feed.title}`);
    
    // Create musician event
    const musicianEvent = createMusicianEvent(feed);
    
    // Get episodes for this feed
    const episodes = db.prepare(`
      SELECT id, guid, title, enclosureUrl, duration, image
      FROM episodes
      WHERE feedId = ?
      LIMIT 1000
    `).all(feed.id);
    
    console.log(`  📀 Found ${episodes.length} episodes`);
    
    // Create song events
    const songEvents = episodes.map(ep => createSongEvent(ep, feed));
    
    // Combine all events for this artist
    const allEvents = [musicianEvent, ...songEvents];
    
    // Publish in batches
    for (let j = 0; j < allEvents.length; j += BATCH_SIZE) {
      const batch = allEvents.slice(j, j + BATCH_SIZE);
      
      try {
        const result = await publishBatch(batch, ws);
        console.log(`  ✅ Batch ${Math.floor(j / BATCH_SIZE) + 1}: ${result.okCount} OK, ${result.failCount} failed`);
        
        totalMusicians += batch.filter(e => e.tags.some(t => t[0] === 'z' && t[1] === MUSICIANS_LIST_A_TAG)).length;
        totalSongs += batch.filter(e => e.tags.some(t => t[0] === 'z' && t[1] === SONGS_LIST_A_TAG)).length;
        
        // Delay between batches
        if (j + BATCH_SIZE < allEvents.length) {
          await delay(BATCH_DELAY_MS);
        }
      } catch (error) {
        console.error(`  ❌ Batch failed:`, error.message);
      }
    }
    
    console.log('');
  }
  
  ws.close();
  db.close();
  
  console.log('\n✅ Import Complete!');
  console.log(`📊 Total Musicians: ${totalMusicians}`);
  console.log(`📊 Total Songs: ${totalSongs}`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
