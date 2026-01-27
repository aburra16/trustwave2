# TrustWave

**Decentralized music discovery powered by Web-of-Trust**

TrustWave is a Nostr-based music discovery application that replaces opaque algorithms with transparent social filtering. Music is sourced from Podcast Index RSS feeds, organized through decentralized lists on Nostr, and filtered through your personal Web-of-Trust network.

## 🎯 Core Concept

**The Problem:** Millions of independent V4V-enabled tracks exist on Podcast Index, but listeners can't find quality music because open repositories are noisy and disorganized.

**The Solution:** Layer reputation over raw data using Web-of-Trust. Users only see music curated and voted on by people they trust. No centralized algorithms, no opaque ranking—just transparent social filtering.

---

## 🏗️ Architecture

TrustWave uses a 5-layer stack:

### Layer 1: Distribution (RSS)
- Music sourced from **Podcast Index** (V4V-enabled RSS feeds)
- Audio files hosted by artists (Wavlake, Fountain, self-hosted)
- TrustWave doesn't host any music - just indexes trust signals

### Layer 2: Identity (Nostr)
- User authentication via **NIP-07** (browser extensions) or **NIP-46** (remote signing)
- Cryptographic identities anchor all trust relationships
- No central authority controls accounts

### Layer 3: Organization (Decentralized Lists)
- Uses custom **Decentralized Lists NIP** (kind 9998/39998/9999/39999)
- Two master lists on `wss://dcosl.brainstorm.world`:
  - **Songs List**: All music tracks in the catalog
  - **Musicians List**: All artists/feeds in the catalog
- Anyone can add items to these permissionless lists
- Curators can create genre/mood sublists

