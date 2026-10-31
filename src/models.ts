export type ModelId = 'lfm3-audio' | 'lfm3-text' | 'lfm3-vl' | 'lfm3-omni' | 'qwen3.6' | string;

export interface ModelCapabilities {
  image: boolean;
  transcription: boolean;
  speech: boolean;
  live: boolean;
}

export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'lfm3-audio': { image: false, transcription: true, speech: true, live: false },
  'lfm3-text': { image: false, transcription: false, speech: false, live: false },
  'lfm3-vl': { image: true, transcription: false, speech: false, live: false },
  'lfm3-omni': { image: true, transcription: true, speech: true, live: true },
  'qwen3.6': { image: true, transcription: false, speech: false, live: false },
};

export interface Conversation { id: string; title: string; model: string; messages: Message[] }
export interface Message { id: string; role: 'user' | 'assistant'; text: string; images?: string[] }

export function capabilitiesFor(model: string): ModelCapabilities {
  return MODEL_CAPABILITIES[model] ?? { image: false, transcription: false, speech: false, live: false };
}

export function chooseModel(models: string[], current: string | undefined, selected: string): string {
  if (!models.includes(selected)) throw new Error(`Model ${selected} is not available from the local router`);
  if (!current || current !== selected) return selected;
  return current;
}
