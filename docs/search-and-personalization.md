# Search and Personalization

## How AI is used

- The search hot path does not depend on external AI APIs.
- Core retrieval works with local normalization, typo correction, synonym expansion, and SQLite FTS5.
- A local LLM can be attached as an optional parser for ambiguous requests, but the system remains fully functional without it.
- Explanations are deterministic: the API returns real ranking factors instead of generated prose.

## Query processing flow

1. Normalize text: trim, lowercase, `ё -> е`, clean punctuation, normalize numbers and units.
2. Fix keyboard layout errors:
   `aktirf -> флешка`
3. Fix typos using local lexicon and `rapidfuzz`.
4. Expand synonyms:
   `смартбай -> smartbuy`
   `флешка -> usb`
   `таб -> таблетки`
5. Retrieve candidates from the product index with SQLite FTS5.
6. Re-rank candidates with transparent factors:
   text overlap, category, attributes, numeric constraints, purchase history, session behavior.
7. Return:
   corrected query, search terms used, query interpretation, score breakdown, explanation.

## How user preferences are built

- Long-term profile is built from uploaded contracts.
- For each customer we aggregate:
  - preferred categories
  - preferred STEs
  - weighted token profile
  - purchase count, spend, last purchase date
- Weights depend on:
  - frequency
  - recency
  - contract value

## Real-time recalculation

- Every search session writes events to SQLite:
  - `result_opened`
  - `result_bounced`
  - `result_saved`
  - `marked_relevant`
  - `marked_irrelevant`
- These events are applied immediately as session overlays on top of the long-term profile.
- The next search request uses both:
  - customer profile boosts
  - session product/category penalties or boosts

## What changes after user actions

- Positive actions increase ranking for the product and sometimes for its category.
- Negative actions decrease ranking for the product and also penalize the category in the current session.
- Because of this, the same query can return a different top result even without rebuilding the global index.

## Why this is demo-friendly

- No external dependencies are required for search.
- Full dataset can be preloaded locally.
- Incremental data upload is supported.
- The system shows not only the result, but also why it changed.
