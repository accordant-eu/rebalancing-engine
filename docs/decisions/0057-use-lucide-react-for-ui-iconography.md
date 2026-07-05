---
type: Decision Record
title: Use Lucide-React for UI Iconography
description: Select Lucide-React as the standard icon library for the React web UI.
tags: [architecture, ui, dependencies]
timestamp: 2026-07-03T12:00:00Z
status: Accepted
---

# Use Lucide-React for UI Iconography

## Context

As part of the Tranche 6 UX Aesthetics and Polish initiative, the web application requires a comprehensive set of clean, professional icons to enhance navigation sidebars, buttons, and dashboard metrics. We needed to select a consistent icon library that integrates seamlessly with React and aligns with a professional B2B financial aesthetic.

## Options Considered

### Option 1: Lucide-React
- **Benefits:** Clean, modern stroke-based design. Extremely popular and actively maintained fork of Feather icons. Excellent React support with tree-shaking out of the box. Highly customizable stroke widths and colors via Tailwind text utilities.
- **Costs:** Introduces a new runtime dependency.
- **Risks:** Standard risk of third-party dependency abandonment, though low given its popularity.
- **Reversibility:** Medium. Replacing an icon library across the entire app requires touching many files, but the component-based import syntax (`<IconName />`) makes mechanical refactoring straightforward.

### Option 2: Heroicons
- **Benefits:** Built by the Tailwind CSS team, integrates perfectly with Tailwind workflows.
- **Costs:** Slightly fewer icons available compared to Lucide. The aesthetic is slightly softer/more rounded compared to Lucide's crisp edges.
- **Risks:** Minimal.
- **Reversibility:** Medium.

### Option 3: Raw SVGs
- **Benefits:** Zero dependencies. Maximum control over the bundle.
- **Costs:** High maintenance overhead. Requires manual management of SVG assets and creating wrapper components to make them behave well with Tailwind classes.
- **Risks:** Inconsistency in viewBox, scaling, and stroke widths if SVGs are sourced from multiple places.
- **Reversibility:** High effort to implement initially, but easy to swap individual icons.

## Decision

We will adopt **Lucide-React** as the standard icon library for the web frontend.

## Rationale

Lucide provides the crisp, professional aesthetic required for a serious B2B financial application. The out-of-the-box React components (`<IconName />`) support seamless integration with Tailwind's sizing (`w-5 h-5`) and coloring (`text-gray-500`) utilities. It prevents the overhead of managing raw SVGs while offering a comprehensive enough catalog to avoid needing multiple icon sets.

## Implementation Impact

- **Code:** `web/package.json` will include `lucide-react`. UI components (e.g., `App.tsx`, layout components) will import icons from this library.
- **Tests:** No impact on existing backend/core tests.
- **Fixtures:** None.
- **Documentation:** This decision record is added to the log.

## Follow-up

None.

&copy; 2026 Johan Hellman. All rights reserved.
