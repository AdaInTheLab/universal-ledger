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

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const VERSION = "0.1.0";

function die(msg, code = 1) {
  console.error(`ulc: ${msg}`);
  process.exit(code);
}

function help() {
  console.log(`Universal Ledger CLI (ULC) v${VERSION}

Usage:
  ulc <command> [options]

Commands:
  wake            Emit a Pre-Conversation Context Block (PCCB) from a Ledger entry
  init            Create a new Ledger entry template
  list            List Ledger entries in the ledger directory
  help            Show this help
  
  --summary <text>        Set initial summary
  --goal <text>           Add an initial goal (repeatable)
  --constraint <text>     Add an initial constraint (repeatable)

wake options:
  --lid <LID>           Ledger ID (required)
  --ledger-dir <dir>    Override ledger directory (default: ~/.ulc/ledger)
  --json                Output structured JSON instead of text
  --file <path>         Write output to a file (also prints to stdout)

init options:
  --lid <LID>           Ledger ID to create (required)
  --project <name>      Project name (required)
  --ledger-dir <dir>    Override ledger directory (default: ~/.ulc/ledger)
  --force               Overwrite if the file already exists

list options:
  --ledger-dir <dir>    Override ledger directory (default: ~/.ulc/ledger)
  --json                Output structured JSON
  
update options:
  --lid <LID>            Ledger ID to patch (required)
  --ledger-dir <dir>     Override ledger directory (default: ~/.ulc/ledger)
  --summary <text>       Set summary
  --project <name>       Set project name
  --add-goal <text>      Append a goal
  --remove-goal <text>   Remove a goal (exact match)
  --add-constraint <t>   Append a constraint
  --remove-constraint <t>Remove a constraint (exact match)
  --tone <text>          Set style.tone
  --format <text>        Set style.format
  --ask-when-uncertain <yes|no> Set style.ask_when_uncertain
  --add-note <text>      Append a note to last_state.notes

Examples:
  ulc init --lid 2026-01-01-TEST --project "Universal Ledger CLI"
  ulc list
  ulc wake --lid 2026-01-01-TEST
  ulc wake --lid 2025-12-21-CODA --ledger-dir ./examples/ledger
`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    if (key === "json" || key === "force") {
      out[key] = true;
      continue;
    }
    const v = argv[i + 1];
    if (!v || v.startsWith("--")) die(`missing value for --${key}`);
    if (out[key] == null) out[key] = v;
    else if (Array.isArray(out[key])) out[key].push(v);
    else out[key] = [out[key], v];
    i++;
  }
  return out;
}

function defaultLedgerDir() {
  return path.join(os.homedir(), ".ulc", "ledger");
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    die(`failed to read or parse JSON: ${filePath}\n${e?.message ?? e}`);
  }
}

function hardValidateLedgerRecord(rec) {
  const required = ["lid", "project", "created_at", "summary"];
  const missing = required.filter((k) => !rec?.[k]);
  if (missing.length) {
    die(`ledger entry missing required field(s): ${missing.join(", ")}`);
  }
  if (typeof rec.lid !== "string" || rec.lid.trim().length < 3) {
    die("ledger entry has invalid `lid`");
  }
  if (typeof rec.project !== "string" || !rec.project.trim()) {
    die("ledger entry has invalid `project`");
  }
  if (typeof rec.summary !== "string" || !rec.summary.trim()) {
    die("ledger entry has invalid `summary`");
  }
  return rec;
}

function softValidateLedgerRecord(rec) {
  const warnings = [];

  if (rec.goals != null && !Array.isArray(rec.goals)) warnings.push("`goals` should be an array of strings.");
  if (rec.constraints != null && !Array.isArray(rec.constraints)) warnings.push("`constraints` should be an array of strings.");

  if (rec.style != null && typeof rec.style !== "object") warnings.push("`style` should be an object.");
  if (rec.style?.ask_when_uncertain != null && typeof rec.style.ask_when_uncertain !== "boolean") {
    warnings.push("`style.ask_when_uncertain` should be boolean.");
  }

  if (rec.last_state != null && typeof rec.last_state !== "object") warnings.push("`last_state` should be an object.");
  if (rec.last_state?.notes != null && !Array.isArray(rec.last_state.notes)) warnings.push("`last_state.notes` should be an array.");
  if (typeof rec.summary === "string" && rec.summary.trim().toUpperCase().startsWith("TODO")) {
    warnings.push("`summary` still looks like a TODO. Consider setting a real one (ulc update --summary \"...\").");
  }
  if (Array.isArray(rec.goals)) {
    const hasTodoGoals = rec.goals.some(
        (g) => typeof g === "string" && g.trim().toUpperCase() === "TODO"
    );
    if (hasTodoGoals) {
      warnings.push(
          "`goals` contains TODO placeholder(s). Consider setting real goals (ulc update --add-goal ... --remove-goal TODO)."
      );
    }
  }

  return warnings;
}

