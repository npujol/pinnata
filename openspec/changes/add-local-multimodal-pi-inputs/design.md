# Design

## Context

See proposal.md - Why. Pinnata currently contains OpenSpec artifacts only. The user's Mac exposes llama-swap at `127.0.0.1:8090` with LFM3 audio, text, vision, and omni model IDs. Multipart audio transcription through `lfm3-audio` has been verified. The installed llama.cpp build is b11669, below the LFM3 audio/omni documentation's b11960 baseline; a companion nix-darwin change must upgrade it before full modality verification. llama-swap documents audio transcription and speech endpoints but does not currently document `/v1/realtime` WebSocket proxying.

## Goals / Non-Goals

**Goals:**
- Implement Pi Pocket as a local-first web client for the specified modalities and model selection.
- Keep normal model calls behind llama-swap and preserve durable transcripts/image attachments.
- Provide a separately selectable live voice path without pretending it is supported by the current router.

**Non-Goals:**
- Change Pi CLI or nix-darwin configuration in this change; those belong to a companion change in nix-darwin.
- Send prompts, recordings, or images to remote model providers.

## Decisions

- Build the Pi Pocket client and API/model adapter in TypeScript, matching Pi's existing extension ecosystem; keep hardware capture in browser-only modules. A native macOS app would duplicate the target UI and permission layer. Use browser media APIs for microphone/camera access and file selection. Initially accept JPEG, PNG, and WebP; reject unsupported formats with a clear message rather than silently converting them.
- Push-to-talk records locally, posts the temporary recording to `/v1/audio/transcriptions` with model `lfm3-audio`, and submits the returned transcript to the durable conversation. Delete the temporary file in a `finally` cleanup path. The transcript, not the audio, is durable.
- Store confirmed images as durable conversation attachments and put only their references in conversation entries; delete attachments with their conversation. This follows the durable-conversation model without embedding image bytes in JSON.
- Discover model IDs from llama-swap `/v1/models` and maintain explicit per-model modality metadata in the client. The current router response does not reliably advertise audio/vision capabilities, so infer nothing from missing metadata.
- Use llama-swap for regular text, image, transcription, and supported speech requests. Offer text and spoken output as separate choices; show a clear unsupported/error state if the selected route cannot synthesize speech.
- Implement live voice as a distinct direct WebSocket connection to a local `llama-server` running an LFM3 realtime-capable model (default `lfm3-omni`). Do not proxy it through llama-swap until WebSocket support is verified upstream. Start/stop that server as a managed local process and show a clear unavailable state if the required b11960+ runtime is absent.
- Keep the web client transport behind an adapter so the direct realtime endpoint can be replaced by llama-swap if it gains safe WebSocket model routing.

## Risks / Trade-offs

- [Realtime model runs outside llama-swap model swapping] -> Keep it as an explicit mode with a pinned model and managed lifecycle; never silently fall back from the router.
- [Older llama.cpp may accept basic ASR while lacking newer multimodal/realtime support] -> Gate live mode on runtime version and verify all four LFM3 routes after the companion upgrade.
- [Browser mic/camera permissions vary by origin] -> Serve the client on localhost or another secure context and explain denied permissions in the UI.
- [Durable image storage increases local disk use] -> Keep attachments scoped to conversations and remove them when conversations are deleted.

## Migration Plan

No user data migration is needed for the greenfield Pinnata client. Require the companion nix-darwin change to provide llama.cpp b11960+ and route regular Pi model requests to llama-swap at port 8090 before enabling local multimodal controls. Rollback by disabling the new controls/client; existing Pi CLI and llama-swap behavior remains unchanged.
