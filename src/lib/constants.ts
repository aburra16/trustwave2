// TrustWave Constants

// The relay where decentralized lists and reactions are stored
export const DCOSL_RELAY = 'wss://dcosl.brainstorm.world';

// The relays where NIP-85 trusted assertions are stored
export const NIP85_RELAY = 'wss://nip85.brainstorm.world';
export const NIP85_FALLBACK_RELAY = 'wss://testnip85.nosfabrica.com';

// Genesis curator pubkey (fallback for trust calculations)
export const GENESIS_CURATOR_PUBKEY = 'b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450';

// Master list "a" tags (kind:pubkey:d-tag format)
export const SONGS_LIST_A_TAG = '39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:17c49d8b-c0d9-49bf-875f-6c7568f45f38';
export const MUSICIANS_LIST_A_TAG = '39998:b83a28b7e4e5d20bd960c5faeb6625f95529166b8bdb045d42634a2f35919450:8623051e-1736-437d-92b1-9049b86def30';

// Podcast Index API proxy (Cloudflare Worker)
export const PODCAST_INDEX_PROXY = 'https://trustwave-pi-proxy.malfactoryst.workers.dev';

// Trust threshold - users with rank > this are considered trusted
// Using 50 as threshold (normalized 0-100 scale)
export const TRUST_THRESHOLD = 50;

// Nostr event kinds used
export const KINDS = {
  METADATA: 0,
  REACTION: 7,
  LIST_HEADER: 9998,
  LIST_HEADER_REPLACEABLE: 39998,
  LIST_ITEM: 9999,
  LIST_ITEM_REPLACEABLE: 39999,
  TRUSTED_PROVIDERS: 10040,
  TRUSTED_ASSERTION_PUBKEY: 30382,
  TRUSTED_ASSERTION_EVENT: 30383,
  TRUSTED_ASSERTION_ADDRESS: 30384,
} as const;

// App metadata
export const APP_NAME = 'TrustWave';
export const APP_DESCRIPTION = 'Decentralized music discovery powered by Web-of-Trust';
export const APP_TAGLINE = 'Discover music through people you trust';
