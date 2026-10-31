import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { WebSocket } from 'ws';

const controlPort = 18191;
let host: ChildProcess;
async function waitForHost(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${controlPort}/runtime`)).ok) return; } catch { /* host is starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('runtime host did not start');
}
describe('local llama-server lifecycle host', () => {
  beforeAll(async () => {
    const root = process.cwd();
    host = spawn(resolve(root, 'node_modules/.bin/tsx'), [resolve(root, 'tools/runtime-host.ts')], {
      cwd: root, stdio: 'ignore', env: { ...process.env, PI_POCKET_CONTROL_PORT: String(controlPort), PI_POCKET_LLAMA_PORT: '18192', LLAMA_SERVER_BIN: resolve(root, 'tests/fake-llama-server.mjs'), LLAMA_SERVER_MODEL: 'fixture.gguf' },
    });
    await waitForHost();
  }, 15_000);
  afterAll(async () => { if (host?.exitCode === null) { host.kill('SIGTERM'); await once(host, 'exit'); } });

  it('gates version, starts the server, relays realtime WebSocket frames, and stops it', async () => {
    const started = await fetch(`http://127.0.0.1:${controlPort}/start`, { method: 'POST', signal: AbortSignal.timeout(10_000) });
    expect(started.status).toBe(200);
    expect(await started.json()).toMatchObject({ available: true, version: 'llama.cpp b11960' });
    const message = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${controlPort}/v1/realtime?model=lfm3-omni`, { origin: 'http://127.0.0.1:5173' });
      const timeout = setTimeout(() => reject(new Error('WebSocket relay timed out')), 5_000);
      socket.once('open', () => socket.send('test-frame'));
      socket.once('message', data => { clearTimeout(timeout); resolve(data.toString()); socket.close(); });
      socket.once('error', error => { clearTimeout(timeout); reject(error); });
    });
    expect(message).toBe('test-frame');
    expect((await fetch(`http://127.0.0.1:${controlPort}/stop`, { method: 'POST' })).ok).toBe(true);
    expect(await (await fetch(`http://127.0.0.1:${controlPort}/runtime`)).json()).toMatchObject({ available: false });
  }, 20_000);
});