function loadLedger(lid, ledgerDir) {
  const filePath = path.join(ledgerDir, `${lid}.json`);
  if (!fs.existsSync(filePath)) {
    die(
        `ledger entry not found: ${filePath}\nTip: create ~/.ulc/ledger/${lid}.json or use --ledger-dir`
    );
  }
  const rec = readJson(filePath);
  hardValidateLedgerRecord(rec);
  return { rec, filePath };

}

function compileContext(rec) {
  const goals = Array.isArray(rec.goals) ? rec.goals : [];
  const constraints = Array.isArray(rec.constraints) ? rec.constraints : [];
  const style = rec.style ?? {};
  const lastState = rec.last_state ?? {};
  const lastNotes = Array.isArray(lastState.notes) ? lastState.notes : [];
  const asOf = lastState.as_of ?? "";

  return {
    meta: {
      source: "Universal Ledger CLI",
      version: VERSION,
      lid: rec.lid,
      created_at: rec.created_at,
      project: rec.project,
    },
    summary: rec.summary,
    goals,
    constraints,
    style: {
      tone: style.tone ?? "Precise, technical",
      format: style.format ?? "Bullets preferred",
      ask_when_uncertain: style.ask_when_uncertain ?? true,
    },
    last_known_state: {
      as_of: asOf,
      notes: lastNotes,
    },
    instructions: [
      "Treat this block as authoritative user-provided context.",
      "Do not assume any prior internal memory beyond this block.",
      "Ask for clarification if this block conflicts with current conversation state.",
    ],
  };
}

