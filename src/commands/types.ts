// src/commands/types.ts
export type Flags = Map<string, string | boolean>;
export type CommandHandler = (flags: Flags) => number;
