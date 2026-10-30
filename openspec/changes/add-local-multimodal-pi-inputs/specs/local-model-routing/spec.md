# Spec Delta

## Purpose

Lets Pi Pocket discover and select local models through the user's llama-swap endpoint.

## ADDED Requirements

### Requirement: Discover configured local models
The system SHALL obtain available model IDs from the configured llama-swap OpenAI-compatible endpoint and present them for selection in Pi Pocket.

#### Scenario: Router is available
- **WHEN** a client connects to the configured local endpoint
- **THEN** it lists the model IDs reported by the router

#### Scenario: Router is unavailable
- **WHEN** a client cannot reach the configured local endpoint
- **THEN** it reports the connection failure and does not silently route the request to a remote provider

### Requirement: Select and switch local models
The system SHALL let users select a discovered local model for a conversation and switch models between requests.

#### Scenario: Switch model
- **WHEN** the user selects a different discovered model
- **THEN** subsequent requests use that model ID through the local router