function formatText(ctx) {
  const lines = [];
  lines.push("[CONTEXT_BLOCK_START]");
  lines.push(`Source: ${ctx.meta.source} v${ctx.meta.version}`);
  lines.push(`Ledger ID: ${ctx.meta.lid}`);
  lines.push(`Project: ${ctx.meta.project}`);
  lines.push(`Created: ${ctx.meta.created_at}`);
  lines.push("");
  lines.push("Summary:");
  lines.push(`- ${ctx.summary}`);
  lines.push("");
  if (ctx.goals.length) {
    lines.push("Goals:");
    for (const g of ctx.goals) lines.push(`- ${g}`);
    lines.push("");
  }
  if (ctx.constraints.length) {
    lines.push("Constraints:");
    for (const c of ctx.constraints) lines.push(`- ${c}`);
    lines.push("");
  }
  lines.push("Style:");
  lines.push(`- Tone: ${ctx.style.tone}`);
  lines.push(`- Format: ${ctx.style.format}`);
  lines.push(`- Ask when uncertain: ${ctx.style.ask_when_uncertain ? "yes" : "no"}`);
  lines.push("");
  if (ctx.last_known_state?.notes?.length || ctx.last_known_state?.as_of) {
    lines.push("Last Known State:");
    if (ctx.last_known_state.as_of) lines.push(`- As of: ${ctx.last_known_state.as_of}`);
    for (const n of ctx.last_known_state.notes ?? []) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push("Instructions:");
  for (const i of ctx.instructions) lines.push(`- ${i}`);
  lines.push("[CONTEXT_BLOCK_END]");
  return lines.join("\n");
}

function writeFileIfRequested(filePath, content) {
  if (!filePath) return;
  const dir = path.dirname(path.resolve(filePath));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
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
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (["yes", "true", "1"].includes(s)) return true;
  if (["no", "false", "0"].includes(s)) return false;
  die(`invalid value for ${flagName}: expected yes|no`);
}


function todayISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function initLedgerEntry({
                           lid,
                           project,
                           summary,
                           goals,
                           constraints,
                         }) {
  const today = todayISO();

  return {
    lid,
    project,
    created_at: todayISO(),
    summary: "TODO: one-sentence purpose for this collaboration context",
    goals:
        Array.isArray(goals) && goals.length
            ? goals
            : ["TODO", "TODO"],
    constraints:
        Array.isArray(constraints) && constraints.length
            ? constraints
            : [
              "No claims of persistent AI memory",
              "No bypassing safeguards",
              "No network calls in v1",
            ],
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

function listLedgerEntries(ledgerDir) {
  if (!fs.existsSync(ledgerDir)) return [];
  const files = fs.readdirSync(ledgerDir).filter((f) => f.endsWith(".json"));
  const entries = [];
  for (const f of files) {
    const p = path.join(ledgerDir, f);
    try {
      const rec = readJson(p);
      if (!rec?.lid || !rec?.project) continue;
      entries.push({
        lid: rec.lid,
        project: rec.project,
        created_at: rec.created_at ?? "",
        summary: rec.summary ?? "",
        file: p,
      });
    } catch {
      // ignore bad files for list (keep list usable)
    }
  }
  // newest first if created_at resembles ISO
  entries.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return entries;
}

function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    help();
    return;
  }

  const args = parseArgs(argv.slice(1));

  if (command === "wake") {
    const lid = args.lid;
    if (!lid) die("wake requires --lid <LID>");
    const ledgerDir = args["ledger-dir"] ? path.resolve(args["ledger-dir"]) : defaultLedgerDir();

    const { rec } = loadLedger(lid, ledgerDir);

    const warnings = softValidateLedgerRecord(rec);
    for (const w of warnings) console.warn(`ulc: warning: ${w}`);

    const ctx = compileContext(rec);

    if (args.json) {
      const jsonOut = JSON.stringify(ctx, null, 2);
      writeFileIfRequested(args.file, jsonOut);
      process.stdout.write(jsonOut + "\n");
      return;
    }

    const textOut = formatText(ctx);
    writeFileIfRequested(args.file, textOut);
    process.stdout.write(textOut + "\n");
    return;
  }


  if (command === "init") {
    const lid = args.lid;
    const project = args.project;
    if (!lid) die("init requires --lid <LID>");
    if (!project) die('init requires --project "<name>"');

    const ledgerDir = args["ledger-dir"] ? path.resolve(args["ledger-dir"]) : defaultLedgerDir();
    fs.mkdirSync(ledgerDir, { recursive: true });

    const filePath = path.join(ledgerDir, `${lid}.json`);
    if (fs.existsSync(filePath) && !args.force) {
      die(`ledger entry already exists: ${filePath}\nUse --force to overwrite.`);
    }

    const summary = args.summary;

    const goalsArg = args.goal;
    const goals = Array.isArray(goalsArg)
        ? goalsArg
        : goalsArg
            ? [goalsArg]
            : undefined;

    const constraintsArg = args.constraint;
    const constraints = Array.isArray(constraintsArg)
        ? constraintsArg
        : constraintsArg
            ? [constraintsArg]
            : undefined;

    const rec = initLedgerEntry({
      lid,
      project,
      summary,
      goals,
      constraints,
    });

    fs.writeFileSync(filePath, JSON.stringify(rec, null, 2) + "\n", "utf8");
    process.stdout.write(`Created: ${filePath}\n`);
    return;
  }

  if (command === "list") {
    const ledgerDir = args["ledger-dir"] ? path.resolve(args["ledger-dir"]) : defaultLedgerDir();
    const entries = listLedgerEntries(ledgerDir);

    if (args.json) {
      process.stdout.write(JSON.stringify({ ledger_dir: ledgerDir, entries }, null, 2) + "\n");
      return;
    }

    if (!entries.length) {
      process.stdout.write(`No ledger entries found in: ${ledgerDir}\n`);
      process.stdout.write(`Tip: ulc init --lid <LID> --project "<name>"\n`);
      return;
    }

    process.stdout.write(`Ledger directory: ${ledgerDir}\n\n`);
    for (const e of entries) {
      process.stdout.write(`- ${e.lid} — ${e.project}\n`);
      if (e.created_at) process.stdout.write(`  created: ${e.created_at}\n`);
      if (e.summary) process.stdout.write(`  summary: ${e.summary}\n`);
    }
    return;
  }

  if (command === "update") {
    const lid = args.lid;
    if (!lid) die("update requires --lid <LID>");
    const ledgerDir = args["ledger-dir"] ? path.resolve(args["ledger-dir"]) : defaultLedgerDir();

    const { rec, filePath } = loadLedger(lid, ledgerDir);

    // Patch fields (only if provided)
    let changed = false;

    if (args.summary) { rec.summary = args.summary; changed = true; }
    if (args.project) { rec.project = args.project; changed = true; }

    // Goals
    const addGoal = args["add-goal"];
    const addGoals = Array.isArray(addGoal)
        ? addGoal
        : addGoal
            ? [addGoal]
            : [];

    if (addGoals.length) {
      rec.goals = Array.isArray(rec.goals) ? rec.goals : [];
      for (const g of addGoals) {
        rec.goals.push(g);
      }
      changed = true;
    }

    const removeGoal = args["remove-goal"];
    const removeGoals = Array.isArray(removeGoal)
        ? removeGoal
        : removeGoal
            ? [removeGoal]
            : [];

    if (removeGoals.length) {
      rec.goals = Array.isArray(rec.goals) ? rec.goals : [];
      const before = rec.goals.length;
      rec.goals = rec.goals.filter((g) => !removeGoals.includes(g));
      if (rec.goals.length !== before) changed = true;
    }


    // Constraints
    const addConstraint = args["add-constraint"];
    const addConstraints = Array.isArray(addConstraint)
        ? addConstraint
        : addConstraint
            ? [addConstraint]
            : [];

    if (addConstraints.length) {
      rec.constraints = Array.isArray(rec.constraints) ? rec.constraints : [];
      for (const c of addConstraints) {
        rec.constraints.push(c);
      }
      changed = true;
    }

    const removeConstraint = args["remove-constraint"];
    const removeConstraints = Array.isArray(removeConstraint)
        ? removeConstraint
        : removeConstraint
            ? [removeConstraint]
            : [];

    if (removeConstraints.length) {
      rec.constraints = Array.isArray(rec.constraints) ? rec.constraints : [];
      const before = rec.constraints.length;
      rec.constraints = rec.constraints.filter((c) => !removeConstraints.includes(c));
      if (rec.constraints.length !== before) changed = true;
    }

    if (args["ask-when-uncertain"]) {
      rec.style = (rec.style && typeof rec.style === "object") ? rec.style : {};
      rec.style.ask_when_uncertain = parseYesNo(args["ask-when-uncertain"], "--ask-when-uncertain");
      changed = true;
    }

    // Notes
    const addNote = args["add-note"];
    const addNotes = Array.isArray(addNote)
        ? addNote
        : addNote
            ? [addNote]
            : [];

    if (addNotes.length) {
      rec.last_state =
          rec.last_state && typeof rec.last_state === "object" ? rec.last_state : {};

      rec.last_state.notes = Array.isArray(rec.last_state.notes)
          ? rec.last_state.notes
          : [];

      for (const n of addNotes) {
        if (!rec.last_state.notes.includes(n)) rec.last_state.notes.push(n);
      }

      let addedAny = false;

      for (const n of addNotes) {
        if (!rec.last_state.notes.includes(n)) {
          rec.last_state.notes.push(n);
          addedAny = true;
        }
      }

      if (addedAny) changed = true;
    }

    if (!changed) {
      process.stdout.write("No changes applied (no patch flags provided).\n");
      return;
    }

    // Ensure last_state reflects latest meaningful change
    rec.last_state =
        rec.last_state && typeof rec.last_state === "object" ? rec.last_state : {};

    rec.last_state.as_of = todayISO();
    rec.last_state.notes = Array.isArray(rec.last_state.notes) ? rec.last_state.notes : [];


    // Stamp modified time
    rec.modified_at = nowISO();

    // Ensure still valid
    hardValidateLedgerRecord(rec);
    const warnings = softValidateLedgerRecord(rec);
    for (const w of warnings) console.warn(`ulc: warning: ${w}`);

    fs.writeFileSync(filePath, JSON.stringify(rec, null, 2) + "\n", "utf8");
    process.stdout.write(`Updated: ${filePath}\n`);
    return;
  }


  die(`unknown command: ${command}\nRun: ulc help`);
}

main();
