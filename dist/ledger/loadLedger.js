// src/ledger/loadLedger.ts
import fs from "node:fs";
import path from "node:path";
export class LedgerError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
function readJson(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        try {
            return JSON.parse(raw);
        }
        catch (e) {
            throw new LedgerError("PARSE_ERROR", `Failed to parse ledger JSON: ${filePath}\n${e?.message ?? e}`);
        }
    }
    catch (e) {
        if (e instanceof LedgerError)
            throw e;
        throw new LedgerError("READ_ERROR", `Failed to read ledger file: ${filePath}\n${e?.message ?? e}`);
    }
}
export function ledgerFilePath(lid, ledgerDir) {
    return path.join(ledgerDir, `${lid}.json`);
}
export function loadLedgerRecord(lid, ledgerDir) {
    const filePath = ledgerFilePath(lid, ledgerDir);
    if (!fs.existsSync(filePath)) {
        throw new LedgerError("NOT_FOUND", `Ledger entry not found: ${filePath}\nTip: ulc init --lid <LID> --project "<name>" or set --ledger-dir`);
    }
    const rec = readJson(filePath);
    return { rec, filePath };
}
// Load ledger by LID (stub)
