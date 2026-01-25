# TrustWave NIP Documentation

TrustWave is a decentralized music discovery application that uses the Nostr protocol for identity, social signals, and content organization. This document describes the custom event schemas and NIPs used by the application.

## External NIPs Used

### NIP-25: Reactions (Kind 7)

TrustWave uses NIP-25 reactions to allow users to upvote (`+`) or downvote (`-`) songs and musicians. These reactions are used to calculate scores for ranking content.

**Usage in TrustWave:**
- `content: "+"` - Thumbs up / like
- `content: "-"` - Thumbs down / dislike

**Example:**
```json
{
  "kind": 7,
  "content": "+",
  "tags": [
    ["e", "<list-item-event-id>", "wss://dcosl.brainstorm.world"],
    ["p", "<list-item-author-pubkey>"],
    ["k", "9999"]
  ]
}
```

### NIP-85: Trusted Assertions (Kind 30382, 10040)

TrustWave uses NIP-85 to filter content based on Web-of-Trust. Only reactions from "trusted" users (rank > 10) are counted.

**Kind 10040 - Trusted Service Providers:**
Specifies which service providers a user trusts for reputation calculations.

```json
{
  "kind": 10040,
  "tags": [
    ["30382:rank", "<service-provider-pubkey>", "wss://nip85.brainstorm.world"]
  ]
}
```

**Kind 30382 - Trusted Assertions (Pubkey):**
Contains calculated reputation metrics for a pubkey.

```json
{
  "kind": 30382,
  "tags": [
    ["d", "<subject-pubkey>"],
    ["p", "<subject-pubkey>"],
    ["rank", "85"]
  ]
}
```

### Decentralized Lists NIP (Kind 9998, 39998, 9999, 39999)

TrustWave uses the Decentralized Lists NIP to organize music content into permissionless lists that anyone can contribute to.

## TrustWave-Specific Event Schemas

### Song List Item (Kind 9999 or 39999)

When a curator adds a song from Podcast Index to the master songs list.

**Required Tags:**
- `z` - Reference to the parent list (the Songs master list)
- `t` - The podcast episode GUID (unique identifier)

**Recommended Tags:**
- `title` - Song/episode title
- `artist` - Artist/podcast author name
- `url` - Direct URL to the audio file (enclosure URL)
- `artwork` - URL to the album/episode artwork
- `duration` - Duration in seconds
- `feedId` - Podcast Index feed ID
- `feedGuid` - Podcast Index feed GUID
- `description` - Optional curator annotation

**Example:**
```json
{
  "kind": 9999,
  "content": "",
  "tags": [
    ["z", "39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38"],
    ["t", "episode-guid-123"],
    ["title", "My Amazing Song"],
    ["artist", "The Cool Artist"],
    ["url", "https://example.com/audio.mp3"],
    ["artwork", "https://example.com/artwork.jpg"],
    ["duration", "240"],
    ["feedId", "12345"],
    ["feedGuid", "feed-guid-abc"],
    ["description", "Great intro riff, skip to 1:30 for the drop"]
  ]
}
```

### Musician List Item (Kind 9999 or 39999)

When a curator adds a musician/artist (podcast feed) to the master musicians list.

**Required Tags:**
- `z` - Reference to the parent list (the Musicians master list)
- `t` - The podcast feed GUID

**Recommended Tags:**
- `name` - Musician/artist name
- `feedUrl` - RSS feed URL
- `artwork` - Artist/podcast artwork URL
- `description` - Optional curator annotation

**Example:**
```json
{
  "kind": 9999,
  "content": "",
  "tags": [
    ["z", "39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:8623051e-1736-437d-92b1-9049b86def30"],
    ["t", "feed-guid-abc"],
    ["name", "The Cool Artist"],
    ["feedUrl", "https://example.com/feed.xml"],
    ["artwork", "https://example.com/artist.jpg"]
  ]
}
```

### Genre Sublist Header (Kind 39998)

When a curator creates a new genre-based sublist for organizing songs.

**Required Tags:**
- `names` - Singular and plural form of the list name
- `parent` - Reference to the master Songs list (ensures this is a music sublist)

**Recommended Tags:**
- `description` - Description of the list/genre
- `genre` - Genre tag for filtering

**Example:**
```json
{
  "kind": 39998,
  "content": "",
  "tags": [
    ["d", "unique-list-id"],
    ["names", "bitcoin rap song", "bitcoin rap songs"],
    ["description", "Hip-hop and rap tracks about Bitcoin and cryptocurrency"],
    ["genre", "hip-hop"],
    ["genre", "bitcoin"],
    ["parent", "39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38"],
    ["required", "t"],
    ["recommended", "title", "artist", "url", "artwork"]
  ]
}
```

## Relay Configuration

TrustWave uses specific relays for different purposes:

| Purpose | Relay |
|---------|-------|
| Decentralized Lists (read/write) | `wss://dcosl.brainstorm.world` |
| NIP-85 Trusted Assertions | `wss://nip85.brainstorm.world` |
| User profiles and general data | Standard Nostr relays |

## Master Lists

TrustWave has two master lists that serve as the entry point for all content:

### Songs Master List
- **a-tag:** `39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38`
- **Purpose:** Contains all songs/episodes indexed in the app

### Musicians Master List
- **a-tag:** `39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:8623051e-1736-437d-92b1-9049b86def30`
- **Purpose:** Contains all musicians/artists indexed in the app

## Web-of-Trust Filtering

All content displayed in TrustWave is filtered through a Web-of-Trust mechanism:

1. **Fetch user's trusted providers** (kind 10040) to find who they trust for reputation data
2. **Fetch trusted assertions** (kind 30382) from those providers
3. **Build trust map** of pubkeys with their rank scores
4. **Filter reactions** - only count reactions from users with rank > 10
5. **Calculate scores** - sum up filtered reactions (+1 for thumbs up, -1 for thumbs down)
6. **Hide negative scores** - items with score < 0 are hidden
7. **Rank by score** - display items in descending order of score

If a user has no kind 10040 event or is not logged in, the app falls back to the genesis curator's trusted assertions.

## Value-for-Value (V4V)

TrustWave supports Value-for-Value payments via the Lightning Network. When playing a track, the app reads the `podcast:value` tag from the RSS feed to determine where to send payments (boosts/zaps).

The `podcast:value` tag contains:
- **Model:** Payment model type (typically "lightning")
- **Destinations:** Array of Lightning addresses with split percentages
