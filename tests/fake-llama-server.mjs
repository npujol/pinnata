#!/usr/bin/env node
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
if (process.argv.includes('--version')) { console.log(process.env.FAKE_LLAMA_VERSION ?? 'llama.cpp b11960'); process.exit(0); }
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
const server = createServer((req, res) => { if (req.url === '/health') { res.writeHead(200).end('ok'); return; } res.writeHead(404).end(); });
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => wss.handleUpgrade(req, socket, head, ws => ws.on('message', message => ws.send(message))));
server.listen(port, '127.0.0.1');
