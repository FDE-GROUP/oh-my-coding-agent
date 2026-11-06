import type { DatabaseSync } from "node:sqlite";

export function resolveDbPath(): string;
export function migrateLegacyDatabase(dir: string): boolean;
export function getDatabase(): DatabaseSync;
export function closeDatabase(): void;
export function openDatabase(path: string): DatabaseSync;
export function withTransaction<T>(fn: () => T): T;
