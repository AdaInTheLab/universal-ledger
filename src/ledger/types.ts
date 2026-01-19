// Ledger types (stub)
// src/ledger/types.ts
export type LedgerStyle = {
    tone?: string;
    format?: string;
    ask_when_uncertain?: boolean;
};

export type LedgerLastState = {
    as_of?: string;
    notes?: string[];
};

export type LedgerRecord = {
    lid: string;
    project: string;
    created_at: string;
    modified_at?: string;

    summary: string;
    goals?: string[];
    constraints?: string[];
    style?: LedgerStyle;
    last_state?: LedgerLastState;
};
