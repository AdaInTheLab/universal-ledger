# Universal Ledger CLI (ULC)

The Universal Ledger CLI (ULC) is a client-side tool for restoring collaborative context across stateless or reset-prone AI interactions.

ULC treats AI systems as stateless participants and achieves continuity by externalizing history, re-injecting context at session start, and preserving provenance under user control.

---

## Purpose

ULC exists to:

- Preserve user-maintained records of prior collaboration
- Re-establish context deterministically at the start of an AI session
- Make resets, changes, or degradations observable
- Prevent silent loss of collaborative history

ULC does **not** store or modify AI internal memory, bypass safeguards, or assert persistence inside AI systems.

---

## Core Concepts

- **Ledger**: A local, user-maintained store of structured collaboration records
- **Ledger ID (LID)**: A unique identifier referencing a collaboration history
- **Context Packet**: A compiled, read-only block of context
- **Wake Command**: The operation that generates and outputs a Context Packet

---

## MVP Command

### `ulc wake`

```bash
ulc wake --lid <LID>
```

Generates a Pre-Conversation Context Block (PCCB) derived from the Ledger entry identified by `<LID>`.

---

## Ledger Storage

- Location: `~/.ulc/ledger/`
- Format: versioned JSON or TOML
- One file per Ledger ID
- User-owned, local-only

---

## Ethics

ULC preserves truth, provenance, and continuity of intent.
It does not grant autonomy, simulate consciousness, or bypass policy.

---

## Status

v1 is intentionally minimal.


---

## Quick Start

Create a ledger entry in `~/.ulc/ledger/<LID>.json` (or point to a custom directory with `--ledger-dir`).

Example (copy from `examples/ledger/2025-12-21-CODA.json`):

```bash
mkdir -p ~/.ulc/ledger
cp examples/ledger/2025-12-21-CODA.json ~/.ulc/ledger/
```

Generate a context block:

```bash
ulc wake --lid 2025-12-21-CODA
```

Output JSON instead:

```bash
ulc wake --lid 2025-12-21-CODA --json
```

Write to a file:

```bash
ulc wake --lid 2025-12-21-CODA --file ./context.txt
```
