import { afterEach, describe, expect, it, vi } from 'vitest';
import { PushToTalk, validateImage } from '../src/media';

afterEach(() => vi.unstubAllGlobals());

describe('image input', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', type => {
    expect(() => validateImage(new File(['pixels'], 'image', { type }))).not.toThrow();
  });
  it('rejects unsupported types', () => {
    expect(() => validateImage(new File(['pixels'], 'image.gif', { type: 'image/gif' }))).toThrow('Unsupported image format');
  });
});

describe('push-to-talk capture cleanup', () => {
  const setup = (permission?: () => Promise<MediaStream>) => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    class Recorder {
      state = 'inactive'; mimeType = 'audio/webm'; stream: MediaStream;
      ondataavailable?: (event: { data: Blob }) => void;
      onstop?: () => void;
      onerror?: () => void;
      constructor(source: MediaStream) { this.stream = source; }
      start(): void { this.state = 'recording'; this.ondataavailable?.({ data: new Blob(['audio']) }); }
      stop(): void { this.state = 'inactive'; this.onstop?.(); }
    }
    vi.stubGlobal('MediaRecorder', Recorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: permission ?? (async () => stream) } });
    return { track };
  };

  it('reports permission denial', async () => {
    setup(async () => { throw new Error('denied'); });
    await expect(new PushToTalk().start()).rejects.toThrow('Microphone permission denied');
  });
  it('stops the microphone track when cancelled', async () => {
    const { track } = setup(); const capture = new PushToTalk();
    await capture.start(); capture.cancel();
    expect(track.stop).toHaveBeenCalledOnce();
  });
  it('returns a completed recording and releases microphone tracks', async () => {
    const { track } = setup(); const capture = new PushToTalk();
    await capture.start(); const recording = await capture.stop();
    expect(recording.size).toBeGreaterThan(0); expect(track.stop).toHaveBeenCalledOnce();
  });
});
