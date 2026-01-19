// src/ledger/loadLedger.ts
import fs from "node:fs";
import path from "node:path";
import type { LedgerRecord } from "./types.js";

export class LedgerError extends Error {
    code: "NOT_FOUND" | "READ_ERROR" | "PARSE_ERROR";
    constructor(code: LedgerError["code"], message: string) {
        super(message);
        this.code = code;
    }
}

function readJson(filePath: string): unknown {
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        try {
            return JSON.parse(raw);
        } catch (e: any) {
            throw new LedgerError(
                "PARSE_ERROR",
                `Failed to parse ledger JSON: ${filePath}\n${e?.message ?? e}`
            );
        }
    } catch (e: any) {
        if (e instanceof LedgerError) throw e;
        throw new LedgerError(
            "READ_ERROR",
            `Failed to read ledger file: ${filePath}\n${e?.message ?? e}`
        );
    }
}

export function ledgerFilePath(lid: string, ledgerDir: string): string {
    return path.join(ledgerDir, `${lid}.json`);
}

export function loadLedgerRecord(lid: string, ledgerDir: string): { rec: LedgerRecord; filePath: string } {
    const filePath = ledgerFilePath(lid, ledgerDir);

    if (!fs.existsSync(filePath)) {
        throw new LedgerError(
            "NOT_FOUND",
            `Ledger entry not found: ${filePath}\nTip: ulc init --lid <LID> --project "<name>" or set --ledger-dir`
        );
    }

    const rec = readJson(filePath) as LedgerRecord;
    return { rec, filePath };
}
// Load ledger by LID (stub)
