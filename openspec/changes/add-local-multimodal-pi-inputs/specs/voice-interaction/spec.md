# Spec Delta

## Purpose

Lets users provide microphone input to local Pi conversations through either transcription or live voice, with explicit control over spoken responses and temporary audio handling.

## ADDED Requirements

### Requirement: Push-to-talk transcription
The system SHALL provide a push-to-talk mode that transcribes captured microphone audio locally and submits the transcript as a user input to the selected Pi conversation.

#### Scenario: Submit a completed recording
- **WHEN** the user records and releases push-to-talk
- **THEN** the system transcribes the recording locally and submits the transcript to the selected conversation

### Requirement: Temporary microphone recordings
The system SHALL delete captured audio after transcription or live-session processing completes, including when processing fails or is cancelled.

#### Scenario: Cleanup after successful transcription
- **WHEN** transcription and submission finish
- **THEN** the temporary recording is deleted and the transcript remains in the conversation

#### Scenario: Cleanup after failure or cancellation
- **WHEN** audio processing fails or the user cancels
- **THEN** the temporary recording is deleted and the user receives an error or cancellation result

### Requirement: Live voice mode
The system SHALL offer live microphone conversation as a mode separate from push-to-talk transcription.

#### Scenario: Start and stop live conversation
- **WHEN** the user starts and later ends live voice mode
- **THEN** the system streams microphone input to a local compatible model endpoint and presents the conversation result

### Requirement: Response modality choice
The system SHALL let users choose text-only or spoken responses for voice interactions.

#### Scenario: Choose spoken response
- **WHEN** spoken response is selected and the local model supports speech output
- **THEN** the system plays the generated speech and makes any returned text available

#### Scenario: Spoken output is unsupported
- **WHEN** spoken response is selected but the active endpoint cannot generate speech
- **THEN** the system reports the limitation instead of silently treating the request as successful