### Layer 4: Curation (Web-of-Trust)
- **NIP-85 Trusted Assertions** (kind 30382) calculate reputation scores
- Only votes from users with **rank > 50** are counted
- Users specify trust providers via **kind 10040** events
- Fallback: Empty trust map (only user's own votes count)

### Layer 5: Presentation (The App)
- React 18 + TypeScript + TailwindCSS
- Audio player streams directly from RSS enclosure URLs
- Users upvote/downvote with **NIP-25 reactions** (kind 7)
- V4V payments via **Lightning Network** (Boost feature)

---

## ✨ Key Features

### 🎵 Music Discovery

**Trending Pages**
- `/trending/songs` - Top songs ranked by Web-of-Trust score
- `/trending/artists` - Top artists ranked by aggregated song scores
- Infinite scroll (loads 25 items at a time)
- Only shows music (podcasts filtered out by duration >20min and keywords)

**Search**
- `/search` - Search the Nostr-based catalog (instant, client-side)
- Searches songs by title and artist name
- Shows both songs and matching artists
- No external API calls (searches local data)

**Browse**
- `/browse` - Genre and mood playlists created by curators
- Community-organized content (future feature)

### 🎧 Audio Player

**Features:**
- Streams audio directly from RSS enclosure URLs
- Playback controls: play/pause, next/previous, volume
- **Interactive seek bar** - click/drag to scrub through song
- Queue management with playlist support
- Mobile-responsive with expandable controls
- Persistent bottom bar across all pages

**Reactions:**
- Upvote/downvote buttons (thumbs up/down) on player
- Instant feedback with optimistic updates
- Only one vote per user per song (most recent counts)

### 🤝 Web-of-Trust Filtering

**How It Works:**
1. **User has kind 10040** → Points to trust provider (service that calculated WoT scores)
2. **Fetch kind 30382 events** → Trust assertions (rank scores 0-100) for all pubkeys
3. **On-demand lookup** → Only fetch scores for people who actually voted (efficient)
4. **Filter votes** → Only count reactions from users with rank > 50
5. **User always rank 100** → Your own votes always count (hardcoded)

**Personalization:**
- **"Personalize" button** in header:
  - No kind 10040: Purple gradient button → links to https://brainstorm.nosfabrica.com
  - Has kind 10040: Green "Personalized" badge (non-clickable)
- Users without WoT see zero scores (only their own votes)
- Users with WoT see filtered, high-quality content

**Score Calculation:**
```
score = (trusted upvotes) - (trusted downvotes)
```
- Songs with score < 0 are hidden
- Songs sorted by score (descending)

### 👥 Social Context

**Voter Transparency:**
- See **who upvoted** each song (stacked avatars)
- Click avatars → full dialog with all voters
- Hover avatar → profile card (name, about, voted status)
- Makes votes meaningful by showing WHO in your network vouched for content

**Profile Display:**
- Fetches kind 0 metadata for all voters
- Shows profile pictures, names, bio
- Upvoters and downvoters separated in dialogs

### 🎤 Curator Tools

**Add Music** (`/add-music`)
- Search **Podcast Index** for new content
- Add artists → automatically imports all their songs
- Add individual songs from search results
- Duplicate detection (checks relay before adding)
- Shows "Added ✓" if already in catalog

**Curate** (`/curate`)
- Create genre/mood playlists (kind 39998 list headers)
- Playlists link to master songs list as parent
- Name (singular/plural), description, genre tags
- View your created playlists

**Manage** (`/manage`)
- View all content YOU added (filtered by your pubkey)
- Hide outdated entries (stored in localStorage)
- Delete from relay (kind 5) with fallback to local hide
- Shows which entries are missing `feedId` (need re-adding)

### ⚡ Value-for-Value (V4V)

**Boost Dialog:**
- Click "Boost" button on player
- Select preset amounts (100, 500, 1k, 5k, 10k sats)
- Or enter custom amount
- Parses `podcast:value` tags from RSS for payment splits
- Integrates with WebLN and NWC wallets
- Direct payments to artists (100% minus network fees)

---

## 🔧 Technical Implementation

### Technology Stack

- **React 18** - UI framework with hooks and concurrent rendering
- **TypeScript** - Type-safe development
- **TailwindCSS 3** - Utility-first styling with custom dark theme
- **Vite** - Fast build tool and dev server
- **Nostrify** - Nostr protocol framework
- **TanStack Query** - Data fetching, caching, optimistic updates
- **shadcn/ui** - Accessible UI components (Radix UI + Tailwind)
- **React Router** - Client-side routing
- **nostr-tools** - Nostr utilities (nip19, key generation)

### Custom Hooks

**Data Fetching:**
- `useSongsList()` - Fetches songs with WoT filtering and scoring
- `useMusiciansList()` - Fetches musicians with user's additions prioritized
- `useTrendingSongs()` - Reuses songs list (sorted by score)
- `useTrendingArtists()` - Reuses musicians list (sorted by score)
- `usePodcastIndex*()` - Search and fetch from Podcast Index API

**Trust & Scoring:**
- `useTrustProviders()` - Fetches user's kind 10040 (trust provider config)
- `useBatchTrustScores()` - On-demand trust score lookups (kind 30382)
- `useHasPersonalization()` - Checks if user has WoT configured

**Actions:**
- `usePublishReaction()` - Publish kind 7 reactions (optimistic updates)
- `useAddSong()` - Add song to songs list
- `useAddMusician()` - Add musician + auto-add all songs
- `useCreateList()` - Create genre playlist
- `useDeleteListItem()` - Delete with fallback to hide

**Utilities:**
- `usePlayer()` - Global audio player state (PlayerContext)
- `useHiddenItems()` - Client-side item hiding (localStorage)
- `useDuplicateCheck()` - Check for duplicates before adding
- `useAuthor()` - Fetch user profile metadata (kind 0)

### Key Components

**Layout:**
- `MainLayout` - Persistent header, navigation, audio player
- `PersonalizeButton` - WoT setup CTA (shows status)
- `AudioPlayer` - Bottom bar with playback controls
- `BoostDialog` - V4V payment interface

**Content Display:**
- `SongCard` - Display song with play, vote, artwork, voters
- `MusicianCard` - Display artist with vote, artwork, voters
- `VotersList` - Show who upvoted/downvoted (social context)
- `SearchResultCard` - Podcast Index results with Add buttons

**Pages:**
- `Discover` (/) - Hero, stats, top songs/artists
- `Browse` (/browse) - Genre playlists
- `Search` (/search) - Search Nostr catalog
- `AddMusic` (/add-music) - Search Podcast Index
- `TrendingSongs` (/trending/songs) - All trending songs (paginated)
- `TrendingArtists` (/trending/artists) - All trending artists (paginated)
- `MusicianDetail` (/musician/:slug) - Artist page with all songs
- `Curate` (/curate) - Create playlists
- `Manage` (/manage) - Manage your content
- `Settings` (/settings) - Profile, relays, about

### Data Flow

**Loading Songs Page:**
1. Fetch 1000 songs from DCOSL relay (user's + recent)
2. Fetch reactions (kind 7) for those songs
3. Extract unique reaction authors
4. Batch fetch trust scores (kind 30382) for those authors
5. Calculate scores (filter by rank > 50)
6. Sort by score descending
7. Filter out podcasts (duration/keywords)
8. Display top 25, load more on scroll

**Publishing a Vote:**
1. User clicks thumbs up/down
2. **Optimistic update** - UI updates immediately
3. Sign kind 7 reaction event
4. Publish to `wss://dcosl.brainstorm.world`
5. If success: keep optimistic update
6. If failure: rollback UI and show error

**Adding a Musician:**
1. User searches Podcast Index
2. Click "Add Artist"
3. Check local list (instant feedback)
4. Check relay for duplicates (500ms query)
5. If duplicate: show toast "Already added"
6. If unique:
   - Create kind 9999 musician event
   - Fetch all episodes from Podcast Index API
   - Create kind 9999 song events for each episode
   - Publish all in batches of 1000
   - Show toast: "Artist + X songs added"

---

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx          # App shell with nav + player
│   ├── player/
│   │   ├── AudioPlayer.tsx         # Bottom bar player
│   │   └── BoostDialog.tsx         # V4V payment modal
│   ├── songs/
│   │   ├── SongCard.tsx            # Song display with reactions
│   │   └── VotersList.tsx          # Social context (who voted)
│   ├── musicians/
│   │   └── MusicianCard.tsx        # Artist display
│   ├── search/
│   │   └── SearchResultCard.tsx    # Podcast Index results
│   ├── auth/
│   │   └── LoginArea.tsx           # Nostr login component
│   ├── ui/                         # shadcn/ui components (48+)
│   └── PersonalizeButton.tsx       # WoT setup CTA
├── hooks/
│   ├── useDecentralizedList.ts     # Core list fetching + scoring
│   ├── useTrustScore.ts            # On-demand trust score lookups
│   ├── useTrustedAssertions.ts     # NIP-85 trust provider logic
│   ├── useReaction.ts              # Publish reactions (optimistic)
│   ├── useCurator.ts               # Add songs/musicians/playlists
│   ├── useTrending.ts              # Trending songs/artists hooks
│   ├── usePodcastIndex.ts          # Podcast Index API queries
│   ├── useDuplicateCheck.ts        # Prevent duplicate additions
│   ├── usePlayer.ts                # Audio player hook (via context)
│   └── use*.ts                     # Many others (see codebase)
├── contexts/
│   ├── PlayerContext.tsx           # Global audio player state
│   ├── AppContext.tsx              # Theme + relay config
│   └── NWCContext.tsx              # Nostr Wallet Connect
├── pages/
│   ├── Discover.tsx                # Home page
│   ├── Search.tsx                  # Search Nostr catalog
│   ├── AddMusic.tsx                # Search Podcast Index (curators)
│   ├── Browse.tsx                  # Genre playlists
│   ├── TrendingSongs.tsx           # All trending songs
│   ├── TrendingArtists.tsx         # All trending artists
│   ├── MusicianDetail.tsx          # Artist page with songs
│   ├── Curate.tsx                  # Create playlists
│   ├── Manage.tsx                  # Manage your content
│   └── Settings.tsx                # User settings
├── lib/
│   ├── constants.ts                # App constants (relays, tags, kinds)
│   ├── types.ts                    # TypeScript interfaces
│   ├── filters.ts                  # Podcast filtering heuristics
│   ├── musicianUtils.ts            # Artist grouping/aggregation
│   └── utils.ts                    # Utility functions (cn, etc.)
├── scripts/
│   ├── import-podcast-index.js     # Bulk import musicians from DB
│   ├── import-songs-background.js  # Background song importer
│   └── README.md                   # Script documentation
└── NIP.md                          # Custom Nostr event schemas

```

---

## 🎨 User Experience

### For Listeners

**Discovery Flow:**
1. **Discover Page (/)** - See trending songs/artists curated by your network
2. **Search (/search)** - Find specific artists or songs in the catalog
3. **Click Play** - Music starts playing immediately in bottom bar player
4. **Upvote/Downvote** - Vote on songs (instant feedback with optimistic updates)
5. **See Who Voted** - Click avatars to see which trusted users liked the song

**Personalization:**
- Click **"Personalize"** button → Set up Web-of-Trust at https://brainstorm.nosfabrica.com
- Publishes kind 10040 (trust provider config) and calculates kind 30382 scores
- After setup: Only see votes from trusted users (rank > 50)
- Without setup: See only your own votes (everyone else has rank 0)

### For Curators

**Curation Flow:**
1. **Add Music (/add-music)** - Search Podcast Index for new content
2. **Add Artist** - Automatically imports musician + all their songs
3. **Add Individual Songs** - From artist's track list in search results
4. **Create Playlists (/curate)** - Organize music by genre/mood
5. **Manage (/manage)** - View and hide your added content

**Duplicate Prevention:**
- Instant feedback if item already in your session
- Relay check before publishing (prevents true duplicates)
- Toast notifications: "Already added" or "Already added by someone else"

---

## 🔑 Nostr Event Schemas

### Master Lists (Kind 39998)

**Songs Master List:**
```
a-tag: 39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38
```

**Musicians Master List:**
```
a-tag: 39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:8623051e-1736-437d-92b1-9049b86def30
```

### Song List Item (Kind 9999)

```json
{
  "kind": 9999,
  "content": "",
  "tags": [
    ["z", "<songs-list-a-tag>"],
    ["t", "<episode-guid>"],
    ["title", "Song Title"],
    ["artist", "Artist Name"],
    ["url", "https://example.com/audio.mp3"],
    ["duration", "240"],
    ["feedId", "12345"],
    ["feedGuid", "feed-guid-abc"],
    ["artwork", "https://example.com/cover.jpg"],
    ["alt", "Song: Title by Artist"]
  ]
}
```

**Key Tags:**
- `z` - Parent list identifier
- `t` - Episode GUID (unique identifier for deduplication)
- `url` - Direct audio file URL (enclosure)
- `feedId` - Numeric Podcast Index feed ID (for API calls)
- `feedGuid` - Podcast GUID (for matching)

### Musician List Item (Kind 9999)

```json
{
  "kind": 9999,
  "content": "",
  "tags": [
    ["z", "<musicians-list-a-tag>"],
    ["t", "<feed-guid>"],
    ["name", "Artist Name"],
    ["feedUrl", "https://example.com/feed.xml"],
    ["feedId", "12345"],
    ["feedGuid", "feed-guid-abc"],
    ["artwork", "https://example.com/artist.jpg"],
    ["alt", "Musician: Artist Name"]
  ]
}
```

### Reaction (Kind 7)

```json
{
  "kind": 7,
  "content": "+",
  "tags": [
    ["e", "<event-id>"],
    ["p", "<author-pubkey>"],
    ["k", "9999"]
  ]
}
```

**Note:** Only 2 elements in `e` tag (relay requires exact format)

### Trusted Assertions (Kind 30382)

```json
{
  "kind": 30382,
  "tags": [
    ["d", "<subject-pubkey>"],
    ["rank", "85"]
  ]
}
```

**Query pattern:**
```json
{
  "kinds": [30382],
  "authors": ["<service-provider-pubkey>"],
  "#d": ["<subject-pubkey>"]
}
```

### Trusted Provider Config (Kind 10040)

```json
{
  "kind": 10040,
  "tags": [
    ["30382:rank", "<provider-pubkey>", "<relay-url>"]
  ]
}
```

---

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js 18+
- Nostr browser extension (Alby, nos2x) or NIP-46 bunker

### Installation

```bash
git clone https://github.com/aburra16/trustwave2.git
cd trustwave2
npm install
npm run dev
```

Open http://localhost:5173

### Environment Setup

**Relays Used:**
- `wss://dcosl.brainstorm.world` - Decentralized lists + reactions
- `wss://nip85.brainstorm.world` - NIP-85 trusted assertions
- `wss://relay.damus.io` - General Nostr data
- `wss://relay.primal.net` - General Nostr data

**Supported Endpoints:**
- `/search?q=<query>&medium=music` - Search for music feeds
- `/episodes/byfeedid?id=<feedId>&max=<limit>` - Get episodes for a feed

### Building for Production

```bash
npm run build
```

Output in `dist/` directory.

### Running Tests

```bash
npm run test
```

Includes TypeScript compilation, ESLint, Vitest, and build validation.

---

## 📊 Data & Performance

### Query Limits

**Current Limits:**
- Songs: 1000 items (user's songs + top 900)
- Musicians: 1000 items (user's musicians + top 900)
- Reactions: Fetched for all loaded items
- Trust Scores: On-demand (only for reaction authors)

**Why Limited:**
- Fetching 248k+ items with reactions would freeze the browser
- Fetching 100k trust assertions takes minutes
- 1000 items is enough for discovery (top-scored content)

**Optimization:**
- User's own content always included (regardless of score)
- Trust scores cached in memory for session
- Optimistic updates (no waiting for relay confirmation)
- Client-side filtering (podcasts removed locally)

### Relay Configuration

**DCOSL Relay Settings:**
- `maxFilterLimit = 10000` - Returns up to 10k events per query
- Supports kind 5 delete events
- Stores: 9998, 39998, 9999, 39999, 7

---

## 🛠️ Bulk Import Scripts

### Musicians Import (One-Time)

**Script:** `scripts/import-podcast-index.js`

**What it does:**
- Reads Podcast Index SQLite database dump
- Filters for music feeds (by category tags)
- Publishes kind 9999 musician events
- ~248k musicians imported

**Usage:**
```bash
cd scripts
npm install
node import-podcast-index.js
```

**Time:** ~8-10 minutes

### Songs Import (Background)

**Script:** `scripts/import-songs-background.js`

**What it does:**
- Fetches all musicians from relay
- For each musician: calls Podcast Index API for episodes
- Publishes kind 9999 song events
- Rate limited: 1 API call per second
- Resumable with checkpoint file

**Usage:**
```bash
# Test (10 artists)
node import-songs-background.js --test

# Full run
node import-songs-background.js

# Resume after stopping
node import-songs-background.js --resume
```

**Time:** ~3-6 days for 248k artists

**Checkpoint:**
- Saved in `songs-import-checkpoint.json`
- Tracks processed musicians
- Resume from where it stopped

---

## 🎨 Theme & Styling

**Color Palette:**
- **Purple** (`--tw-purple`): Primary brand color (262° 83% 58%)
- **Cyan** (`--tw-cyan`): Accent color (173° 80% 40%)
- **Orange** (`--tw-orange`): V4V/Boost actions (25° 95% 53%)
- **Pink** (`--tw-pink`): Secondary accent (330° 81% 60%)
- **Success** (`--tw-success`): Positive actions (142° 76% 36%)

**Dark Mode:**
- Default theme (forced dark in `index.css`)
- Background: `240° 10% 4%`
- Foreground: `0° 0% 95%`

**Animations:**
- Pulse glow on logo
- Slide-in-up for mobile player
- Fade-in for content
- Smooth transitions throughout

**Font:**
- Inter Variable (primary sans-serif)
- Imported from `@fontsource-variable/inter`

---

## 🐛 Known Issues & Workarounds

### Issue: Only 1000 Songs/Musicians Visible

**Cause:** Performance - fetching 248k+ items with reactions freezes browser

**Workaround:** 
- User's own content always visible
- Top 1000 by score shown
- Use Search to find specific artists

**Future Fix:** Server-side pagination or relay-side sorting

### Issue: Some Podcasts Slip Through

**Cause:** Miscategorization in Podcast Index

**Mitigation:**
- Client-side filter (duration >20min, keywords)
- Community downvoting removes them over time
- ~90% accuracy with current heuristics

**Future Fix:** Report/flag feature for crowdsourced cleanup

### Issue: Trust Scores from Insecure Relay

**Cause:** Some kind 10040 events reference `ws://` (not `wss://`) relays

**Workaround:**
- Filter out insecure relays when parsing kind 10040
- Fallback to working relay on failure
- Always includes user's own rank (hardcoded 100)

### Issue: Musicians Without Songs

**Cause:** Background import still running, or artist has no episodes in Podcast Index

**Workaround:**
- Musician pages show empty state with message
- Songs appear once import catches up
- Can manually trigger by re-adding artist from Search

---

## 🔐 Security Considerations

### Nostr Security Model

**Permissionless Protocol:**
- Anyone can publish any event
- Trust is established through social graph, not gatekeeping

**Author Filtering:**
- Only count reactions from verified authors (rank > 50)
- User's own votes always count (self-trust = 100)
- No centralized moderation

**Event Validation:**
- Filter out events missing required tags
- Validate episode GUIDs for songs
- Validate feed GUIDs for musicians

### Data Privacy

**Local Storage:**
- Hidden items stored in browser localStorage only
- Trust provider config (kind 10040) can be published publicly or encrypted
- No central database of user preferences

**Relay Privacy:**
- All data public on Nostr relays
- Users control which relays they use (NIP-65)
- Can run own relay for privacy

---

## 🔮 Future Enhancements

### High Priority

1. **Relay-Side Sorting**
   - Fetch pre-sorted events from relay
   - Show all 248k items without performance hit
   - Requires relay support for custom sorting

2. **Advanced Search**
   - Filter by genre, mood, duration
   - Search within playlists
   - Artist/album faceting

3. **Playlist Features**
   - Collaborative playlists (multi-curator)
   - Playlist following/discovery
   - Export to other platforms

4. **Streaming V4V**
   - Auto-boost during playback (streaming sats)
   - Per-minute payment splits
   - Artist earnings dashboard

### Medium Priority

5. **Social Features**
   - Activity feed ("Alice added 5 tracks")
   - Comments on songs (NIP-22)
   - Share via DM (NIP-04/NIP-17)
   - Tag friends in votes

6. **Curator Tools**
   - Batch operations (add multiple songs at once)
   - Import from Spotify playlists
   - Curator profiles with stats
   - Discovery challenges/quests

7. **Mobile App**
   - React Native version
   - Background playback
   - Offline support
   - Push notifications for new content

### Low Priority

8. **Analytics**
   - Play count tracking
   - Most-boosted artists
   - Network effects visualization
   - Trust graph explorer

9. **Advanced WoT**
   - Multiple trust networks (music, tech, bitcoin)
   - Time-decay on votes (recent votes weighted higher)
   - Context-aware trust (different curators for different genres)

---

## 🤝 Contributing

### Code Style

- TypeScript strict mode
- Never use `any` type (use proper types)
- Use Path Aliases (`@/` prefix)
- Follow shadcn/ui component patterns
- Prettier formatting (auto-format on save)

### Git Workflow

1. Create feature branch
2. Make changes with descriptive commits
3. Run tests: `npm run test`
4. Build: `npm run build`
5. Submit PR with description

### Adding New Features

**Example: Adding a "Recently Played" page**

1. **Create the hook** (`src/hooks/useRecentlyPlayed.ts`):
```typescript
export function useRecentlyPlayed() {
  const [history, setHistory] = useLocalStorage('recentlyPlayed', []);
  // ... implementation
}
```

2. **Create the page** (`src/pages/RecentlyPlayed.tsx`):
```typescript
export default function RecentlyPlayed() {
  const { history } = useRecentlyPlayed();
  // ... render songs
}
```

3. **Add route** (`src/AppRouter.tsx`):
```typescript
<Route path="/recently-played" element={<RecentlyPlayed />} />
```

4. **Add to navigation** (`src/components/layout/MainLayout.tsx`):
```typescript
{ path: '/recently-played', label: 'Recent', icon: Clock }
```

5. **Test and commit**

---

## 📖 API Reference

### Podcast Index API (via Proxy)

**Endpoints:**

**Search Music:**
```
GET /search?q=<query>&medium=music&max=<limit>
Response: { feeds: [{ id, podcastGuid, title, author, artwork, ... }] }
```

**Get Episodes:**
```
GET /episodes/byfeedid?id=<feedId>&max=<limit>
Response: { items: [{ guid, title, enclosureUrl, duration, ... }] }
```

### DCOSL Relay

**URL:** `wss://dcosl.brainstorm.world`

**Stored Event Kinds:**
- 9998, 39998 - List headers
- 9999, 39999 - List items
- 7 - Reactions
- 5 - Delete events

**Rate Limits:**
- Max filter limit: 10,000 events per query
- Batch publish: 1,000 events per batch recommended

### NIP-85 Relay

**URL:** `wss://nip85.brainstorm.world`

**Stored Event Kinds:**
- 10040 - Trust provider configuration
- 30382 - Trusted assertions (pubkey scores)

**Query Pattern:**
```javascript
{
  kinds: [30382],
  authors: ["<service-provider-pubkey>"],
  "#d": ["<subject-pubkey-1>", "<subject-pubkey-2>", ...]
}
```

Returns trust scores for specified pubkeys.

---

## 🧪 Testing

### Manual Testing Checklist

**Discovery:**
- [ ] Discover page loads and shows stats
- [ ] Trending songs show highest-scored content
- [ ] Trending artists show correctly
- [ ] "View All" links work

**Search:**
- [ ] Search finds songs by title
- [ ] Search finds artists by name
- [ ] Clicking results navigates correctly
- [ ] Inferred artists work (even if not in top 1000)

**Player:**
- [ ] Song plays on first click
- [ ] Seek bar works (click/drag)
- [ ] Volume controls work
- [ ] Next/previous track navigation
- [ ] Player persists across page navigation

**Voting:**
- [ ] Upvote increments instantly (optimistic)
- [ ] Downvote increments instantly
- [ ] Can't vote twice (same button does nothing)
- [ ] Can change vote (+ to - or vice versa)
- [ ] Voter avatars show
- [ ] Click avatars shows full voter list

**Curation:**
- [ ] Add Music search works
- [ ] Can add new musician
- [ ] Musician's songs auto-add
- [ ] Duplicate detection works
- [ ] Can create playlist

**Web-of-Trust:**
- [ ] Without kind 10040: only user's votes show
- [ ] "Personalize" button appears
- [ ] With kind 10040: trust filtering works
- [ ] "Personalized" badge shows

---

## 📞 Support & Contact

**Repository:** https://github.com/aburra16/trustwave2
**Deployed:** https://trustwave.shakespeare.wtf
**Builder:** Built with [Shakespeare](https://shakespeare.diy)

**Nostr Contacts:**
- Genesis Curator: `npub1hqaz3dlyuhfqhktqchawke39l95jj9nt30dsgh2zvd9z7dv3j3gqpkt56s`
- DCOSL Relay Admin: `npub1u5jwk69f4qwark58y50tkeew3yrpvashvwzam0qxj7ngfer0jq8svgtwh4`

**Related Projects:**
- [Podcast Index](https://podcastindex.org) - Open podcast/music directory
- [NIP-85](https://nostrhub.io) - Trusted Assertions specification
- [Decentralized Lists NIP](https://nostrhub.io) - List protocol used

---

## 📄 License

This project is built on open protocols and open source libraries. See individual dependencies for their licenses.

**Music Content:**
- All music is hosted and owned by the respective artists
- TrustWave only indexes trust signals, not content
- V4V payments go directly to artists (100% minus network fees)

---

## 🙏 Acknowledgments

- **Podcast Index** - For the open music/podcast directory and API
- **Nostr Community** - For the decentralized social protocol
- **Shakespeare** - For the AI-powered development environment
- **Curators** - For building taste graphs and discovering great music
- **Artists** - For creating V4V-enabled independent music

---

