#!/usr/bin/env node
/**
 * Universal Ledger CLI (ULC) — MVP
 * Commands:
 *   ulc wake --lid <LID> [--json] [--file <path>] [--ledger-dir <dir>]
 *   ulc init --lid <LID> --project <name> [--ledger-dir <dir>] [--force]
 *   ulc list [--ledger-dir <dir>] [--json]
 *
 * Notes:
 * - Treats models as stateless participants. No claims of internal persistence.
 * - Ledger is user-owned and stored locally (default: ~/.ulc/ledger).
 */

import { runCLI } from "../dist/index.js";
process.exit(runCLI(process.argv));