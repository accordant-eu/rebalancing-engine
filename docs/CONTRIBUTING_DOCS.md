---
type: Guide
title: Documentation Conventions (OKF)
description: How to maintain the Open Knowledge Format (OKF) bundle and Architecture Decision Records (ADRs).
tags: [process, documentation, okf, adr]
timestamp: 2026-06-14T00:00:00Z
---

# Documentation Conventions

This project's `docs/` directory is an [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle. This structure ensures our documentation is readable by humans, parseable by AI agents, and organized for progressive disclosure.

## 1. OKF Frontmatter

Every markdown file inside `docs/` (except `index.md` and `log.md`) MUST begin with YAML frontmatter containing at minimum the `type` field.

**Example:**
```yaml
---
type: Guide
title: Developer Guide
description: Setup and conventions for local development.
tags: [developer, setup, process]
timestamp: 2026-06-14T00:00:00Z
---
```

**Common types used in this project:**
- `Architecture` (for high-level system boundaries and visions)
- `PRD` (for feature requirements)
- `Implementation Plan` (for structured execution plans)
- `Audit` (for security/feature completeness reviews)
- `Decision Record` (for ADRs)
- `Guide` (for how-to content)
- `Reference` (for static lookups, like CLI commands)

## 2. Index and Log Files

### `index.md` (Progressive Disclosure)
Every subdirectory inside `docs/` must contain an `index.md` file. It should contain a bulleted list of the documents in that directory, with links and their one-line description from frontmatter.

When you add or remove a document, update the corresponding `index.md`.

### `log.md` (Update History)
The root `docs/log.md` file tracks substantive documentation updates across the bundle. Add a short entry there for major new documents or restructuring.

## 3. Architecture Decision Records (ADRs)

We use ADRs to capture meaningful decisions (per the Decision Discipline rule in `AGENTS.md`). ADRs live in `docs/decisions/` and are sequentially numbered.

**To add a new decision:**
1. Check `docs/decisions/` for the current highest ADR number.
2. Create a new file (e.g., `0043-my-new-decision.md`).
3. Copy the contents of `docs/decisions/TEMPLATE.md` into the new file.
4. Fill out the frontmatter and sections.
5. Update `docs/decisions/index.md` to link to the new ADR.
6. If appropriate, add a row linking to the ADR in `BUILD_JOURNEY.md`'s Decisions Log table.

## 4. Root-Level Files

Files at the root of the repository (`README.md`, `BUILD_JOURNEY.md`, `AGENTS.md`) sit *outside* the OKF bundle. They serve different audiences (like the GitHub landing page or agent initialization).

- Do **not** add OKF frontmatter to root-level files.
- `BUILD_JOURNEY.md` captures iteration summaries but does not hold detailed decision records.
- Root files should link into `docs/` where appropriate.

## 5. Validation

A CI script validates that the documentation adheres to these rules. Run it locally before pushing:

```bash
./scripts/validate-docs.sh
```


&copy; 2026 Johan Hellman. All rights reserved.
