# LAD Board — Technical Architecture (v0.1.0)

## System Overview

LAD Board is implemented as a client-side, offline-first Progressive Web Application running in the browser and communicating with pluggable storage backends (Google Drive REST API v3, Local IndexedDB, In-Memory Storage).

```text
┌─────────────────────────────────────────────────────────────┐
│                       React 18 / 19 UI                      │
│   Attention · Domains · Timeline · Graph · People · History │
├─────────────────────────────────────────────────────────────┤
│                    Capture & NLP Parser                     │
│               Free Text · Guided Cards · Forms              │
├───────────────────────┬─────────────────────────────────────┤
│     Active Engine     │         Graph & Policy Engine       │
│  Staleness · Triggers │       Deterministic Resolution      │
├───────────────────────┴─────────────────────────────────────┤
│               Change Aggregator (5s Debounce)               │
│                  Transient → Durable Ops                    │
├─────────────────────────────────────────────────────────────┤
│               Operation Log & Causal History                │
├─────────────────────────────────────────────────────────────┤
│                     Sync Coordinator                        │
│               Offline Queue · Conflict Merge                │
├─────────────────────────────────────────────────────────────┤
│                 Storage Provider Abstraction                │
│    IndexedDB Local Cache   │   Google Drive REST v3 (GIS)   │
└────────────────────────────┴────────────────────────────────┘
```

## Modular Layer Breakdown

1. **`core/standard`**: Types, interfaces, invariants for LAD Standard 1.0.
2. **`core/identity`**: Google Identity Services (GIS) token client, LAD User ID generation, `user.json` multi-device registry manager.
3. **`core/storage`**: `IStorageProvider` abstraction contract with `IndexedDBProvider`, `GDriveProvider`, and `MemoryProvider`.
4. **`core/graph`**: Node & Edge store, force-directed data bindings, hierarchical policy resolution algorithm.
5. **`core/objects`**: Document store, dynamic schema metadata, and natural language capture parser.
6. **`core/operations`**: Operation generator, 5-second aggregation timer, deterministic JSON-patch applicator.
7. **`core/sync`**: Online/offline state listener, push/pull delta sync, non-destructive vector conflict resolver.
8. **`core/active`**: Active monitoring engine, rule triggers, notification dispatcher.
9. **`core/i18n`**: Bilingual localization system (EN/ES) with zero untranslated UI strings.
10. **`ui`**: Responsive, accessible, neurodiversity-conscious UI components.
