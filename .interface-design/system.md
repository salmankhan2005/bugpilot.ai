# BugPilot interface patterns

## Direction

BugPilot is a focused QA workbench for engineers reviewing browser runs, observed routes, and actionable findings. Keep the existing achromatic ledger direction: calm, technical, dense enough for investigation, with color reserved for status and severity. Preserve the shared app shell and project navigation; do not recreate them inside feature pages.

## Visual system

- Use the existing theme tokens for surfaces, text, borders, and semantic colors. Keep cards on the app's neutral surfaces with quiet borders and no decorative shadows or gradients.
- Use a 4px spacing rhythm. Overview content uses 18px section gaps and 28px horizontal padding on desktop; cards use 18px padding. At narrow widths, reduce these to 14px.
- Use the existing typeface. Establish hierarchy with weight and color before increasing size: panel headings 15px/600, supporting text 12px, metadata 11px, and prominent metrics 24px/600 with tabular numerals.
- Keep error, loading, and empty states explicit. Use accessible names for charts, visible legends, and semantic links/buttons.

## Overview

- Lead with a compact four-column metric strip: runs recorded, active runs, findings to review, and observed routes. Collapse to two columns on narrow screens.
- Follow with a month-to-date weekly run-throughput chart using actual `startedAt` and completed `finishedAt` timestamps. Start the x-axis on the first of the current month (not the previous month). The current runs endpoint is capped at 100 records; label that scope and show an explicit empty state when the window has no activity.
- Use the project-wide dashboard severity counts for the finding-priority donut. The open-finding list is capped to the latest 100 records, so label that list separately and never imply it is the full queue.
- Pair recent runs and persisted activity with route observations. Routes represent browser visits, not source-code coverage. Do not invent team members, avatars, project progress, or due dates for this single-project dashboard.
- Keep the priority note actionable and based on the exact dashboard counts. Use semantic severity colors only for status and findings.
- Reuse existing links, badges, cards, and chart dependencies; keep this presentation frontend-only unless a separately approved data requirement calls for an API change.

## Landing and sign-in

- The public landing page uses a centered, monochrome hero above a framed BugPilot run-room preview. The signature is the browser evidence view: captured viewport, event timeline, and linked finding in one window.
- Use a pure black canvas, soft neutral type, and a cyan-to-violet edge only on the primary action. Keep the product preview clearly marked illustrative; never present sample runs as a visitor's live data.
- Below the preview, use factual capability statements rather than customer logos or unsupported social proof. Keep the run scope and local-worker limits explicit.
- Match sign-in and sign-up to the landing page's black surfaces and neutral typography. Reserve the cyan-violet outline for the primary form action; preserve all Firebase auth, reset, and redirect behavior.
- A restrained gray radial wash may sit behind the centered landing hero, fading out before the page sections; keep the run preview crisp and avoid extra gradients or glows competing with it.
