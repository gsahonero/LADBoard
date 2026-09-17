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
2. **`core/identity`**: Google Identity Services (GIS) token client, LAD User ID generation, `user.json` multi-device registry manager. Supports `skipDefaultSpace` when joining via invite links to avoid phantom spaces.
3. **`core/storage`**: `IStorageProvider` abstraction contract with `IndexedDBProvider`, `GDriveProvider`, and `MemoryProvider`. Implements `deleteDirectory()` for space removal and `clearAll()` / `deleteRootFolder()` for complete data erasure.
4. **`core/graph`**: Node & Edge store, force-directed data bindings, hierarchical policy resolution algorithm.
5. **`core/objects`**: Document store, dynamic schema metadata, and natural language capture parser.
6. **`core/operations`**: Operation generator, debounced commit threshold (`change_commit_threshold_ms`) timer, and deterministic JSON-patch applicator. Automatically triggers `SyncCoordinator.triggerSync()` upon operation commit.
7. **`core/sync`**: Bidirectional delta op synchronization between local and Google Drive storage:
   - **Push**: Uploads delta operations, writes updated `objects/${target}.json`, and syncs `graph/nodes.json` and `edges.json` to Google Drive.
   - **Pull**: Fetches remote operations, downloads remote object JSON files to local storage, and syncs remote graph changes.
   - **Fallback**: Defaults to Google Drive when signed in, automatically preserving changes in `offlineQueue` on network or permission errors. Never operates in mute: when automatic cloud sync fails, the user is prominently notified via an alert banner, attention cockpit alert, and pulsing badge.
8. **`core/active`**: Active monitoring engine, rule triggers, notification dispatcher.
9. **`core/i18n`**: Bilingual localization system (EN/ES) with zero untranslated UI strings.
10. **`ui`**: Responsive, accessible, neurodiversity-conscious UI components:
    - **Sync Fallback Notification Banner**: Prominent, dismissible banner alerting the user when Google Drive sync fails and offline fallback is active, with instant "Retry Sync" action and reassuring confirmation of local IndexedDB safety.
    - **Sync Status Pane**: Moving the cursor over the sync badge reveals a floating real-time status pane detailing Google Drive connection status, authenticated account email, and local IndexedDB offline storage status with pending operations count and direct "Sync Now" trigger.
    - **Lifecycle & Danger Zones**: Comprehensive workflows for Space Deletion, Space Leaving, and Complete Account & Cloud Data Erasure.


## Space & Account Lifecycle Management

- **Delete Space**:
  - **Owner**: Permanently deletes the space folder `LAD/${spaceId}` from both Google Drive and local IndexedDB, removing the space from `user.json`.
  - **Collaborator (Editor/Viewer)**: Leaves the space by removing it from their local `user.json` and cleaning up local cache, leaving the owner's Google Drive files untouched.
- **Delete Account & Complete Data Erasure**:
  - Destructive action available in Global Settings. Permanently removes the `LAD` root folder from Google Drive, purges all local IndexedDB databases, cleans `localStorage` (`lad_*`), and signs out.
