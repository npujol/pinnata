export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function validateImage(file: File): void {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Unsupported image format. Choose a JPEG, PNG, or WebP image.');
}
export async function captureImage(): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => { throw new Error('Camera permission denied or no camera is available.'); });
  try {
    const video = document.createElement('video'); video.srcObject = stream;
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('Camera preview failed')); });
    await video.play();
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Camera capture failed')), 'image/jpeg'));
  } finally { stream.getTracks().forEach(track => track.stop()); }
}

export class PushToTalk {
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  async start(): Promise<void> {
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); this.recorder = new MediaRecorder(stream); this.chunks = []; this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); }; this.recorder.start(); }
    catch { throw new Error('Microphone permission denied or no microphone is available.'); }
  }
  async stop(): Promise<Blob> {
    const recorder = this.recorder;
    if (!recorder) throw new Error('No recording is active');
    const blob = await new Promise<Blob>((resolve, reject) => { recorder.onstop = () => resolve(new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' })); recorder.onerror = () => reject(new Error('Microphone recording failed')); recorder.stop(); });
    recorder.stream.getTracks().forEach(track => track.stop()); this.recorder = undefined; this.chunks = []; return blob;
  }
  cancel(): void { if (this.recorder?.state !== 'inactive') this.recorder?.stop(); this.recorder?.stream.getTracks().forEach(track => track.stop()); this.recorder = undefined; this.chunks = []; }
}
