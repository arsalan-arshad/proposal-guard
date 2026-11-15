import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { checkSuggestionNumbers, compareDocuments, explainFinding, listRules, prepareSuggestion, scanProposal } from './mcp-tools.js';
import { DEFAULT_MAX_CHARS } from './scan.js';
import { VERSION } from './version.js';

/**
 * Local, read-only MCP server over stdio. Six tools; none takes a file path,
 * none touches the network, the shell or the disk. stdout carries only the
 * protocol; anything else goes to stderr.
 */
const server = new McpServer({ name: 'proposal-guard', version: VERSION });

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
  'compare_documents',
  {
    title: "Compare a client's text with a proposal",
    description:
      "Mark sentences in the client's text (job post or contract) and in your proposal: risk wording in the client's text, a paid service with no stated payer, and numbers that differ between the two texts. Marks are highlights, not a score. Two of the three checks are experimental. Read-only. Not legal advice.",
    inputSchema: z.object({ reference: z.string().max(DEFAULT_MAX_CHARS), proposal: z.string().max(DEFAULT_MAX_CHARS) }),
    annotations: READ_ONLY,
  },
  async ({ reference, proposal }) => compareDocuments(reference, proposal),
);

server.registerTool(
  'prepare_suggestion',
  {
    title: 'Prepare a suggestion request for your own model',
    description:
      "Build the text (fixed instructions, the rule findings and both texts inside labelled data blocks) that your own model can answer to suggest better wording for a proposal in light of the client's text. This server calls no model and sends nothing. Read-only.",
    inputSchema: z.object({ reference: z.string().max(60_000), proposal: z.string().max(60_000) }),
    annotations: READ_ONLY,
  },
  async ({ reference, proposal }) => prepareSuggestion(reference, proposal),
);

server.registerTool(
  'check_suggestion_numbers',
  {
    title: 'Check a suggestion for invented numbers',
    description: 'List numbers in a model-written suggestion that appear in neither the client text nor the proposal. Deterministic. Read-only.',
    inputSchema: z.object({ reference: z.string().max(60_000), proposal: z.string().max(60_000), suggestion: z.string().max(120_000) }),
    annotations: READ_ONLY,
  },
  async ({ reference, proposal, suggestion }) => checkSuggestionNumbers(reference, proposal, suggestion),
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
