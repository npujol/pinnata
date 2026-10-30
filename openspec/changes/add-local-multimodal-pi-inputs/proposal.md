# Proposal

## Why

Pinnata should let users talk to and show images to local Pi models from Pi Pocket. Today the local llama-swap models are available, but Pi Pocket lacks a durable multimodal input flow.

## What Changes

- Add separate push-to-talk transcription and live voice conversation modes.
- Add image capture/selection and route image turns to a vision-capable local model.
- Route Pi Pocket requests through llama-swap, exposing the configured LFM3 family and other local models.
- Keep captured audio temporary; submit the transcript to the durable conversation. Treat image attachments as conversation data and remove them when the conversation is deleted.
- Offer text and spoken responses as separate output choices.

## Capabilities

### New Capabilities
- `voice-interaction`: capture audio, transcribe or converse live, select response modality, and enforce temporary-audio cleanup.
- `image-input`: capture or select images and include them in durable Pi conversation turns.
- `local-model-routing`: select and switch among local llama-swap models from Pi Pocket.

### Modified Capabilities
- None.

## Impact

- New Pi Pocket behavior in Pinnata; the repository currently contains OpenSpec artifacts only, so implementation is greenfield.
- Local llama-swap OpenAI-compatible API at `127.0.0.1:8090`; configured model IDs include `lfm3-audio`, `lfm3-text`, `lfm3-vl`, `lfm3-omni`, and `qwen3.6`.
- macOS microphone/camera permissions and local audio/image handling. Live realtime audio forwarding through llama-swap is not yet verified and must be resolved in design/testing.
