# TrustWave Bulk Import Script

This script imports music from the Podcast Index SQLite database dump to TrustWave's decentralized lists.

## Prerequisites

1. Node.js installed
2. Podcast Index SQLite database (`.db` file)
3. TrustWave Indexer nsec (provided)

## Setup

```bash
cd scripts
npm init -y
npm install better-sqlite3 nostr-tools ws @noble/hashes
```

## Configuration

Edit `import-podcast-index.js` and update:

1. **DB_PATH**: Path to your Podcast Index `.db` file
2. **NSEC**: Already set to TrustWave Indexer nsec

## What It Does

1. Opens your Podcast Index SQLite database
2. Filters for `medium = 'music'` (excludes podcasts)
3. For each music feed:
   - Creates a musician event (kind 9999)
   - Fetches all episodes
   - Creates song events for each episode (kind 9999)
4. Publishes to `wss://dcosl.brainstorm.world` in batches of 500
5. 2-second delay between batches (rate limit friendly)

## Running the Script

```bash
# Test run (100 feeds only)
node import-podcast-index.js

# After testing, edit the script to remove LIMIT 100 for full import
```

## Expected Output

```
🎵 TrustWave Bulk Import Script
================================

🔑 Using pubkey: fb5444dc...
📂 Opening database: /path/to/db
📊 Found 50,000 music feeds in database

🔌 Connecting to relay: wss://dcosl.brainstorm.world
✅ Connected to relay

🎸 Processing 100 music feeds...

[1/100] Processing: Hartlight
  📀 Found 15 episodes
  ✅ Batch 1: 16 OK, 0 failed

[2/100] Processing: Steve Thorne
  📀 Found 12 episodes
  ✅ Batch 1: 13 OK, 0 failed
...

✅ Import Complete!
📊 Total Musicians: 100
📊 Total Songs: 1,247
```

## Rate Limit Note

Ask the DCOSL relay maintainer to increase `maxFilterLimit` from 500 to 10,000 in the strfry config (line 91) before running the full import.

## Safety Features

- Starts with LIMIT 100 for testing
- Logs progress for each feed
- Shows OK vs failed counts per batch
- Graceful error handling
- Can resume if interrupted (just skip processed feeds)

## Next Steps After Import

Once all songs are imported:
1. Users can discover via Web-of-Trust filtering
2. Curators can create genre/mood playlists
3. Songs can be upvoted/downvoted by the community
