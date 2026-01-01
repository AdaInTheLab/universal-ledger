# Universal Ledger CLI (ULC)

**Universal Ledger CLI (ULC)** is a small, intentional command‑line tool
for maintaining **context continuity** across otherwise stateless
interactions.

It does **not** attempt to store or restore AI memory.\
Instead, it gives *you* a clean, user‑owned way to re‑establish shared
context at the start of any session.

Think of it as a **portable preamble generator** backed by simple,
human‑editable records.

------------------------------------------------------------------------

## What ULC Is (and Is Not)

### ✅ What it *is*

-   A **user‑owned ledger** of context records (plain JSON)
-   A way to generate a **Pre‑Conversation Context Block (PCCB)** on
    demand
-   A notes‑like system for tracking intent, constraints, and state
-   Offline‑first, deterministic, boring‑in‑a‑good‑way

### 🚫 What it is *not*

-   Persistent AI memory
-   A bypass for safeguards
-   A networked service
-   A database or cloud product

ULC assumes the model is stateless and treats all context as **explicit
input**.

------------------------------------------------------------------------

## Installation (Local / Dev)

``` bash
git clone https://github.com/AdaInTheLab/universal-ledger
cd universal-ledger
npm install
npm link
```

This installs the `ulc` command globally for your user.

------------------------------------------------------------------------

## Ledger Storage

By default, ledger entries are stored **outside your repo**:

    ~/.ulc/ledger/

Each entry is a single JSON file:

    2026-01-01-TEST.json
    2026-01-02-REAL.json
    ...

This keeps: - personal context out of source control - ledgers usable
across projects - state fully user‑owned

You can override this with `--ledger-dir` if needed.

------------------------------------------------------------------------

## Core Commands

### `ulc init`

Create a new ledger entry.

``` bash
ulc init   --lid 2026-01-01-TEST   --project "Universal Ledger CLI"   --summary "Context continuity across stateless AI sessions"
```

Optional flags: - `--goal "text"` (repeatable) - `--constraint "text"`
(repeatable) - `--force` (overwrite existing entry)

------------------------------------------------------------------------

### `ulc list`

List known ledger entries.

``` bash
ulc list
```

Outputs a readable summary of all entries in the ledger directory.

------------------------------------------------------------------------

### `ulc update`

Patch an existing ledger entry in place.

``` bash
ulc update   --lid 2026-01-01-TEST   --add-goal "Restore collaboration context deterministically"   --remove-goal "TODO"   --add-note "Refined MVP scope"
```

Notes: - Only fields you specify are changed - Unknown fields are
preserved - Notes are append‑only (with dedupe protection) - Updates
bump `last_state.as_of` and `modified_at`

------------------------------------------------------------------------

### `ulc wake`

Emit a **Pre‑Conversation Context Block (PCCB)**.

``` bash
ulc wake --lid 2026-01-01-TEST
```

This prints a structured context block suitable for pasting directly
into a new session.

#### Soft validation

-   Missing required fields → error
-   Incomplete or placeholder content → warnings
-   Output is never blocked unless correctness is compromised

------------------------------------------------------------------------

## Example Output

    [CONTEXT_BLOCK_START]
    Source: Universal Ledger CLI v0.1.0
    Ledger ID: 2026-01-01-TEST
    Project: Universal Ledger CLI

    Summary:
    - Context continuity across stateless AI sessions

    Goals:
    - Restore collaboration context deterministically
    - Make resets observable

    Constraints:
    - No claims of persistent AI memory
    - No bypassing safeguards

    Last Known State:
    - As of: 2026-01-01T18:08:55
    - Refined MVP scope
    [CONTEXT_BLOCK_END]

------------------------------------------------------------------------

## Design Principles

-   **Explicit over implicit**
-   **Files over databases**
-   **Warnings over enforcement**
-   **User agency first**
-   **No metaphysical claims**

ULC is intentionally small. If something feels magical, it's probably
wrong.

------------------------------------------------------------------------

## Versioning

Current version: **v0.1.0**

The CLI surface is intentionally conservative.\
Breaking changes should be rare and explicit.

------------------------------------------------------------------------

## License

MIT

You own your data. Always.
