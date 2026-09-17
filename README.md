# LAD Board (v0.1.0)

> **Living Active Dynamic Board** — Implementing the **LAD Standard 1.0**.

Live Deployment: [https://gsahonero.github.io/LADBoard/](https://gsahonero.github.io/LADBoard/)

---

## What is LAD Board?

LAD Board is a shared memory, knowledge organization, and active coordination system. It transforms passive note-taking into an **active information loop**:

$$\text{Capture} \longrightarrow \text{Understand} \longrightarrow \text{Organize} \longrightarrow \text{Monitor} \longrightarrow \text{Trigger} \longrightarrow \text{Interact}$$

### Key Features
- **Offline-First**: Instant local response via IndexedDB with automatic background synchronization.
- **Change Aggregation**: 5-second debounced commit threshold separating transient edits from immutable Git-like operations.
- **Declarative Graph & Deterministic Policies**: Users, objects, and agents form a connected graph with hierarchical notification policies.
- **Active Layer**: Automatic background monitoring that surfaces stale bank balances, upcoming medical appointments, unresolved shopping items, and agent proposals.
- **Bilingual (English / Español)**: 100% complete localized interface with instant language switching.
- **Cognitive Accessibility**: Low cognitive load, high visual clarity, structured card capture, and calm design.
- **Google Drive Storage Provider**: Pluggable storage architecture supporting Google Drive cloud sync and local offline storage.

---

## Documentation

- [LAD Standard 1.0 Specification](docs/STANDARD.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [Google Drive OAuth2 Setup Guide](docs/GOOGLE_DRIVE_SETUP.md)

---

## Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run automated tests
npm test

# Build for production
npm run build
```
