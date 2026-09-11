# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: hackathon judges and evaluators at the Pacific Trailblazer hackathon. The demo is the product — the audience is a panel assessing innovation, technical execution, and design quality, not real-world retail operators. A single pre-seeded demo customer persona supports the customer-facing portal side of the demo.

## Product Purpose

Cosmic Mart Mission Control is a demonstration platform showing how a multi-agent AI system can automate retail operations decisions — specifically product return requests — while keeping human operators informed, in control, and able to intervene. The platform exists to prove that AI-driven operations tooling can be both technically impressive and beautifully usable.

Success means: a judge who opens the dashboard immediately understands what is happening, trusts the AI decisions on screen, and walks away convinced that this is a credible, shippable direction for AI-assisted retail ops.

## Positioning

The meaningfully different mechanism is the multi-agent orchestration architecture (smolagents + Claude Haiku) that evaluates returns against a policy ruleset autonomously — approve, decline, or flag — and surfaces its reasoning to the operator through an in-dashboard chat interface. A conventional returns tool routes tickets to humans; Cosmic Mart routes them to agents and brings humans in only when needed.

## Operating Context

The product is demoed live in a hackathon setting. Judges interact directly with the Mission Control dashboard, observe AI agent decisions on pending returns, may trigger re-evaluation of flagged cases, and can see business analytics and voice-of-customer signals. The customer-facing demo app auto-resets on each page load so the demo is always repeatable. The backend runs locally (FastAPI + SQLite); the frontend is served via Vite.

Two surfaces:
- **Mission Control Dashboard** — operator view: returns queue with AI decisions, per-return agent chat, AI Insights panel (risk, fraud, escalations, policy violations), and analytics tabs (Customers, Inventory, VOC, Scenarios).
- **Customer Demo App** (`cosmic-customer-demo.html`) — customer-facing returns portal for the pre-seeded demo persona.

## Capabilities and Constraints

- Agent system: `orchestrator_agent` delegates to `customer_agent` (returns/support/VOC), `operations_agent` (inventory/reorders), and `analytics_agent` (loyalty/CSAT/market data).
- LLM: `claude-haiku-4-5-20251001` via Vocareum API proxy (not direct Anthropic API).
- Persistence: SQLite (`cosmic_mart.db`); single demo customer (ID 1) pre-seeded.
- Frontend: React 19 + Vite, no TypeScript, no CSS framework — all styles are inline.
- No active React Router routing in production; `App.jsx` renders `Overview` directly.
- `react-router-dom` is installed but not wired — this is an undecided technical constraint.
- Accessibility coverage is minimal (some aria-labels on close buttons; no skip-nav, no ARIA roles on main structures).
- Desktop-first, max-width 1320px — no responsive breakpoints. Mobile is out of scope for this demo.

## Brand Commitments

- **Name locked:** "Cosmic Mart" — do not rename or abbreviate.
- **Theme locked:** space/astronomy concept — the aesthetic language (dark space, cosmic scale, mission control framing) is non-negotiable.
- **Logo:** inline SVG rocket/pin in `App.jsx` — treat as locked unless redesign is explicitly requested.
- **Visual details flexible:** color palette, typography, spacing, component design, and layout can evolve within the space theme.
- **Product naming convention:** all products follow the space-brand pattern (AstroSpeaker, Nebula Headphones, StarPad Pro, etc.) — preserve in copy.
- Page title: "Cosmic Mart · Mission Control" — locked.

## Evidence on Hand

- Working live demo with real agent decisions on seeded return requests.
- Synthetic product catalog (10 SKUs, all space-branded).
- Pre-seeded customer and orders for repeatable demo flow.
- Uvicorn and Vite log files at repo root confirm both servers are used concurrently.
- No real customer data, no real transactions — all synthetic.
- No press, testimonials, or external evidence to draw on.

## Product Principles

1. **AI decisions must feel trustworthy.** Operators see the agent's reasoning — not just an outcome — through in-dashboard chat and an Insights panel. Opacity is a design failure.
2. **Impressive in seconds.** The dashboard is a demo, not a daily tool. Every screen must communicate its value to a judge who has five seconds of attention to give. High signal, low noise.
3. **Human oversight is visible.** AI autonomy and human control coexist. The operator is always one click away from reviewing, overriding, or chatting with the agent. The interface never hides the AI behind the result.
4. **The space theme earns its presence.** The cosmic framing is not decoration — it sets the ambition level. Design should feel like mission control, not a generic SaaS dashboard.
5. **Demo integrity over completeness.** Every interaction must be repeatable and recoverable. The demo resets, the agents re-run, and nothing breaks mid-presentation.

## Accessibility & Inclusion

No product-specific accessibility requirement was established. The current implementation has minimal coverage (some `aria-label` usage). Mobile and responsive design are explicitly out of scope for the demo.
