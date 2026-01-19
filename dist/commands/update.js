// src/commands/update.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadLedgerRecord } from "../ledger/loadLedger.js";
import { hardValidateLedgerRecord, softValidateLedgerRecord } from "../ledger/validateLedger.js";
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
function parseYesNo(v, flagName) {
    const s = String(v ?? "").trim().toLowerCase();
    if (["yes", "true", "1"].includes(s))
        return true;
    if (["no", "false", "0"].includes(s))
        return false;
    throw new Error(`Invalid value for ${flagName}: expected yes|no`);
}
function updateHelp() {
    return `
ulc update --lid <LID> [options]

Options:
  --lid <LID>              Ledger ID to patch (required)
  --ledger-dir <dir>       Override ledger directory (default: ~/.ulc/ledger)

  --summary <text>         Set summary
  --project <name>         Set project name

  --add-goal <text>        Append a goal (repeatable)
  --remove-goal <text>     Remove a goal (exact match, repeatable)

  --add-constraint <text>  Append a constraint (repeatable)
  --remove-constraint <t>  Remove a constraint (exact match, repeatable)

  --tone <text>            Set style.tone
  --format <text>          Set style.format
  --ask-when-uncertain <yes|no>  Set style.ask_when_uncertain

  --add-note <text>        Append a note to last_state.notes (repeatable)

Example:
  ulc update --lid SOME_ID --summary "Real summary" --add-goal "Ship inspect"
`.trim();
}
function uniqAppend(arr, items) {
    let changed = false;
    for (const it of items) {
        const s = String(it).trim();
        if (!s)
            continue;
        if (!arr.includes(s)) {
            arr.push(s);
            changed = true;
        }
    }
    return changed;
}
function removeExact(arr, items) {
    if (!items.length)
        return false;
    const before = arr.length;
    const removeSet = new Set(items.map((s) => String(s)));
    const next = arr.filter((x) => !removeSet.has(x));
    if (next.length !== before) {
        arr.length = 0;
        arr.push(...next);
        return true;
    }
    return false;
}
export const updateCommand = (flags) => {
    if (flags.get("--help")) {
        console.log(updateHelp());
        return 0;
    }
    const lid = flagString(flags, "--lid");
    if (!lid) {
        console.error("ulc: update requires --lid <LID>");
        console.error(`Tip: ${updateHelp().split("\n")[0]}`);
        return 1;
    }
    const ledgerDir = flagString(flags, "--ledger-dir")
        ? path.resolve(flagString(flags, "--ledger-dir"))
        : defaultLedgerDir();
    try {
        const { rec, filePath } = loadLedgerRecord(lid, ledgerDir);
        let changed = false;
        // Ensure base shapes
        const r = rec;
        r.style = (r.style && typeof r.style === "object") ? r.style : {};
        r.last_state = (r.last_state && typeof r.last_state === "object") ? r.last_state : {};
        r.last_state.notes = Array.isArray(r.last_state.notes) ? r.last_state.notes : [];
        r.goals = Array.isArray(r.goals) ? r.goals : [];
        r.constraints = Array.isArray(r.constraints) ? r.constraints : [];
        // Patch fields
        const summary = flagString(flags, "--summary");
        if (summary) {
            r.summary = summary;
            changed = true;
        }
        const project = flagString(flags, "--project");
        if (project) {
            r.project = project;
            changed = true;
        }
        const tone = flagString(flags, "--tone");
        if (tone) {
            r.style.tone = tone;
            changed = true;
        }
        const format = flagString(flags, "--format");
        if (format) {
            r.style.format = format;
            changed = true;
        }
        const ask = flagString(flags, "--ask-when-uncertain");
        if (ask != null) {
            r.style.ask_when_uncertain = parseYesNo(ask, "--ask-when-uncertain");
            changed = true;
        }
        // Goals
        const addGoals = flagStrings(flags, "--add-goal");
        if (addGoals.length)
            changed = uniqAppend(r.goals, addGoals) || changed;
        const removeGoals = flagStrings(flags, "--remove-goal");
        if (removeGoals.length)
            changed = removeExact(r.goals, removeGoals) || changed;
        // Constraints
        const addConstraints = flagStrings(flags, "--add-constraint");
        if (addConstraints.length)
            changed = uniqAppend(r.constraints, addConstraints) || changed;
        const removeConstraints = flagStrings(flags, "--remove-constraint");
        if (removeConstraints.length)
            changed = removeExact(r.constraints, removeConstraints) || changed;
        // Notes
        const addNotes = flagStrings(flags, "--add-note");
        if (addNotes.length)
            changed = uniqAppend(r.last_state.notes, addNotes) || changed;
        if (!changed) {
            process.stdout.write("No changes applied (no patch flags provided).\n");
            return 0;
        }
        // Stamp last_state + modified
        r.last_state.as_of = todayISO();
        r.modified_at = nowISO();
        // Validate + warn
        hardValidateLedgerRecord(r);
        const warnings = softValidateLedgerRecord(r);
        for (const w of warnings)
            console.warn(`ulc: warning: ${w}`);
        fs.writeFileSync(filePath, JSON.stringify(r, null, 2) + "\n", "utf8");
        process.stdout.write(`Updated: ${filePath}\n`);
        return 0;
    }
    catch (e) {
        const msg = e?.message ? String(e.message) : String(e);
        console.error(`ulc: ${msg}`);
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
