export function hardValidateLedgerRecord(rec) {
    const required = ["lid", "project", "created_at", "summary"];
    const missing = required.filter((k) => !rec?.[k]);
    if (missing.length) {
        throw new Error(`Ledger entry missing required field(s): ${missing.join(", ")}`);
    }
    if (typeof rec.lid !== "string" || rec.lid.trim().length < 3) {
        throw new Error("Ledger entry has invalid `lid`");
    }
    if (typeof rec.project !== "string" || !rec.project.trim()) {
        throw new Error("Ledger entry has invalid `project`");
    }
    if (typeof rec.summary !== "string" || !rec.summary.trim()) {
        throw new Error("Ledger entry has invalid `summary`");
    }
}
export function softValidateLedgerRecord(rec) {
    const warnings = [];
    if (rec.goals != null && !Array.isArray(rec.goals))
        warnings.push("`goals` should be an array of strings.");
    if (rec.constraints != null && !Array.isArray(rec.constraints))
        warnings.push("`constraints` should be an array of strings.");
    if (rec.style != null && typeof rec.style !== "object")
        warnings.push("`style` should be an object.");
    if (rec.style?.ask_when_uncertain != null && typeof rec.style.ask_when_uncertain !== "boolean") {
        warnings.push("`style.ask_when_uncertain` should be boolean.");
    }
    if (rec.last_state != null && typeof rec.last_state !== "object")
        warnings.push("`last_state` should be an object.");
    if (rec.last_state?.notes != null && !Array.isArray(rec.last_state.notes))
        warnings.push("`last_state.notes` should be an array.");
    if (typeof rec.summary === "string" && rec.summary.trim().toUpperCase().startsWith("TODO")) {
        warnings.push("`summary` still looks like a TODO. Consider setting a real one (ulc update --summary \"...\").");
    }
    if (Array.isArray(rec.goals)) {
        const hasTodoGoals = rec.goals.some((g) => typeof g === "string" && g.trim().toUpperCase() === "TODO");
        if (hasTodoGoals)
            warnings.push("`goals` contains TODO placeholder(s). Consider setting real goals.");
    }
    return warnings;
}
// Validate ledger integrity (stub)
