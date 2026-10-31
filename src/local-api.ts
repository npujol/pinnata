import type { ModelId } from './models';

const DEFAULT_BASE_URL = '/router';
export const baseUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_LLAMA_SWAP_URL || DEFAULT_BASE_URL;

export class LocalApi {
  constructor(readonly url = baseUrl, private readonly request: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    let response: Response;
    try { response = await this.request(`${this.url.replace(/\/$/, '')}${path}`, init); }
    catch (error) { throw new Error(`Cannot reach local llama-swap at ${this.url}: ${String(error)}. Check that it is running. No remote fallback is configured.`); }
    if (!response.ok) throw new Error(`Local llama-swap request failed (${response.status})`);
    return response;
  }

  async check(): Promise<void> { await this.fetch('/v1/models'); }
  async models(): Promise<ModelId[]> {
    const data = await (await this.fetch('/v1/models')).json() as { data?: { id: string }[] };
    return (data.data ?? []).map(({ id }) => id);
  }

  async chat(model: string, messages: { role: string; content: unknown }[], spoken = false): Promise<{ text: string; audio?: string }> {
    const response = await this.fetch('/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, modalities: spoken ? ['text', 'audio'] : ['text'], ...(spoken ? { audio: { voice: 'alloy', format: 'wav' } } : {}) }),
    });
    const data = await response.json() as { choices?: { message?: { content?: string; audio?: { data?: string } } }[] };
    const message = data.choices?.[0]?.message;
    return { text: message?.content ?? '', audio: message?.audio?.data };
  }

  async transcribe(blob: Blob): Promise<string> {
    const form = new FormData();
    form.append('file', blob, 'recording.webm'); form.append('model', 'lfm3-audio');
    const response = await this.fetch('/v1/audio/transcriptions', { method: 'POST', body: form });
    const result = await response.json() as { text?: string };
    if (!result.text) throw new Error('Local transcription returned no text');
    return result.text;
  }
}
