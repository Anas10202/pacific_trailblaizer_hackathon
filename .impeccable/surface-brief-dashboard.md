# Surface brief — Mission Control Dashboard

**Target:** `frontend/src/pages/Overview.jsx` + `frontend/src/App.jsx`
**Mode:** Operate
**Seed key:** b6fd5d0e (user overrode roll with explicit choice)

## Direction contract

**THESIS:** A celestial atlas where every return is a catalog object. The operator reads the sky — a coordinate-gridded deep navy field — not a generic AI dashboard. Refuses the scattered-status-on-dark-card arrangement every ops tool ships; also refuses the "dark blue with neon glowing edges" AI cluster.

**OWN-WORLD:** Deep navy `#0A0E2A` ground, `72×72px` coordinate grid at 5.5% opacity in blue-white. Elevated panels in `#12183A`. Text in cool white `#E8EDF8`. Status colors are stellar spectral classes: amber `#F5A020` (K-type, flagged/pending), cyan `#00C8E8` (A-type, approved), rose `#FF4B6A` (M-type, declined). Violet `#6840FF` is the AI/agent system color only — logo, AI insights panel accent, agent chat bubbles, escalation badges, re-evaluate button. Space Grotesk tracked caps for all section labels; Inter tabular for data values. No glow, no blur on surfaces (nav bar only for backdrop-filter if needed), no glassmorphism.

**STORY:** Operator lands → reads KPI strip (4 spectral-class counters) → scans return rows as catalog entries → consults AI sidebar as observation log → drills into detail via modal → optionally opens chat. Each layer has one job; no layer competes with another.

**FIRST VIEWPORT:** Nav bar in `#12183A` with coordinate-tick border. Below: page title left, live agent count right. KPI bar: 4 equal tiles, one per spectral status — amber/violet/cyan/rose — numbers at 34px, labels at 10px tracked caps. 2-column grid: returns table (1fr, `#12183A` card with `#2A3260` border) and AI sidebar (300px, `#0C1028` with violet border/glow). Below conditional: escalation + declined panels.

**FORM:** Celestial atlas / star catalog. Position 2 of grounded list (user override). Seed key `b6fd5d0e`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
