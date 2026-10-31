export interface RuntimeInfo { version: string; available: boolean }
export function supportsRealtime(version: string): boolean {
  const match = version.match(/(?:b|build\s*)?(\d{4,6})/i);
  return !!match && Number(match[1]) >= 11960;
}

export class LiveVoiceSession {
  private socket?: WebSocket;
  private stream?: MediaStream;
  private audioContext?: AudioContext;
  private processor?: ScriptProcessorNode;
  private controlUrl = 'http://127.0.0.1:8093';
  async start(onMessage: (data: MessageEvent) => void, controlUrl = this.controlUrl): Promise<void> {
    this.controlUrl = controlUrl;
    let response: Response;
    try { response = await fetch(`${controlUrl}/start`, { method: 'POST' }); }
    catch { throw new Error('Live voice unavailable: local llama-server runtime host is not running.'); }
    const runtime = await response.json() as RuntimeInfo & { error?: string };
    if (!response.ok || !runtime.available) throw new Error(runtime.error ?? 'Could not start local llama-server.');
    if (!supportsRealtime(runtime.version)) throw new Error('Live voice requires an available llama.cpp runtime at build b11960 or newer.');
    const url = controlUrl.replace(/^http/, 'ws') + '/v1/realtime?model=lfm3-omni';
    this.socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => { this.socket!.onopen = () => resolve(); this.socket!.onerror = () => reject(new Error('Could not connect to local realtime server')); });
    this.socket.onmessage = onMessage;
    this.socket.send(JSON.stringify({ type: 'session.update', session: { modalities: ['text', 'audio'], input_audio_format: 'pcm16', output_audio_format: 'pcm16', turn_detection: { type: 'server_vad' } } }));
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = event => {
        if (this.socket?.readyState !== WebSocket.OPEN) return;
        const input = event.inputBuffer.getChannelData(0); const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
        let binary = ''; for (const byte of new Uint8Array(pcm.buffer)) binary += String.fromCharCode(byte);
        this.socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(binary) }));
      };
      source.connect(this.processor); this.processor.connect(this.audioContext.destination);
    } catch {
      this.stop();
      throw new Error('Microphone permission denied or live audio capture is unavailable.');
    }
  }
  stop(): void {
    this.processor?.disconnect(); this.processor = undefined;
    this.audioContext?.close(); this.audioContext = undefined;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.socket?.close(); this.socket = undefined;
    void fetch(`${this.controlUrl}/stop`, { method: 'POST' }).catch(() => undefined);
  }
}
