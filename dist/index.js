// src/index.ts
import { COMMANDS, COMMAND_NAMES } from "./commands/index.js";
export const ULC_VERSION = "0.1.1";
function usage() {
    return `
ulc <command> [options]

Commands:
  ${COMMAND_NAMES.join(", ")}

Common options:
  --help
  --json
  --pretty

Command help:
  ulc <command> --help

Env:
  ULC_LEDGER_PATH  Path to local ledger JSON file
`.trim();
}
function parseArgs(argv) {
    const args = argv.slice(2);
    const cmd = args[0] ?? "";
    const flags = new Map();
    for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (!a.startsWith("--"))
            continue;
        const next = args[i + 1];
        if (a === "--help" || a === "--json" || a === "--pretty") {
            flags.set(a, true);
            continue;
        }
        if (next && !next.startsWith("--")) {
            flags.set(a, next);
            i++;
        }
        else {
            flags.set(a, true);
        }
    }
    return { cmd, flags };
}
export function runCLI(argv = process.argv) {
    const { cmd, flags } = parseArgs(argv);
    // No command? Show global help.
    if (!cmd) {
        console.log(usage());
        return 0;
    }
    const handler = COMMANDS[cmd];
    if (!handler) {
        console.error(`Unknown command: ${cmd}\n`);
        console.log(usage());
        return 1;
    }
    // Let the command render its own help if requested.
    return handler(flags);
}
