// src/commands/index.ts
import type { CommandHandler } from "./types.js";
import { inspectCommand } from "./inspect.js";
import { wakeCommand } from "./wake.js";
import { initCommand } from "./init.js";
import { listCommand } from "./list.js";
import { updateCommand } from "./update.js";

export const COMMANDS: Record<string, CommandHandler> = {
    inspect: inspectCommand,
    wake: wakeCommand,
    init: initCommand,
    list: listCommand,
    update: updateCommand,
};

export const COMMAND_NAMES = Object.keys(COMMANDS).sort();
