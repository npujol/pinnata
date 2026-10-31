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

## Releases

GitHub Actions runs tests/build on pushes to `main`, then semantic-release analyzes Conventional Commits and creates a GitHub release with a `vX.Y.Z` tag. Each release includes `pinnata-pi-pocket-prebuilt.tar.gz` (built frontend and bundled CommonJS runtime host) plus a SHA-256 checksum. Nix expressions can fetch and unpack these assets without building the project. The app is private and is not published to npm. Preview the next release locally with `npm run release:dry-run` (requires `GITHUB_TOKEN` for a complete GitHub integration run).

Build those assets locally with `npm run build:release`. The archive contains `dist/`, bundled `runtime-host.cjs`, this README, and the license.

### Nix release channel

The release workflow promotes the latest stable `vX.Y.Z` tag reachable from `main` to the `nix-release` branch using a fast-forward-only push. Nix consumers can track that release source as a non-flake input:

```nix
inputs.pinnata = {
  url = "github:npujol/pinnata/nix-release";
  flake = false;
};
```

Run `nix flake update pinnata` in the consuming flake to lock the latest promoted release, then rebuild/apply that flake. The branch contains the tagged source; consumers can build it or use the tagged GitHub release archive.

The development server proxies the same-origin `/router` path to `http://127.0.0.1:8090` to avoid browser CORS issues. Production deployments must provide an equivalent same-origin reverse proxy. Set `VITE_LLAMA_SWAP_URL` at build/dev-server startup only when the chosen endpoint permits browser CORS. The model menu is discovered from `/v1/models`. Known capability metadata is explicit: `lfm3-audio` (transcription/speech), `lfm3-text` (text), `lfm3-vl` (images), `lfm3-omni` (images/audio/live), and `qwen3.6` (images). Unknown IDs are conservatively treated as text-only.

Conversations and confirmed image attachments are stored in browser IndexedDB. Delete a conversation to remove its stored images. Microphone recordings are held temporarily in memory, sent to local `/v1/audio/transcriptions` using `lfm3-audio`, and discarded after transcription; only transcript text is added to the conversation.

## Image and voice behavior

Images accept JPEG, PNG, and WebP. Image-bearing requests are rejected unless the selected model is marked image-capable. Push-to-talk uses browser microphone capture and local transcription. Spoken output is requested through the selected router model; if no audio is returned, the UI reports that spoken output is unsupported.

Live voice is a separate direct `llama-server` WebSocket path (`lfm3-omni`), not routed through llama-swap. Start the included localhost runtime host in a second terminal:

```sh
LLAMA_SERVER_BIN=/path/to/llama-server \
LLAMA_SERVER_MODEL=/path/to/LFM3-Omni.gguf \
npm run runtime-host
```

The host checks the binary version, starts/stops a dedicated server on `127.0.0.1:8092`, exposes its lifecycle API on `127.0.0.1:8093`, and proxies the realtime WebSocket. It only accepts browser requests from `http://127.0.0.1:5173` by default; set `PI_POCKET_ALLOWED_ORIGIN` to the exact origin serving the client when needed. Optional server arguments can be passed as a JSON string in `LLAMA_SERVER_ARGS`. The runtime must be llama.cpp b11960 or newer. Upgrade/configure llama.cpp separately; this repo does not alter nix-darwin settings.
