export interface RuntimeInfo { version: string; available: boolean }
export function supportsRealtime(version: string): boolean {
  const match = version.match(/(?:b|build\s*)?(\d{4,6})/i);
  return !!match && Number(match[1]) >= 11960;
}

export class LiveVoiceSession {
  private socket?: WebSocket;
  async checkRuntime(controlUrl = 'http://127.0.0.1:8091'): Promise<RuntimeInfo> {
    let response: Response;
    try { response = await fetch(`${controlUrl}/runtime`); }
    catch { throw new Error('Live voice unavailable: local llama-server runtime control is not running.'); }
    if (!response.ok) throw new Error(`Live voice runtime check failed (${response.status})`);
    const info = await response.json() as { version: string; available: boolean };
    if (!info.available || !supportsRealtime(info.version)) throw new Error('Live voice requires an available llama.cpp runtime at build b11960 or newer.');
    return info;
  }
  async start(onMessage: (data: MessageEvent) => void, controlUrl = 'http://127.0.0.1:8091'): Promise<void> {
    await this.checkRuntime(controlUrl);
    const url = controlUrl.replace(/^http/, 'ws') + '/v1/realtime?model=lfm3-omni';
    this.socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => { this.socket!.onopen = () => resolve(); this.socket!.onerror = () => reject(new Error('Could not connect to local realtime server')); });
    this.socket.onmessage = onMessage;
  }
  send(data: string | ArrayBuffer): void { if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('Live voice session is not connected'); this.socket.send(data); }
  stop(): void { this.socket?.close(); this.socket = undefined; }
}
