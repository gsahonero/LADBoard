# Google Drive Integration & Setup Guide

LAD Board uses **Google Drive REST API v3** with the **Google Identity Services (GIS)** OAuth2 token client for cloud persistence and multi-device synchronization.

## 1. Zero Configuration / Offline Mode
By default, LAD Board runs out-of-the-box in **Offline-First Local Mode** using IndexedDB. No Google credentials or API keys are required to use, test, or evaluate all LAD Board capabilities.

---

## 2. Setting Up Cloud Sync with Google Drive (Optional)

If you wish to sync your Spaces across devices using your own Google Drive:

1. **Go to the Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Create a Project**: e.g. `LAD Board Personal`.
3. **Enable the Google Drive API**:
   - Navigate to *APIs & Services > Library*.
   - Search for `Google Drive API` and click **Enable**.
4. **Configure OAuth Consent Screen**:
   - Choose **External** (or Internal for Google Workspace).
   - Fill in App Name (`LAD Board`) and User Support Email.
   - Add Scope: `https://www.googleapis.com/auth/drive` (allows multi-user space sharing and sync) or `https://www.googleapis.com/auth/drive.file`.
   - Add your Google account under **Test Users**.
5. **Create OAuth Client ID**:
   - Navigate to *APIs & Services > Credentials > Create Credentials > OAuth client ID*.
   - Application type: **Web application**.
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local development)
     - `https://gsahonero.github.io` (for production GitHub Pages)
6. **Connect in LAD Board**:
   - Open LAD Board Settings (*⚙ Settings* in the navigation bar).
   - Enter your `OAuth2 Client ID` in the **Google Account** section.
   - Click **Sign in with Google** to authorize.

---

## 3. Synchronization & Offline Fallback

- **Default Remote Sync**: Once authenticated with Google, all active spaces default to Google Drive cloud sync.
- **Commit Threshold Auto-Sync**: When you edit an item, the change aggregator commits after your configured pause (default: 5 seconds), automatically triggering background synchronization to push updated JSON files (`objects/*.json`, `graph/nodes.json`, `graph/edges.json`) and delta operations.
- **Resilient Fallback**: If Google Drive encounters network interruptions or token timeouts, LAD Board seamlessly falls back to local IndexedDB persistence, queuing all operations in the `offlineQueue` without data loss.

---

## 4. Deletion & Data Erasure Lifecycle

- **Delete Space**:
  - If you are the space owner, deleting a space removes `LAD/${spaceId}` from Google Drive and purges local device storage.
  - If you are a collaborator, leaving a space cleans your local cache while preserving the owner's files in Google Drive.
- **Delete Account & Complete Data Erasure**:
  - Found under *Settings > Danger Zone*, this option permanently deletes the root `LAD` directory in your Google Drive, wipes all local IndexedDB stores, and signs out.
