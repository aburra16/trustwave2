import type { NostrEvent } from '@nostrify/nostrify';

// Podcast Index API response types
export interface PodcastIndexFeed {
  id: number;
  podcastGuid: string;
  title: string;
  url: string;
  originalUrl: string;
  link: string;
  description: string;
  author: string;
  ownerName: string;
  image: string;
  artwork: string;
  lastUpdateTime: number;
  itunesId: number | null;
  language: string;
  categories: Record<string, string>;
  value?: PodcastValue;
}

export interface PodcastIndexEpisode {
  id: number;
  title: string;
  link: string;
  description: string;
  guid: string;
  datePublished: number;
  datePublishedPretty: string;
  dateCrawled: number;
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  duration: number;
  explicit: number;
  episode: number | null;
  season: number | null;
  image: string;
  feedImage: string;
  feedId: number;
  feedTitle: string;
  feedLanguage: string;
  chaptersUrl: string | null;
  transcriptUrl: string | null;
  soundbite: unknown;
  soundbites: unknown[];
  value?: PodcastValue;
  podcastGuid?: string;
}

export interface PodcastValue {
  model: {
    type: string;
    method: string;
    suggested: string;
  };
  destinations: PodcastValueDestination[];
}

export interface PodcastValueDestination {
  name: string;
  address: string;
  type: string;
  split: number;
  customKey?: string;
  customValue?: string;
  fee?: boolean;
}

export interface PodcastIndexSearchResponse {
  status: string;
  feeds: PodcastIndexFeed[];
  count: number;
  query: string;
  description: string;
}

export interface PodcastIndexEpisodesResponse {
  status: string;
  items: PodcastIndexEpisode[];
  count: number;
  query: string;
  description: string;
}

// Decentralized List types
export interface ListHeader {
  id: string;
  pubkey: string;
  names: [string, string]; // singular, plural
  description?: string;
  required?: string[];
  allowed?: string[];
  createdAt: number;
  event: NostrEvent;
}

export interface ListItem {
  id: string;
  pubkey: string;
  listATag: string;
  name?: string;
  title?: string;
  description?: string;
  createdAt: number;
  event: NostrEvent;
  // Song-specific fields
  songGuid?: string;
  songTitle?: string;
  songArtist?: string;
  songUrl?: string;
  songArtwork?: string;
  songDuration?: number;
  feedId?: string;
  feedGuid?: string;
  // Musician-specific fields
  musicianName?: string;
  musicianFeedGuid?: string;
  musicianFeedUrl?: string;
  musicianArtwork?: string;
}

export interface ScoredListItem extends ListItem {
  score: number;
  upvotes: number;
  downvotes: number;
  userReaction?: '+' | '-' | null;
  upvoterEvents?: NostrEvent[]; // Reaction events from upvoters
  downvoterEvents?: NostrEvent[]; // Reaction events from downvoters
}

// Trust assertion types (NIP-85)
export interface TrustedAssertion {
  pubkey: string; // Subject pubkey
  rank: number;
  followers?: number;
  firstCreatedAt?: number;
  postCount?: number;
  replyCount?: number;
  reactionsCount?: number;
  zapAmountReceived?: number;
  zapAmountSent?: number;
  event: NostrEvent;
}

export interface TrustProvider {
  pubkey: string;
  relay: string;
  service: string; // e.g., "30382:rank"
}

// Player state
export interface PlayerState {
  currentTrack: ScoredListItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: ScoredListItem[];
  queueIndex: number;
}

// Curator action types
export interface AddSongToListParams {
  feedId: string;
  episode: PodcastIndexEpisode;
  listATag: string;
  annotation?: string;
}

export interface CreateListParams {
  nameSingular: string;
  namePlural: string;
  description?: string;
  genre?: string;
  parentListATag?: string; // For sublists
}
