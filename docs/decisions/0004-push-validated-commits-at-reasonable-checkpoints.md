---
type: Decision Record
title: Push validated commits at reasonable checkpoints
description: Decision to push validated commits at reasonable checkpoints
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Push validated commits at reasonable checkpoints

## Context

The user requested pushing the current changes and making automatic push behavior a standing rule. The repository now has completed local commits that passed validation, and future MVP work should avoid accumulating unpushed validated work unnecessarily.

## Options Considered


1. Push after every commit automatically.
   - Benefits: Remote is always current.
   - Costs: Can publish overly granular, accidental, or insufficiently reviewed commits.
   - Risks: Higher chance of pushing partial work if a commit is made mid-task.
   - Reversibility: Medium; pushed commits can be reverted, but history is already shared.

2. Push at reasonable validated checkpoints.
   - Benefits: Keeps remote current after completed slices or documentation/process updates while preserving reviewable boundaries.
   - Costs: Requires judgment about what counts as a checkpoint.
   - Risks: A future agent may delay a push if the checkpoint is ambiguous.
   - Reversibility: High; the rule is easy to refine and does not require force-push behavior.

3. Push only when explicitly requested.
   - Benefits: Maximum user control.
   - Costs: Leaves completed validated work local until a follow-up request.
   - Risks: Local commits can be forgotten or unavailable to collaborators.
   - Reversibility: High, but conflicts with the user's requested standing behavior.

## Decision

Option 2: Push committed changes at reasonable checkpoints after relevant validation passes.

## Rationale

This balances the user's request for automatic pushing with repository stewardship. It avoids pushing partial or failing work, but ensures completed validated slices and durable process updates reach the remote promptly.

## Implementation Impact


- Code: No source behavior changes.
- Tests: No test changes required because this is process/documentation-only.
- Fixtures: No fixture changes.
- Documentation: `AGENTS.md` now instructs agents to push at completed, validated checkpoints and not push partial/failing/ambiguous work.
- Follow-up: Apply this rule after future validated commits; do not force-push unless explicitly requested and justified.

## Validation

Run formatting and repository checks before committing the rule, then push the branch.


&copy; 2026 Johan Hellman. All rights reserved.
