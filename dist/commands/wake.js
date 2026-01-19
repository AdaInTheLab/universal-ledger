// src/commands/wake.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadLedgerRecord } from "../ledger/loadLedger.js";
import { hardValidateLedgerRecord, softValidateLedgerRecord } from "../ledger/validateLedger.js";
import { compileContext } from "../context/compileContext.js";
import { formatContextText } from "../context/formatters.js";
import { ULC_VERSION } from "../index.js";
function flagString(flags, key) {
    const v = flags.get(key);
    return typeof v === "string" ? v : undefined;
}
function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}
function defaultLedgerDir() {
    return path.join(os.homedir(), ".ulc", "ledger");
}
function writeFileIfRequested(filePath, content) {
    if (!filePath)
        return;
    const dir = path.dirname(path.resolve(filePath));
    ensureDir(dir);
    fs.writeFileSync(filePath, content, "utf8");
}
function wakeHelp() {
    return `
ulc wake --lid <LID> [--json|--pretty] [--file <path>] [--ledger-dir <dir>]

Options:
  --lid <LID>           Ledger ID (required)
  --ledger-dir <dir>    Ledger directory (default: ~/.ulc/ledger)
  --json                Output JSON instead of text
  --pretty              Pretty-print JSON (implies --json)
  --file <path>         Write output to a file (also prints to stdout)
`.trim();
}
export const wakeCommand = (flags) => {
    if (flags.get("--help")) {
        console.log(wakeHelp());
        return 0;
    }
    const lid = flagString(flags, "--lid");
    if (!lid) {
        console.error("ulc: wake requires --lid <LID>");
        console.error(`Tip: ${wakeHelp().split("\n")[0]}`);
        return 1;
    }
    const ledgerDir = flagString(flags, "--ledger-dir")
        ? path.resolve(flagString(flags, "--ledger-dir"))
        : defaultLedgerDir();
    const pretty = Boolean(flags.get("--pretty"));
    const wantJson = Boolean(flags.get("--json")) || pretty;
    const outFile = flagString(flags, "--file");
    try {
        // Load + validate
        const { rec } = loadLedgerRecord(lid, ledgerDir);
        hardValidateLedgerRecord(rec);
        const warnings = softValidateLedgerRecord(rec);
        for (const w of warnings)
            console.warn(`ulc: warning: ${w}`);
        // Compile context
        const ctx = compileContext(rec, { version: ULC_VERSION });
        if (wantJson) {
            const jsonOut = JSON.stringify(ctx, null, pretty ? 2 : 0);
            writeFileIfRequested(outFile, jsonOut);
            process.stdout.write(jsonOut + "\n");
            return 0;
        }
        const textOut = formatContextText(ctx);
        writeFileIfRequested(outFile, textOut);
        process.stdout.write(textOut + "\n");
        return 0;
    }
    catch (e) {
        // Friendly output, no stack trace
        const msg = e?.message ? String(e.message) : String(e);
        console.error(`ulc: ${msg}`);
        // Optional: map known error codes to stable exit codes
        const code = e?.code;
        if (code === "NOT_FOUND")
            return 2;
        if (code === "PARSE_ERROR")
            return 3;
        if (code === "READ_ERROR")
            return 4;
        return 1;
    }
};
