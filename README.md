# Riverside Frontend

Next.js frontend for the Riverside voice agent. Built on top of [LiveKit Agents](https://docs.livekit.io/agents) and the [Agents UI](https://livekit.io/ui) component library, with Riverside branding and product layer on top.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS** + **shadcn/ui**
- **LiveKit JavaScript SDK** for real-time voice / video transport
- **Agents UI** components (installed via shadcn registry into `components/agents-ui/`)

## Features

- Real-time voice interaction with a Riverside agent
- Camera + screen-share support
- Multiple audio visualizer styles (`bar`, `grid`, `radial`, `wave`, `aura`)
- Chat transcript with text input
- Light/dark theme with system preference detection
- Branding, colors, and copy configurable from a single file (`app-config.ts`)

## Project structure

```
riverside-frontend/
├── app/                  - Next.js App Router (routes, layout, OG image, API)
│   └── api/token/        - Mints LiveKit access tokens server-side
├── components/
│   ├── agents-ui/        - LiveKit Agents UI components (do not rename)
│   ├── ai-elements/      - AI Elements components
│   ├── app/              - App-level composition and business logic
│   └── ui/               - shadcn/ui primitives
├── hooks/
├── lib/
├── public/               - Static assets (logos, fonts, OG background)
├── styles/
└── app-config.ts         - Branding + feature flags (single source of truth)
```

Business logic lives in `components/app/`. The key files:


| File                  | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `app.tsx`             | Top-level wiring: theme, providers, session.                          |
| `view-controller.tsx` | Switches between welcome and session views based on connection state. |
| `session-view.tsx`    | Active call UI: chat transcript, media tiles, control bar.            |
| `welcome-view.tsx`    | Pre-connection landing UI.                                            |


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
  logoDark: '/riverside-logo.svg',
  accent: '#7B907E',
  accentDark: '#7B907E',
  startButtonText: 'Start call',

  agentName: process.env.AGENT_NAME ?? undefined,
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

## Working with Agents UI components

The `components/agents-ui/` directory contains components installed from the [Agents UI shadcn registry](https://livekit.io/ui). They are local source — edit them like any other component. Style overrides are best done via Tailwind classes passed as props; most components accept the full set of native HTML attributes.

To update them to the latest published version:

```bash
pnpm shadcn:install
```

To add a new one:

```bash
pnpm dlx shadcn@latest add @agents-ui/<component-name>
```

## Scripts


| Script        | What it does                 |
| ------------- | ---------------------------- |
| `pnpm dev`    | Start dev server (Turbopack) |
| `pnpm build`  | Production build             |
| `pnpm start`  | Run the production build     |
| `pnpm lint`   | ESLint                       |
| `pnpm format` | Prettier write               |


