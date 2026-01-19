// src/commands/init.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
function flagString(flags, key) {
    const v = flags.get(key);
    return typeof v === "string" ? v : undefined;
}
function flagStrings(flags, key) {
    const v = flags.get(key);
    if (typeof v === "string")
        return [v];
    if (Array.isArray(v))
        return v.filter((x) => typeof x === "string");
    return [];
}
function defaultLedgerDir() {
    return path.join(os.homedir(), ".ulc", "ledger");
}
function todayISO() {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
function nowISO() {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}
function initHelp() {
    return `
ulc init --lid <LID> --project <name> [options]

Options:
  --lid <LID>           Ledger ID to create (required)
  --project <name>      Project name (required)
  --ledger-dir <dir>    Override ledger directory (default: ~/.ulc/ledger)
  --force               Overwrite if the file already exists

  --summary <text>      Set initial summary (otherwise TODO placeholder)
  --goal <text>         Add an initial goal (repeatable)
  --constraint <text>   Add an initial constraint (repeatable)

Example:
  ulc init --lid 2026-01-01-TEST --project "Universal Ledger CLI"
`.trim();
}
function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}
function initLedgerEntry(args) {
    const today = todayISO();
    const goals = args.goals && args.goals.length
        ? args.goals
        : ["TODO", "TODO"];
    const constraints = args.constraints && args.constraints.length
        ? args.constraints
        : ["No claims of persistent AI memory", "No bypassing safeguards", "No network calls in v1"];
    return {
        lid: args.lid,
        project: args.project,
        created_at: nowISO(),
        summary: args.summary?.trim()
            ? args.summary.trim()
            : "TODO: one-sentence purpose for this collaboration context",
        goals,
        constraints,
        style: {
            tone: "Precise, technical, minimal metaphor",
            format: "Short paragraphs, explicit bullets",
            ask_when_uncertain: true,
        },
        last_state: {
            as_of: today,
            notes: ["Initialized ledger entry template via `ulc init`."],
        },
    };
}
export const initCommand = (flags) => {
    if (flags.get("--help")) {
        console.log(initHelp());
        return 0;
    }
    const lid = flagString(flags, "--lid");
    const project = flagString(flags, "--project");
    if (!lid) {
        console.error("ulc: init requires --lid <LID>");
        console.error(`Tip: ${initHelp().split("\n")[0]}`);
        return 1;
    }
    if (!project) {
        console.error('ulc: init requires --project "<name>"');
        console.error(`Tip: ${initHelp().split("\n")[0]}`);
        return 1;
    }
    const ledgerDir = flagString(flags, "--ledger-dir")
        ? path.resolve(flagString(flags, "--ledger-dir"))
        : defaultLedgerDir();
    const force = Boolean(flags.get("--force"));
    const filePath = path.join(ledgerDir, `${lid}.json`);
    try {
        ensureDir(ledgerDir);
        if (fs.existsSync(filePath) && !force) {
            console.error(`ulc: ledger entry already exists: ${filePath}`);
            console.error("Tip: use --force to overwrite.");
            return 2; // "exists" / would overwrite
        }
        const summary = flagString(flags, "--summary");
        const goals = flagStrings(flags, "--goal");
        const constraints = flagStrings(flags, "--constraint");
        const rec = initLedgerEntry({
            lid,
            project,
            summary: summary ?? undefined,
            goals: goals.length ? goals : undefined,
            constraints: constraints.length ? constraints : undefined,
        });
        fs.writeFileSync(filePath, JSON.stringify(rec, null, 2) + "\n", "utf8");
        process.stdout.write(`Created: ${filePath}\n`);
        return 0;
    }
    catch (e) {
        const msg = e?.message ? String(e.message) : String(e);
        console.error(`ulc: ${msg}`);
        return 1;
    }
};
