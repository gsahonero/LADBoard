# The LAD Standard — Specification (Version 1.0)

## 1. Introduction

The **Living Active Dynamic (LAD) Standard** defines an open, vendor-neutral specification for collaborative knowledge, shared memory, and active information systems.

LAD is not a traditional relational schema or a static document store. It is a state machine and declarative graph model designed for:
- Continuous capture of structured and unstructured information.
- Transparent provenance, versioning, and non-destructive conflict recovery.
- Multi-space compartmentalization with deterministic access policies.
- Active background evaluation (monitoring, notifying, following up).
- Agent & integration interoperability.

---

## 2. Core Entities and Data Models

### 2.1 Identity Hierarchy
The standard distinguishes three orthogonal identity layers:
1. **External Authentication Identity**: The identity provider account (e.g. Google email/subject `sub`, OpenID, Passkey).
2. **LAD User Identity (`user_id`)**: A globally unique, stable identifier within LAD (e.g., `usr_c7f8a9b2`).
3. **Storage Identifier**: The provider-specific reference (e.g. Google Drive `folder_id`, S3 bucket ARN, Local filesystem path).

A storage folder name is human-readable metadata and MUST NOT be used as a primary key.

### 2.2 User Registry (`user.json`)
The user-level registry represents an individual's personal index of known Spaces and configuration across devices.

```json
{
  "lad_standard": "1.0",
  "schema_version": "1.0.0",
  "user_id": "usr_7a8b9c",
  "identities": [
    {
      "provider": "google",
      "email": "user@example.com",
      "subject_id": "google_sub_12345"
    }
  ],
  "spaces": [
    {
      "space_id": "spc_family_001",
      "space_name": "Family",
      "storage_provider": "google_drive",
      "storage_reference": "1A2B3C4D5E_folder_id",
      "role": "owner",
      "status": "active",
      "last_synced_at": "2026-09-16T18:00:00Z"
    }
  ],
  "preferences": {
    "locale": "en",
    "theme": "system",
    "change_commit_threshold_ms": 5000,
    "active_evaluation_interval_ms": 60000
  },
  "device_metadata": {
    "device_id": "dev_laptop_01",
    "platform": "web"
  },
  "version": 1,
  "updated_at": "2026-09-16T18:00:00Z"
}
```

### 2.3 Space Folder Structure & `manifest.json`
Every Space is stored in an independent container:

```text
<Space Container>/
├── manifest.json
├── graph/
│   ├── nodes.json
│   └── edges.json
├── objects/
│   └── <object_id>.json
├── operations/
│   └── <op_batch_id>.json
├── attachments/
├── configuration/
│   └── settings.json
└── telemetry/
    └── audit.jsonl
```

#### `manifest.json` Schema:
```json
{
  "lad_standard": "1.0",
  "schema_version": "1.0.0",
  "space_id": "spc_f7a9d2",
  "space_name": "Family Hub",
  "description": "Family coordination and records",
  "created_by": "usr_7a8b9c",
  "created_at": "2026-09-16T12:00:00Z",
  "updated_at": "2026-09-16T18:00:00Z",
  "schema_extensions": []
}
```

---

## 3. The Graph & Behavioral Policies

### 3.1 Graph Nodes
Nodes represent first-class entities:
- `user`: Human participants.
- `object`: Knowledge entities (notes, bills, medical appointments, tasks).
- `agent`: Automated bots or external integration services.
- `domain`: Conceptual categorization roots (e.g. `health`, `finance`).

```json
{
  "node_id": "node_usr_7a8b9c",
  "type": "user",
  "label": "Alice Smith",
  "ref_id": "usr_7a8b9c",
  "metadata": {
    "email": "alice@example.com"
  }
}
```

### 3.2 Graph Edges & Deterministic Policy Resolution
Directed edges define relationships (`member_of`, `assigned_to`, `relates_to`, `monitors`) and attach behavioral policy trees.

Connectivity alone DOES NOT imply event propagation. Propagation occurs strictly if evaluated policies resolve to `allow: true`.

#### Policy Structure Example:
```json
{
  "edge_id": "edge_01",
  "source": "node_usr_alice",
  "target": "node_usr_bob",
  "type": "collaborator",
  "policies": {
    "notification": {
      "modification": {
        "default": true,
        "finances": {
          "default": true,
          "bank_accounts": false
        },
        "health": false
      }
    }
  }
}
```

#### Deterministic Policy Resolution Algorithm:
1. Given an event of type `$action` (e.g., `modification`) on an object with domain path `$domain_path` (e.g., `finances.bank_accounts`):
2. Traverse the policy dictionary along the path `policies.notification.$action.$domain_path`.
3. If an explicit boolean match is found at the leaf, return that value.
4. If not found, traverse up the domain hierarchy to parent keys (e.g. `finances.default`, then `$action.default`).
5. If still unresolved, default to `false` (fail-safe closed).

---

## 4. Versioning, Operations & Change Aggregation

### 4.1 Change Aggregation Threshold (Default: 5 Seconds)
To prevent keystroke pollution in the permanent log, implementations MUST provide a configurable change aggregation window (default: 5000ms).
- Edges and object mutations remain in **transient editing state** during active editing.
- Once quiet for the threshold duration (or on explicit save / navigation blur), mutations are committed as a single immutable `LADOperation`.

### 4.2 Operation Schema (`LADOperation`)
```json
{
  "operation_id": "op_9f8e7d6c",
  "space_id": "spc_f7a9d2",
  "actor": "usr_7a8b9c",
  "timestamp": "2026-09-16T18:30:00.000Z",
  "lamport_clock": 42,
  "type": "object.update",
  "target": "obj_bank_01",
  "patch": {
    "balance": 1250000,
    "last_checked": "2026-09-16"
  },
  "prev_state_hash": "a1b2c3d4"
}
```

### 4.3 Conflict Resolution & Non-Destructive Recovery
- Concurrent operations are ordered deterministically using `(lamport_clock, timestamp, actor_id, operation_id)`.
- Field-level 3-way merges are applied where orthogonal keys are modified.
- In conflicting concurrent updates to the same scalar property, the operation with the highest causal order is applied to the active projection, but the conflicting operation is marked as `divergent` in history and surfaced to the user for explicit review without data loss.

---

## 5. Active Layer & Trigger Semantics

The Active Layer is a declarative evaluation engine.

Triggers are evaluated periodically or upon local/remote state updates:
- **Temporal Triggers**: Evaluated against current clock time (e.g., follow-up date approaching within 48h).
- **Staleness Triggers**: Evaluated against object `updated_at` / `last_checked` (e.g., bank balance untouched > 7 days).
- **State Triggers**: Condition predicates (e.g., `status == "unresolved"` for shopping items older than 3 days).
- **Agent Triggers**: Proposed actions by bots requiring human authorization (`approval_required`).

---

## 6. Agents and Integrations

Agents participate as graph nodes with defined autonomy levels:
1. `autonomous`: Permitted to execute operations directly on assigned objects.
2. `approval_required`: Generates a pending proposal in the Active Layer queue. The operation is not applied until a space member with editor/owner role approves it.
