// src/commands/inspect.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Flags, CommandHandler } from "./types.js";

type InspectReport = {
    ok: boolean;
    ledgerId: string;
    lastAction: string | null;
    lastUpdated: string | null; // ISO
    notes: { total: number; public: number; archived: number };
    capabilities: { publish: boolean; overwrite: boolean; destructive: boolean };
    status: "healthy" | "missing" | "error";
    warnings: string[];
};

type LedgerFileV1 = {
    ledgerId?: string;
    lastAction?: string;
    lastUpdated?: string;
    notes?: Array<{ archived?: boolean; visibility?: "public" | "private" | "unlisted" }>;
    capabilities?: Partial<InspectReport["capabilities"]>;
};

function flagString(flags: Flags, key: string): string | undefined {
    const v = flags.get(key);
    return typeof v === "string" ? v : undefined;
}

function defaultLedgerPath(): string {
    return path.join(os.homedir(), ".ulc", "ledger.json");
}

function safeReadJson(filePath: string): { ok: true; data: any } | { ok: false; error: string } {
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return { ok: true, data: JSON.parse(raw) };
    } catch (e: any) {
        return { ok: false, error: e?.message ? String(e.message) : String(e) };
    }
}

function countNotes(notes: LedgerFileV1["notes"]): InspectReport["notes"] {
    const arr = Array.isArray(notes) ? notes : [];
    let total = 0;
    let archived = 0;
    let pub = 0;

    for (const n of arr) {
        total++;
        if (n?.archived) archived++;
        if (n?.visibility === "public") pub++;
    }

    return { total, public: pub, archived };
}

function buildInspectReport(opts: { ledgerPath: string; ledgerOverride?: string }): InspectReport {
    const warnings: string[] = [];
    const capsDefault = { publish: true, overwrite: false, destructive: false };

    if (!fs.existsSync(opts.ledgerPath)) {
        warnings.push(`Ledger file not found at: ${opts.ledgerPath}`);
        return {
            ok: false,
            ledgerId: opts.ledgerOverride ?? "ulc://local/default",
            lastAction: null,
            lastUpdated: null,
            notes: { total: 0, public: 0, archived: 0 },
            capabilities: capsDefault,
            status: "missing",
            warnings,
        };
    }

    const parsed = safeReadJson(opts.ledgerPath);
    if (!parsed.ok) {
        warnings.push(`Failed to read ledger JSON: ${parsed.error}`);
        return {
            ok: false,
            ledgerId: opts.ledgerOverride ?? "ulc://local/default",
            lastAction: null,
            lastUpdated: null,
            notes: { total: 0, public: 0, archived: 0 },
            capabilities: capsDefault,
            status: "error",
            warnings,
        };
    }

    const data = (parsed.data ?? {}) as LedgerFileV1;

    const ledgerId = opts.ledgerOverride ?? data.ledgerId ?? "ulc://local/default";
    const lastAction = typeof data.lastAction === "string" ? data.lastAction : null;

    let lastUpdated: string | null = null;
    if (typeof data.lastUpdated === "string") {
        const d = new Date(data.lastUpdated);
        if (Number.isFinite(d.getTime())) lastUpdated = d.toISOString();
        else warnings.push(`Invalid lastUpdated in ledger; expected ISO date, got: ${data.lastUpdated}`);
    }

    return {
        ok: true,
        ledgerId,
        lastAction,
        lastUpdated,
        notes: countNotes(data.notes),
        capabilities: {
            publish: typeof data.capabilities?.publish === "boolean" ? data.capabilities.publish : capsDefault.publish,
            overwrite: typeof data.capabilities?.overwrite === "boolean" ? data.capabilities.overwrite : capsDefault.overwrite,
            destructive:
                typeof data.capabilities?.destructive === "boolean"
                    ? data.capabilities.destructive
                    : capsDefault.destructive,
        },
        status: "healthy",
        warnings,
    };
}

function printHuman(report: InspectReport) {
    console.log("ULC Ledger");
    console.log("──────────");
    console.log(`Ledger ID: ${report.ledgerId}`);
    console.log(`Last Action: ${report.lastAction ?? "—"}`);
    console.log(`Last Updated: ${report.lastUpdated ?? "—"}`);
    console.log("");
    console.log("Notes:");
    console.log(`- total: ${report.notes.total}`);
    console.log(`- public: ${report.notes.public}`);
    console.log(`- archived: ${report.notes.archived}`);
    console.log("");
    console.log("Capabilities:");
    console.log(`- publish: ${report.capabilities.publish ? "✅" : "❌"}`);
    console.log(`- overwrite: ${report.capabilities.overwrite ? "✅" : "❌"}`);
    console.log(`- destructive actions: ${report.capabilities.destructive ? "✅" : "gated"}`);
    console.log("");
    console.log(`Status: ${report.status}${report.ok ? "" : " (not ok)"}`);

    if (report.warnings.length) {
        console.log("");
        console.log("Warnings:");
        for (const w of report.warnings) console.log(`- ${w}`);
    }
}

export const inspectCommand: CommandHandler = (flags) => {
    const pretty = Boolean(flags.get("--pretty"));
    const json = pretty || Boolean(flags.get("--json"));

    const ledgerPath =
        flagString(flags, "--path") ??
        process.env.ULC_LEDGER_PATH ??
        defaultLedgerPath();

    const ledgerOverride = flagString(flags, "--ledger");

    const report = buildInspectReport({ ledgerPath, ledgerOverride });

    if (json) process.stdout.write(JSON.stringify(report, null, pretty ? 2 : 0) + "\n");
    else printHuman(report);

    if (report.status === "missing") return 2;
    if (report.status === "error") return 3;
    return 0;
};
