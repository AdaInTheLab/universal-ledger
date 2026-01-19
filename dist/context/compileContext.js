function asStringArray(v) {
    if (!Array.isArray(v))
        return [];
    return v.filter((x) => typeof x === "string").map((s) => s.trim()).filter(Boolean);
}
export function compileContext(rec, opts = {}) {
    const goals = asStringArray(rec.goals);
    const constraints = asStringArray(rec.constraints);
    const style = rec.style ?? {};
    const lastState = rec.last_state ?? {};
    const lastNotes = asStringArray(lastState.notes);
    const asOf = typeof lastState.as_of === "string" ? lastState.as_of : "";
    return {
        meta: {
            source: opts.source ?? "Universal Ledger CLI",
            version: opts.version ?? "0.1.0",
            lid: rec.lid,
            created_at: rec.created_at,
            project: rec.project,
        },
        summary: rec.summary,
        goals,
        constraints,
        style: {
            tone: typeof style.tone === "string" && style.tone.trim() ? style.tone : "Precise, technical",
            format: typeof style.format === "string" && style.format.trim() ? style.format : "Bullets preferred",
            ask_when_uncertain: typeof style.ask_when_uncertain === "boolean" ? style.ask_when_uncertain : true,
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
