import { createRequire } from 'node:module';

/** The package version, read from package.json so it cannot drift from the published package. Node only (CLI and MCP). */
export const VERSION: string = (createRequire(import.meta.url)('../package.json') as { version: string }).version;
