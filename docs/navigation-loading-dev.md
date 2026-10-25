# My Programs / My Words navigation loading

## Behavior

The authenticated DEV shell downloads both route modules and preloads their
read-only data while the current screen is visible. The courses list is shared
with the dashboard. Language discovery, the first nine word cards, dashboard
metrics, tags and catalog queries share their validated server snapshots.

Snapshots live in memory only, keyed by application, user and complete request
query. They remain fresh for 30 seconds, revalidate in the background on a later
mount, and expire after five minutes without a subscriber. The cache evicts
inactive completed entries at 100 entries. Concurrent consumers share requests.
Cached content remains visible during revalidation, with refresh errors shown.
Cold entry still requires the authenticated server response.

Successful product mutations and profile updates invalidate these snapshots.
Session clearing removes data and discards late responses. Artwork lookups do
not invalidate learning data. Illustration preloading uses cache lookup only;
paid generation remains tied to an actual screen miss. Artwork is scoped by
owner, session and course revision, and a cached image is rendered immediately.

## Verification

`resource-cache.test.tsx` covers immediate remount, concurrent consumers, delayed
refresh/error display, query/account isolation, mutation invalidation and late
responses after logout. `program-artwork-cache.test.ts` covers read-only warmup,
coalesced generation after a miss, and session reset.

Browser timing uses the same authenticated DEV browser: wall time from navigation
click to a visible active-program heading or first real word card. It includes
automation overhead and is not a server latency benchmark. Before this change,
two alternating rounds measured Programs 2772/1231 ms and Words 2642/1735 ms.
Final deployment and post-change evidence belong in the project specification.

No API, backend, database migration or environment change is required. Rollback
is the previous DEV Web commit `9020e936cf9454da51233fbb140fbad2d2675438`.
