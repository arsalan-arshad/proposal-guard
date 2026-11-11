#!/usr/bin/env node
/**
 * Entry point for `proposal-guard-mcp`. The MCP server needs two packages that
 * are optional for everyone who only uses the library or the command line, so
 * a missing package gets a clear message instead of a stack trace.
 */
try {
  await import('./mcp.js');
} catch (e) {
  const err = e as NodeJS.ErrnoException;
  if (err.code === 'ERR_MODULE_NOT_FOUND' && /@modelcontextprotocol|zod/.test(String(err.message))) {
    console.error(
      'proposal-guard-mcp needs two optional packages. Install them next to proposal-guard:\n' +
        '  npm install @modelcontextprotocol/server zod',
    );
    process.exitCode = 2;
  } else {
    throw e;
  }
}
