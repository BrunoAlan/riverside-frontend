# Riverside Frontend

Next.js frontend for the Riverside voice agent. Built on top of [LiveKit Agents](https://docs.livekit.io/agents) and the [Agents UI](https://livekit.io/ui) component library, with Riverside branding and product layer on top.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS** + **shadcn/ui**
- **LiveKit JavaScript SDK** for real-time voice / video transport
- **Agents UI** components from the LiveKit shadcn registry

## Features

- Real-time voice interaction with a Riverside agent
- Camera + screen-share support
- Multiple audio visualizer styles (`bar`, `grid`, `radial`, `wave`, `aura`)
- Chat transcript with text input
- Branding, colors, and copy configurable from a single file (`app-config.ts`)

## Project structure

```
riverside-frontend/
├── app/                  - Next.js App Router (routes, layout, OG image, API)
│   ├── (design-system)/  - /design-system route: shadcn primitives showcase
│   ├── agent/            - /agent route: the voice session UI
│   └── api/token/        - Mints LiveKit access tokens server-side
├── components/
│   ├── layout/           - App shell: root composition, providers, view controller
│   ├── agent-ui/         - Agent-driven views the backend can switch between
│   ├── panels/           - Reusable content panels (map, cabin cards, etc.)
│   ├── chat/             - Chat transcript + input
│   ├── home/             - Welcome/landing UI
│   ├── livekit/          - Thin wrappers over @livekit/components-react
│   ├── ai-elements/      - AI Elements components (chat conversation)
│   └── ui/               - shadcn/ui primitives
├── hooks/                - Cross-cutting React hooks (kebab-case)
├── lib/
│   ├── agent-ui/         - Logic for agent-driven UI (transport, store, types)
│   ├── dev/              - Dev-only UI (DevPanel + view mocks)
│   ├── map/              - Map data + clustering helpers
│   └── shadcn/           - shadcn helpers
├── public/               - Static assets (logos, fonts, OG background)
├── styles/
└── app-config.ts         - Branding + feature flags (single source of truth)
```

The shell lives in `components/layout/`. Key files:

| File                    | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `app.tsx`               | Top-level wiring: providers, LiveKit session, dev panel.              |
| `view-controller.tsx`   | Switches between welcome and session views based on connection state. |
| `welcome-view.tsx`      | Pre-connection landing UI.                                            |
| `window-background.tsx` | Backdrop layer behind agent-driven views.                             |

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your LiveKit credentials:

```env
LIVEKIT_API_KEY=<your_api_key>
LIVEKIT_API_SECRET=<your_api_secret>
LIVEKIT_URL=wss://<project-subdomain>.livekit.cloud

# Optional: explicit agent dispatch. Leave blank for automatic dispatch.
AGENT_NAME=
```

### 3. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You also need an agent running to connect to — see the Riverside agent repo, or LiveKit's [voice AI quickstart](https://docs.livekit.io/agents/start/voice-ai/).

## Configuration

All branding and feature flags live in `[app-config.ts](./app-config.ts)`:

```ts
export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Riverside',
  pageTitle: 'Riverside Voice Agent',
  pageDescription: 'A voice agent by Riverside',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/riverside-logo.svg',
  accent: '#7B907E',
  logoDark: '/riverside-logo.svg',
  accentDark: '#7B907E',
  startButtonText: 'Start the experience',

  agentName: process.env.AGENT_NAME ?? undefined,
  sandboxId: undefined,
};
```

### Audio visualizer presets

Set `audioVisualizerType` to switch styles:

- `bar` — vertical bars (`audioVisualizerBarCount`)
- `grid` — dot grid (`audioVisualizerGridRowCount`, `audioVisualizerGridColumnCount`)
- `radial` — circular bars (`audioVisualizerRadialBarCount`, `audioVisualizerRadialRadius`)
- `wave` — oscilloscope (`audioVisualizerWaveLineWidth`)
- `aura` — shader-based aura (`audioVisualizerAuraColorShift`)

Use `audioVisualizerColor` / `audioVisualizerColorDark` for a shared accent across modes.

## Scripts

| Script              | What it does                 |
| ------------------- | ---------------------------- |
| `pnpm dev`          | Start dev server (Turbopack) |
| `pnpm build`        | Production build             |
| `pnpm start`        | Run the production build     |
| `pnpm lint`         | ESLint                       |
| `pnpm test`         | Run vitest suite             |
| `pnpm format`       | Prettier write               |
| `pnpm format:check` | Prettier check (no writes)   |
