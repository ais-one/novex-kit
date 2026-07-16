import '@common/node/config';

import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import { getAgentCard, sendTask } from '../src/a2a/client.ts';
import { connectMcp } from '../src/lib/mcp-client.ts';

interface SampleDoc {
  id: string;
  title: string;
  content: string;
}

const MCP_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3200/mcp';
const SPECIALIST_URL = 'http://localhost:3202';
const SUPERVISOR_URL = 'http://localhost:3201';

const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: 'doc-rag',
    title: 'RAG Architecture',
    content:
      'Retrieval-Augmented Generation (RAG) combines retrieval with LLM generation. ' +
      'A query retrieves the most relevant documents from a knowledge base, which are then passed as context to the LLM. ' +
      'This grounds responses in real data and significantly reduces hallucination.',
  },
  {
    id: 'doc-mcp',
    title: 'MCP Protocol Overview',
    content:
      'Model Context Protocol (MCP) standardises how LLM applications connect to external tools and data sources. ' +
      'Servers expose tools, resources, and prompts. Clients discover and invoke them over Streamable HTTP or stdio transports.',
  },
  {
    id: 'doc-a2a',
    title: 'A2A Protocol',
    content:
      'Agent-to-Agent (A2A) is an open interoperability protocol by Google. ' +
      'Each agent publishes an AgentCard at /.well-known/agent.json describing its skills and endpoint. ' +
      'Agents communicate via JSON-RPC 2.0 — tasks/send submits work; the response carries result artifacts.',
  },
  {
    id: 'doc-supervisor',
    title: 'Supervisor-Specialist Pattern',
    content:
      'The supervisor-specialist pattern has a supervisor agent that receives user queries, classifies intent, ' +
      'and delegates to one or more specialist agents via A2A. ' +
      'The supervisor then synthesizes the specialist output into a final user-facing response.',
  },
];

const QUERIES = [
  'What is RAG and why does it reduce hallucination?',
  'How do the supervisor and specialist agents communicate?',
  'What is MCP and how does it differ from A2A?',
];

async function waitForServer(url: string, retries = 30, delayMs = 300): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`Server at ${url} did not become ready in time`);
}

// ── 1. Seed documents into MCP ───────────────────────────────────────────────
console.log('── Seeding documents into MCP knowledge base ────────');
const mcp = await connectMcp(MCP_URL);
for (const doc of SAMPLE_DOCS) {
  const result = await mcp.callTool({ name: 'rag_add_document', arguments: doc });
  console.log(' ', (result.content[0] as { text: string }).text);
}
await mcp.close();

// ── 2. Spawn agents ──────────────────────────────────────────────────────────
const sharedEnv: NodeJS.ProcessEnv = {
  ...process.env,
  MCP_SERVER_URL: MCP_URL,
  SPECIALIST_URL,
  SPECIALIST_PORT: '3202',
  SUPERVISOR_PORT: '3201',
};

const appRoot = path.resolve(import.meta.dirname, '..');

console.log('\n── Starting agents ───────────────────────────────────');

const specialist: ChildProcess = spawn('node', ['src/a2a/specialist.ts'], {
  cwd: appRoot,
  env: sharedEnv,
  stdio: ['ignore', 'inherit', 'inherit'],
});

const supervisor: ChildProcess = spawn('node', ['src/a2a/supervisor.ts'], {
  cwd: appRoot,
  env: sharedEnv,
  stdio: ['ignore', 'inherit', 'inherit'],
});

// ── 3. Wait for both agents ──────────────────────────────────────────────────
await waitForServer(`${SPECIALIST_URL}/.well-known/agent.json`);
await waitForServer(`${SUPERVISOR_URL}/.well-known/agent.json`);

const specialistCard = await getAgentCard(SPECIALIST_URL);
const supervisorCard = await getAgentCard(SUPERVISOR_URL);
console.log(`\nSpecialist: ${specialistCard.name}`);
console.log(`Supervisor: ${supervisorCard.name}`);

// ── 4. Send queries through the supervisor ───────────────────────────────────
console.log('\n── A2A Queries (user → supervisor → specialist) ─────');
for (const query of QUERIES) {
  console.log(`\nQ: ${query}`);
  const answer = await sendTask(SUPERVISOR_URL, query);
  console.log(`A: ${answer}`);
  console.log('─'.repeat(54));
}

// ── 5. Cleanup ───────────────────────────────────────────────────────────────
specialist.kill();
supervisor.kill();
console.log('\nDone.');
