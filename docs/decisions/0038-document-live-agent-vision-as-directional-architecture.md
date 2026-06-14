---
type: Decision Record
title: Document live-agent vision as directional architecture
description: Decision to document live-agent vision as directional architecture
tags: [architecture]
timestamp: 2026-06-14T00:00:00Z
status: Accepted
---

# Document live-agent vision as directional architecture

## Context

The owner clarified that the project direction is toward a live autonomous agent, not a permanently offline module. The engine would run as part of a pipeline with real-time price feeds, live position sync from a broker, continuous monitoring, and automated trade execution.

## Options Considered


1. Document the vision without changing the current architecture boundary.
   - Benefits: Informs future decisions; prevents conflicting choices.
   - Costs: No immediate functional change.
   - Risks: Vision may evolve as concrete integration work begins.
   - Reversibility: High.

2. Begin implementing the agent/orchestrator layer now.
   - Benefits: Faster path to live operation.
   - Costs: Premature without concrete broker API integration work.
   - Risks: Speculative architecture.

## Decision
 Option 1.

## Rationale

The vision is directional, not a PRD. Documenting it now prevents the engine from making choices (like scheduled-flow cash inflation) that conflict with the eventual operating model. The existing production-boundary deferral remains valid — the agent/orchestrator is a separate system that calls the engine.
