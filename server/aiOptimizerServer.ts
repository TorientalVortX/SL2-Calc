import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AiOptimizationRequest } from '../src/types';
import { runAiOptimization } from './agentCore';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.OPTIMIZER_AI_PORT ?? '8787', 10);
const root = process.cwd();

async function readPersonalNotes(): Promise<string> {
  const directory = path.join(root, 'optimizer-knowledge');
  try {
    const collectMarkdown = async (current: string, relative = ''): Promise<string[]> => {
      const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
      const files: string[] = [];
      for (const entry of entries) {
        const relativeName = path.join(relative, entry.name);
        if (entry.isDirectory()) files.push(...await collectMarkdown(path.join(current, entry.name), relativeName));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md') && !entry.name.startsWith('_')) files.push(relativeName);
      }
      return files;
    };
    const names = await collectMarkdown(directory);
    const notes = await Promise.all(names.map(async name => `## ${name.replaceAll('\\', '/')}\n${await readFile(path.join(directory, name), 'utf8')}`));
    return notes.join('\n\n').slice(0, 40_000);
  } catch {
    return '';
  }
}

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

function isAiRequest(value: unknown): value is AiOptimizationRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<AiOptimizationRequest>;
  return Boolean(item.build && typeof item.build === 'object'
    && typeof item.build.race === 'string'
    && typeof item.build.subrace === 'string'
    && typeof item.build.mainClass === 'string'
    && typeof item.intent === 'string'
    && (item.mode === 'standard' || item.mode === 'deep')
    && typeof item.presetId === 'string'
    && Array.isArray(item.constraints)
    && item.locks && typeof item.locks === 'object');
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
    const body = await readJson(request);
    if (!isAiRequest(body)) {
      json(response, 400, { error: 'Invalid AI optimization request.' });
      return;
    }
    const personalNotes = await readPersonalNotes();
    const result = await runAiOptimization(body, { personalNotes });
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
