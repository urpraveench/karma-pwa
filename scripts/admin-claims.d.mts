export function parseGrantArgs(argv: string[]): { email: string; revoke: boolean; project: string; error?: undefined } | { error: string };
export function nextClaims(current: Record<string, unknown> | null | undefined, revoke: boolean): Record<string, unknown>;
