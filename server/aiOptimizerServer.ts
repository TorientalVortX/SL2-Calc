import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { runAiOptimization } from './agentCore';
import { aiOptimizationRequestSchema, formatSchemaIssues } from './aiSchemas';
import { readPersonalNotes } from './personalKnowledge';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.OPTIMIZER_AI_PORT ?? '8787', 10);
const root = process.cwd();

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 2_000_000) throw new Error('Request body is too large.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`);
  if (request.method === 'GET' && url.pathname === '/api/optimizer-health') {
    json(response, 200, {
      ok: true,
      keyConfigured: Boolean(process.env.OPENAI_API_KEY),
      standardModel: process.env.OPENAI_OPTIMIZER_STANDARD_MODEL ?? 'gpt-5.6-terra',
      deepModel: process.env.OPENAI_OPTIMIZER_DEEP_MODEL ?? 'gpt-5.6-sol',
    });
    return;
  }
  if (request.method !== 'POST' || url.pathname !== '/api/optimizer-ai') {
    json(response, 404, { error: 'Not found.' });
    return;
  }
  try {
    const parsed = aiOptimizationRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      json(response, 400, { error: `Invalid AI optimization request: ${formatSchemaIssues(parsed.error)}` });
      return;
    }
    const personalNotes = await readPersonalNotes(root);
    const result = await runAiOptimization(parsed.data, { personalNotes });
    json(response, 200, result);
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : 'AI optimizer failed.' });
  }
});

server.listen(port, host, () => {
  process.stdout.write(`SL2 AI optimizer listening at http://${host}:${port}\n`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
