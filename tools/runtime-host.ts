import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type IncomingMessage } from 'node:http';
import { once } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';

const host = '127.0.0.1';
const port = Number(process.env.PI_POCKET_CONTROL_PORT ?? 8093);
const upstreamPort = Number(process.env.PI_POCKET_LLAMA_PORT ?? 8092);
const allowedOrigin = process.env.PI_POCKET_ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173';
const binary = process.env.LLAMA_SERVER_BIN;
const model = process.env.LLAMA_SERVER_MODEL;
const extraArgs = process.env.LLAMA_SERVER_ARGS ? JSON.parse(process.env.LLAMA_SERVER_ARGS) as string[] : [];
let child: ChildProcess | undefined;
let detectedVersion = '';

function json(res: import('node:http').ServerResponse, code: number, value: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' });
  res.end(JSON.stringify(value));
}
function versionNumber(value: string): number { const m = value.match(/(?:b|build\s*)(\d{4,6})/i); return m ? Number(m[1]) : 0; }
async function stop(): Promise<void> {
  const running = child; child = undefined;
  if (!running || running.exitCode !== null) return;
  running.kill('SIGTERM');
  await Promise.race([once(running, 'exit'), new Promise(resolve => setTimeout(resolve, 4000))]);
  if (running.exitCode === null) running.kill('SIGKILL');
}
async function start(): Promise<void> {
  if (child && child.exitCode === null) return;
  if (!binary || !model) throw new Error('Set LLAMA_SERVER_BIN and LLAMA_SERVER_MODEL before starting the runtime host.');
  const probe = spawn(binary, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; probe.stdout?.on('data', b => output += b); probe.stderr?.on('data', b => output += b);
  await Promise.race([once(probe, 'close'), new Promise((_, reject) => setTimeout(() => reject(new Error('llama-server version check timed out')), 5000))]);
  detectedVersion = output.trim();
  if (versionNumber(detectedVersion) < 11960) throw new Error('Live voice requires llama.cpp build b11960 or newer.');
  const args = ['--model', model, '--alias', 'lfm3-omni', '--host', host, '--port', String(upstreamPort), ...extraArgs];
  child = spawn(binary, args, { stdio: 'ignore' });
  const process = child;
  process.once('error', error => { if (child === process) child = undefined; console.error('llama-server failed:', error); });
  process.once('exit', () => { if (child === process) child = undefined; });
  await new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 30_000;
    const poll = async () => {
      try { const response = await fetch(`http://${host}:${upstreamPort}/health`); if (response.ok) return resolve(); } catch { /* wait for server startup */ }
      if (process.exitCode !== null) return reject(new Error('llama-server exited during startup'));
      if (Date.now() > deadline) return reject(new Error('llama-server did not become ready within 30 seconds'));
      setTimeout(poll, 250);
    };
    poll();
  }).catch(async error => { await stop(); throw error; });
}

const server = createServer(async (req: IncomingMessage, res) => {
  if (req.headers.origin && req.headers.origin !== allowedOrigin) return json(res, 403, { error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && req.url === '/runtime') return json(res, 200, { available: Boolean(child && child.exitCode === null), version: detectedVersion });
  if (req.method === 'POST' && req.url === '/start') {
    try { await start(); return json(res, 200, { available: true, version: detectedVersion }); }
    catch (error) { return json(res, 503, { error: error instanceof Error ? error.message : String(error) }); }
  }
  if (req.method === 'POST' && req.url === '/stop') { await stop(); return json(res, 200, { available: false, version: detectedVersion }); }
  return json(res, 404, { error: 'Not found' });
});
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', `http://${host}`);
  if (req.headers.origin !== allowedOrigin || url.pathname !== '/v1/realtime' || !child || child.exitCode !== null) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, client => {
    const upstream = new WebSocket(`ws://${host}:${upstreamPort}${req.url}`, { headers: { host } });
    const pending: { data: WebSocket.RawData; binary: boolean }[] = [];
    const close = () => { if (client.readyState < WebSocket.CLOSING) client.close(); if (upstream.readyState < WebSocket.CLOSING) upstream.close(); };
    upstream.on('open', () => { for (const frame of pending.splice(0)) upstream.send(frame.data, { binary: frame.binary }); });
    client.on('message', (data, isBinary) => {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
      else if (upstream.readyState === WebSocket.CONNECTING) pending.push({ data, binary: isBinary });
    });
    upstream.on('message', (data, isBinary) => { if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary }); });
    client.on('close', close); upstream.on('close', close); client.on('error', close); upstream.on('error', close);
  });
});
server.listen(port, host, () => console.log(`Pi Pocket runtime host listening on http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void stop().finally(() => server.close(() => process.exit(0))); });
