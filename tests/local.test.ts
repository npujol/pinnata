import { describe, expect, it, vi } from 'vitest';
import { capabilitiesFor, chooseModel } from '../src/models';
import { LocalApi } from '../src/local-api';
import { supportsRealtime } from '../src/live-voice';

describe('local model routing', () => {
  it('discovers router model IDs', async () => {
    const api = new LocalApi('http://localhost:8090', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'lfm3-vl' }, { id: 'qwen3.6' }] }))));
    expect(await api.models()).toEqual(['lfm3-vl', 'qwen3.6']);
  });
  it('only allows selecting discovered IDs', () => {
    expect(chooseModel(['lfm3-text', 'lfm3-vl'], 'lfm3-text', 'lfm3-vl')).toBe('lfm3-vl');
    expect(() => chooseModel(['lfm3-text'], 'lfm3-text', 'unknown')).toThrow('not available');
  });
  it('declares known image capabilities, not guessed capabilities', () => {
    expect(capabilitiesFor('lfm3-vl').image).toBe(true);
    expect(capabilitiesFor('unknown').image).toBe(false);
  });
  it('never falls back to a remote provider when disconnected', async () => {
    const api = new LocalApi('http://localhost:8090', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(api.models()).rejects.toThrow('No remote fallback');
  });
});

describe('realtime runtime gate', () => {
  it('requires llama.cpp build b11960 or newer', () => {
    expect(supportsRealtime('b11669')).toBe(false);
    expect(supportsRealtime('b11960')).toBe(true);
    expect(supportsRealtime('b12000')).toBe(true);
  });
});
