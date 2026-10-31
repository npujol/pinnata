# Pi Pocket

A local-first browser client for conversations routed through llama-swap. The app sends requests only to the configured local endpoint; it has no remote-provider integration or fallback.

## Requirements

- Node.js 20+
- llama-swap exposing its OpenAI-compatible API (default: `http://127.0.0.1:8090`)
- A secure browser context (`localhost` is supported) for camera/microphone permissions

## Setup

```sh
npm install
npm run dev
```

Production build: `npm run build`; tests: `npm test`.

Set `VITE_LLAMA_SWAP_URL` at build/dev-server startup to override the local router URL. The model menu is discovered from `/v1/models`. Known capability metadata is explicit: `lfm3-audio` (transcription/speech), `lfm3-text` (text), `lfm3-vl` (images), `lfm3-omni` (images/audio/live), and `qwen3.6` (images). Unknown IDs are conservatively treated as text-only.

Conversations and confirmed image attachments are stored in browser IndexedDB. Delete a conversation to remove its stored images. Microphone recordings are held temporarily in memory, sent to local `/v1/audio/transcriptions` using `lfm3-audio`, and discarded after transcription; only transcript text is added to the conversation.

## Image and voice behavior

Images accept JPEG, PNG, and WebP. Image-bearing requests are rejected unless the selected model is marked image-capable. Push-to-talk uses browser microphone capture and local transcription. Spoken output is requested through the selected router model; if no audio is returned, the UI reports that spoken output is unsupported.

Live voice is a separate direct `llama-server` WebSocket path (`lfm3-omni`), not routed through llama-swap. It expects a local runtime-control endpoint at `http://127.0.0.1:8091/runtime` returning `{ "available": true, "version": "b11960" }`, and a WebSocket endpoint at `/v1/realtime`. The runtime must be llama.cpp b11960 or newer. The runtime-control/managed-process host is not included in this client; until it is provided, live voice reports unavailable. Upgrade/configure llama.cpp separately; this repo does not alter nix-darwin settings.
