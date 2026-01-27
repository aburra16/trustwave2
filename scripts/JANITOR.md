# TrustWave Janitor Bot

The Janitor Bot is a high-reputation curator that scans the songs list and downvotes low-quality content (podcasts, spam, non-V4V items). It leverages the Web-of-Trust system to filter junk without deleting data.

## How It Works

1. **Scan** - Fetches all kind 9999 song events from DCOSL relay
2. **Analyze** - Runs each song through "The Gauntlet" (quality checks)
3. **Downvote** - Publishes kind 7 reactions (`content: "-"`) for failed items
4. **Result** - Users who trust the bot see clean, filtered results

## The Gauntlet (Fail Criteria)

A song is downvoted if it meets ANY of these criteria:

- ❌ **Duration > 15 minutes** (900 seconds) - Likely a DJ mix or podcast
- ❌ **Duration < 45 seconds** - Likely an intro/teaser/jingle
- ❌ **Title contains podcast keywords:**
  - "Episode 123" (with number)
  - "Ep. 5" or "Ep 5"
  - "Interview", "Trailer", "Teaser"
  - "Talk", "Podcast", "Discussion", "Conversation"

**Note:** V4V check removed for now (too strict, would exclude many legitimate artists)

## Running the Bot

### Test Mode (Scan 50 songs)

```bash
cd scripts
node janitor-bot.js --test
```

Shows what would be downvoted without publishing.

### Dry Run (Full scan, no publishing)

```bash
node janitor-bot.js --dry-run
```

Scans all songs and shows statistics, but doesn't publish downvotes.

### Live Run (Publish downvotes)

```bash
node janitor-bot.js
```

Scans and publishes downvotes for all junk content.

## Output Example

```
🧹 TrustWave Janitor Bot
========================

🔑 Janitor Bot pubkey: 77599c5c...
📋 Mode: LIVE

🔌 Connecting to relay: wss://dcosl.brainstorm.world
✅ Connected

📡 Fetching all songs from relay...
  Batch 1 (until: none)...
  Received 10000 songs
  Batch 2 (until: 1769483702)...
  Received 8532 songs
✅ Fetched 18532 total songs

🔍 Analyzing 18532 songs (0 already processed)

[0/18532] Analyzing...
[100/18532] Analyzing...
...

📊 Analysis Results:
  ✅ Passed: 16243
  ❌ Failed: 2289

📋 Sample failures:
  - "Daily News Episode 45" by News Network
    Reasons: title contains podcast keyword: /\bepisode\s+\d+/i
  - "3 Hour Deep Focus Mix" by DJ Someone
    Reasons: duration too long (180 min)

📤 Publishing 2289 downvotes...

  ✅ Batch 1: 100/100 downvotes published
  ✅ Batch 2: 100/100 downvotes published
  ...

✅ Janitor Bot Complete!
📊 Total Downvoted: 2289
📊 Total Processed: 2289
📊 Clean Songs: 16243
```

## Resumable

The bot saves progress in `janitor-checkpoint.json`. If interrupted, it won't re-downvote songs already processed.

## Impact on Users

**Users who trust the Janitor Bot** (include its pubkey in their WoT):
- See clean, music-only catalog
- Junk songs hidden (score pushed negative)
- Better discovery experience

**Users who don't trust the bot:**
- See everything (including junk)
- Can make their own curation decisions
- Full transparency

## Running on Digital Ocean

Same deployment as the song importer - see `DEPLOYMENT.md`:

```bash
ssh root@<droplet-ip>
cd /root/trustwave2/scripts
tmux new -s janitor
node janitor-bot.js
# Ctrl+B, D to detach
```

## When to Run

- **Initial cleanup:** After bulk import completes
- **Periodic scans:** Weekly or monthly to catch new junk
- **On-demand:** When users report spam/quality issues

## Future Enhancements

- Check podcast:value block (requires API call per song - slow)
- Machine learning model for junk detection
- Community voting (multiple janitor bots with consensus)
- Language filtering
- Explicit content filtering
- Genre validation

## Bot Identity

The Janitor Bot publishes under the TrustWave Indexer account:
- npub: `npub1ww2yfryvzs7u5jh0rnknf08f5w0mqvj2j9ty3tnu0m062rvl6slsv5t44v`
- pubkey: `77599c5c4a7ba08456679d812a414037f4b01c975fb4f577187df11d189f80d3`

Users can choose to trust or distrust this curator in their Web-of-Trust settings.
