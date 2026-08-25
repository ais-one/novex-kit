/**
 * MCP + A2A integration test.
 * Runs all endpoints and reports pass/fail.
 *
 * Usage:
 *   node demo/test.js
 */

const MCP = 'http://localhost:3200';
const SUPERVISOR = 'http://localhost:3201';
const SPECIALIST = 'http://localhost:3202';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ─── MCP Tests ────────────────────────────────────────────────────────────

async function testMcp() {
  let sessionId: string | null = null;

  // Status
  await test('GET /status', async () => {
    const res = await fetch(`${MCP}/status`);
    assert(res.ok, `status ${res.status}`);
    const text = await res.text();
    assert(text === 'OK - 0.6', `expected "OK - 0.6", got "${text}"`);
  });

  // Initialize
  await test('POST /mcp (initialize)', async () => {
    const res = await fetch(`${MCP}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
      }),
    });
    assert(res.ok, `init ${res.status}`);
    sessionId = res.headers.get('mcp-session-id');
    assert(sessionId, 'no mcp-session-id header');
  });

  if (!sessionId) return;

  const mcp = async (method, params) => {
    const res = await fetch(`${MCP}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method, params }),
    });
    // Streamable HTTP returns SSE format. Parse the data: line.
    const text = await res.text();
    const dataLine = text.split('\n').find(l => l.startsWith('data: '));
    if (!dataLine) throw new Error(`No data line in SSE response: ${text.slice(0, 200)}`);
    return JSON.parse(dataLine.slice(6));
  };

  // Tools list
  await test('tools/list', async () => {
    const res = await mcp('tools/list', {});
    assert(res.result, `no result: ${JSON.stringify(res.error)}`);
    assert(res.result.tools.length === 10, `expected 10 tools, got ${res.result.tools.length}`);
  });

  // Utility tools
  await test('tools/call add', async () => {
    const res = await mcp('tools/call', { name: 'add', arguments: { a: 7, b: 5 } });
    assert(res.result?.content?.[0]?.text === '12', `got ${res.result?.content?.[0]?.text}`);
  });

  await test('tools/call echo', async () => {
    const res = await mcp('tools/call', { name: 'echo', arguments: { message: 'Hello' } });
    assert(res.result?.content?.[0]?.text === 'Tool echo: Hello', `got ${res.result?.content?.[0]?.text}`);
  });

  await test('tools/call days-to-due-date', async () => {
    const res = await mcp('tools/call', {
      name: 'days-to-due-date',
      arguments: { calcDate: '2025-01-01', dueDate: '2025-01-10' },
    });
    assert(res.result?.content?.[0]?.text.includes('9'), `got ${res.result?.content?.[0]?.text}`);
  });

  // Report tools
  await test('tools/call get_available_reports', async () => {
    const res = await mcp('tools/call', { name: 'get_available_reports', arguments: { telegram_id: 'tg_123' } });
    const data = JSON.parse(res.result?.content?.[0]?.text);
    assert(data.available_reports?.length === 4, `expected 4 reports, got ${data.available_reports?.length}`);
  });

  await test('tools/call generate_reports', async () => {
    const res = await mcp('tools/call', {
      name: 'generate_reports',
      arguments: { telegram_id: 'tg_123', report_ids: [1, 5], start_date: '2025-01-01', end_date: '2025-01-31' },
    });
    const data = JSON.parse(res.result?.content?.[0]?.text);
    assert(data.success, `got ${JSON.stringify(data)}`);
  });

  // Resources
  await test('resources/list', async () => {
    const res = await mcp('resources/list', {});
    assert(res.result, `no result: ${JSON.stringify(res.error)}`);
  });

  await test('resources/read', async () => {
    const res = await mcp('resources/read', { uri: 'info://server' });
    assert(res.result?.contents?.[0]?.text.includes('MCP'), `got ${res.result?.contents?.[0]?.text}`);
  });

  // Prompts
  await test('prompts/list', async () => {
    const res = await mcp('prompts/list', {});
    assert(res.result, `no result: ${JSON.stringify(res.error)}`);
  });

  await test('prompts/get', async () => {
    const res = await mcp('prompts/get', { name: 'review-code', arguments: { code: 'const x = 1' } });
    assert(res.result?.messages?.[0], `no messages: ${JSON.stringify(res.result)}`);
  });

  // Session termination
  await test('DELETE /mcp', async () => {
    const res = await fetch(`${MCP}/mcp`, { method: 'DELETE', headers: { 'mcp-session-id': sessionId } });
    assert(res.ok, `delete ${res.status}`);
  });

  // BMI requires auth (edge case test)
  await test('tools/call calculate-bmi (missing auth → error)', async () => {
    const res = await fetch(`${MCP}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 99,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
      }),
    });
    const sid = res.headers.get('mcp-session-id');
    const r = await fetch(`${MCP}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'mcp-session-id': sid,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 100,
        method: 'tools/call',
        params: { name: 'calculate-bmi', arguments: { weightKg: 70, heightM: 1.75 } },
      }),
    }).then(r => r.text());
    const dataLine = r.split('\n').find(l => l.startsWith('data: '));
    const result = dataLine ? JSON.parse(dataLine.slice(6)) : {};
    assert(result.result?.isError, `expected error, got ${r.slice(0, 200)}`);
  });
}

// ─── A2A Tests ────────────────────────────────────────────────────────────

async function testA2A() {
  await test('Supervisor AgentCard', async () => {
    const res = await fetch(`${SUPERVISOR}/.well-known/agent.json`);
    assert(res.ok, `supervisor agentcard ${res.status}`);
    const card = await res.json();
    assert(card.name === 'Supervisor Agent', `expected "Supervisor Agent", got "${card.name}"`);
  });

  await test('Specialist AgentCard', async () => {
    const res = await fetch(`${SPECIALIST}/.well-known/agent.json`);
    assert(res.ok, `specialist agentcard ${res.status}`);
    const card = await res.json();
    assert(card.name === 'Document Q&A Specialist', `expected "Document Q&A Specialist", got "${card.name}"`);
  });

  await test('Supervisor health', async () => {
    const res = await fetch(`${SUPERVISOR}/health`);
    assert(res.ok, `supervisor health ${res.status}`);
  });

  await test('Specialist health', async () => {
    const res = await fetch(`${SPECIALIST}/health`);
    assert(res.ok, `specialist health ${res.status}`);
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────

console.log('\n── MCP Server Tests ──────────────────────');
await testMcp().catch(e => console.error('  ✗ test error:', e.message));

console.log('\n── A2A Agent Tests ───────────────────────');
await testA2A().catch(e => console.error('  ✗ test error:', e.message));

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
