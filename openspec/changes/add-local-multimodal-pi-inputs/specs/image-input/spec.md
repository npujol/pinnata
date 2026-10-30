# Spec Delta

## Purpose

Lets users add images from Mac input devices or files to durable local Pi conversations and use models capable of visual understanding.

## ADDED Requirements

### Requirement: Capture or select images
The system SHALL let users capture an image from an available camera or select an image file in Pi Pocket.

#### Scenario: Provide a camera image
- **WHEN** the user captures an image and confirms it
- **THEN** the image is attached to the current conversation input

#### Scenario: Provide an image file
- **WHEN** the user selects a supported image file
- **THEN** the image is attached to the current conversation input

### Requirement: Route image turns to a vision-capable model
The system SHALL submit image-bearing inputs to a selected local model that supports image input.

#### Scenario: Submit an image to a compatible model
- **WHEN** an image-bearing input is submitted with a vision-capable model selected
- **THEN** the model receives the image and the user's accompanying text

#### Scenario: Selected model cannot process images
- **WHEN** an image-bearing input is submitted while a text-only model is selected
- **THEN** the system reports the incompatibility and does not silently discard the image

### Requirement: Preserve images with durable conversation data
The system SHALL retain confirmed image attachments with their conversation and delete them when that conversation is deleted.

#### Scenario: Restore a conversation with an image
- **WHEN** a conversation containing an image is reopened
- **THEN** the image remains available to that conversation
