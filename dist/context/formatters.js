export function formatContextText(ctx) {
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
        for (const g of ctx.goals)
            lines.push(`- ${g}`);
        lines.push("");
    }
    if (ctx.constraints.length) {
        lines.push("Constraints:");
        for (const c of ctx.constraints)
            lines.push(`- ${c}`);
        lines.push("");
    }
    lines.push("Style:");
    lines.push(`- Tone: ${ctx.style.tone}`);
    lines.push(`- Format: ${ctx.style.format}`);
    lines.push(`- Ask when uncertain: ${ctx.style.ask_when_uncertain ? "yes" : "no"}`);
    lines.push("");
    if (ctx.last_known_state.as_of || ctx.last_known_state.notes.length) {
        lines.push("Last Known State:");
        if (ctx.last_known_state.as_of)
            lines.push(`- As of: ${ctx.last_known_state.as_of}`);
        for (const n of ctx.last_known_state.notes)
            lines.push(`- ${n}`);
        lines.push("");
    }
    lines.push("Instructions:");
    for (const i of ctx.instructions)
        lines.push(`- ${i}`);
    lines.push("[CONTEXT_BLOCK_END]");
    return lines.join("\n");
}
