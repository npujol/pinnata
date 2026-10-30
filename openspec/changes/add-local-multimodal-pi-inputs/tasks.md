# Tasks

## 1. Pi Pocket foundation

- [ ] 1.1 Scaffold the TypeScript Pi Pocket client and verify its development and production builds.
- [ ] 1.2 Add local configuration for the llama-swap base URL and verify startup fails visibly when the local endpoint is unavailable.

## 2. Local model routing

- [ ] 2.1 Implement model discovery, capability metadata, and per-conversation selection for `lfm3-audio`, `lfm3-text`, `lfm3-vl`, `lfm3-omni`, and `qwen3.6`; verify model-list and selection tests.
- [ ] 2.2 Route requests only to the selected local model and document configuration; verify no remote fallback on connection errors.

## 3. Image input

- [ ] 3.1 Implement camera capture and JPEG/PNG/WebP file selection with permission and unsupported-format states; verify browser tests.
- [ ] 3.2 Persist image attachments with durable conversation references and route them to vision-capable models; verify restore, deletion, and image-request tests.

## 4. Push-to-talk transcription

- [ ] 4.1 Implement browser microphone capture and push-to-talk controls; verify permission-denied, cancel, and completed-recording tests.
- [ ] 4.2 Submit recordings to local `/v1/audio/transcriptions` with `lfm3-audio`, commit transcript text as a conversation submission, and delete audio on success/failure/cancel; verify cleanup and transcription tests.

## 5. Live voice and speech output

- [ ] 5.1 Implement a separately managed direct `llama-server` WebSocket session for LFM3-Omni, gated on llama.cpp b11960 or newer; verify start, stream, stop, and unavailable-runtime tests.
- [ ] 5.2 Add separate text and spoken-response choices and verify spoken output or an explicit unsupported/error state; document live mode's direct-server routing.

## 6. Integration verification

- [ ] 6.1 Run the complete test suite and production build; verify Pi Pocket can switch among local models and complete image, transcription, live voice, and response-modality flows.
