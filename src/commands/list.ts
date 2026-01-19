// src/commands/list.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { CommandHandler, Flags } from "./types.js";

type ListEntry = {
    lid: string;
    project: string;
    created_at?: string;
    summary?: string;
    file: string;
};

function flagString(flags: Flags, key: string): string | undefined {
    const v = flags.get(key);
    return typeof v === "string" ? v : undefined;
}

function defaultLedgerDir(): string {
    return path.join(os.homedir(), ".ulc", "ledger");
}

function listHelp(): string {
    return `
ulc list [--ledger-dir <dir>] [--json|--pretty]

Options:
  --ledger-dir <dir>  Override ledger directory (default: ~/.ulc/ledger)
  --json              Output JSON
  --pretty            Pretty-print JSON (implies --json)
`.trim();
}

function readJson(filePath: string): any {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
}

function collectEntries(ledgerDir: string): ListEntry[] {
    if (!fs.existsSync(ledgerDir)) return [];

    const files = fs.readdirSync(ledgerDir).filter((f) => f.endsWith(".json"));
    const entries: ListEntry[] = [];

    for (const f of files) {
        const p = path.join(ledgerDir, f);

        try {
            const rec = readJson(p);
            const lid = typeof rec?.lid === "string" ? rec.lid : "";
            const project = typeof rec?.project === "string" ? rec.project : "";
            if (!lid || !project) continue;

            entries.push({
                lid,
                project,
                created_at: typeof rec?.created_at === "string" ? rec.created_at : undefined,
                summary: typeof rec?.summary === "string" ? rec.summary : undefined,
                file: p,
            });
        } catch {
            // ignore bad files; keep list usable
        }
    }

    // newest-ish first if created_at resembles ISO; otherwise stable-ish by lid
    entries.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || a.lid.localeCompare(b.lid));
    return entries;
}

export const listCommand: CommandHandler = (flags) => {
    if (flags.get("--help")) {
        console.log(listHelp());
        return 0;
    }

    const ledgerDir = flagString(flags, "--ledger-dir")
        ? path.resolve(flagString(flags, "--ledger-dir")!)
        : defaultLedgerDir();

    const pretty = Boolean(flags.get("--pretty"));
    const wantJson = Boolean(flags.get("--json")) || pretty;

    try {
        const entries = collectEntries(ledgerDir);

        if (wantJson) {
            const out = { ledger_dir: ledgerDir, entries };
            process.stdout.write(JSON.stringify(out, null, pretty ? 2 : 0) + "\n");
            return 0;
        }

        if (!entries.length) {
            process.stdout.write(`No ledger entries found in: ${ledgerDir}\n`);
            process.stdout.write(`Tip: ulc init --lid <LID> --project "<name>"\n`);
            return 0;
        }

        process.stdout.write(`Ledger directory: ${ledgerDir}\n\n`);
        for (const e of entries) {
            process.stdout.write(`- ${e.lid} — ${e.project}\n`);
            if (e.created_at) process.stdout.write(`  created: ${e.created_at}\n`);
            if (e.summary) process.stdout.write(`  summary: ${e.summary}\n`);
        }

        return 0;
    } catch (e: any) {
        const msg = e?.message ? String(e.message) : String(e);
        console.error(`ulc: ${msg}`);
        return 1;
    }
};
