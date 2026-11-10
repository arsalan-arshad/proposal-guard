#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { explainFinding, listRules, scanProposal } from './mcp-tools.js';
import { DEFAULT_MAX_CHARS } from './scan.js';

/**
 * Local, read-only MCP server over stdio. Three tools; none takes a file path,
 * none touches the network, the shell or the disk. stdout carries only the
 * protocol; anything else goes to stderr.
 */
const server = new McpServer({ name: 'proposal-guard', version: '0.0.0' });

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

server.registerTool(
  'scan_proposal',
  {
    title: 'Scan a proposal or SOW',
    description:
      'Scan draft proposal or SOW text with four fixed rules (SCOPE-01, TIME-03, HOST-02, REVISE-04). Returns quoted sentences, the rule, why and a fill-in-the-blanks suggestion. Read-only. Not legal advice.',
    inputSchema: z.object({ text: z.string().max(DEFAULT_MAX_CHARS) }),
    annotations: READ_ONLY,
  },
  async ({ text }) => scanProposal(text),
);

server.registerTool(
  'list_rules',
  {
    title: 'List rules',
    description: 'List the four rule ids and names.',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
  },
  async () => listRules(),
);

server.registerTool(
  'explain_finding',
  {
    title: 'Explain a rule',
    description: 'Describe what one rule flags, what it leaves alone and the shape of its suggestion.',
    inputSchema: z.object({ rule_id: z.string().max(40) }),
    annotations: READ_ONLY,
  },
  async ({ rule_id }) => explainFinding(rule_id),
);

await server.connect(new StdioServerTransport());
console.error('proposal-guard MCP server running on stdio (read-only)');
