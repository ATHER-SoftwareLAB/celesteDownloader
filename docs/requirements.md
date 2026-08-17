# Celeste Downloader - Requirements

## Overview
Simple, beautiful YouTube downloader with verification & session history.

## Functional Requirements
- **FR1**: Accept YouTube URL input
- **FR2**: Fetch video metadata (title, duration, uploader, thumbnail)
- **FR3**: Download video in selected quality (720p, 1080p, audio)
- **FR4**: Verify download via SHA-256 hash
- **FR5**: Display real-time progress (speed, ETA)
- **FR6**: Show session-only download history
- **FR7**: Settings: default path, quality preference
- **FR8**: Legal modals (License, Terms) on first launch

## Non-Functional Requirements
- **NFR1**: Download verification must complete within 5s for typical videos
- **NFR2**: UI must respond in <100ms to user input
- **NFR3**: Packaged as standalone .exe (Windows) + AppImage (Linux)
- **NFR4**: Must work offline for cached videos

## Constraints
- No persistent database (session only)
- No complex logging or telemetry
- Must respect YouTube ToS
