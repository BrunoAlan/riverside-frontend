# Project layout

```
riverside-frontend/
├── app/                  Next.js App Router (routes, layout, OG image, API)
│   ├── (design-system)/  /design-system showcase route
│   ├── agent/            /agent voice session UI
│   └── api/token/        LiveKit token minting
├── components/
│   ├── layout/           App shell: root composition, providers, view controller
│   ├── agent-ui/         Agent-driven views the backend can switch between
│   │   └── views/        One file per view, registered in view-registry.ts
│   ├── panels/           Reusable content panels (map, cabin cards, etc.)
│   ├── chat/             Chat transcript + input
│   ├── home/             Welcome/landing UI
│   ├── livekit/          Thin wrappers over @livekit/components-react
│   ├── ai-elements/      AI Elements (chat conversation)
│   └── ui/               shadcn primitives — DO NOT hand-edit
├── hooks/                Cross-cutting React hooks (use-kebab-case.ts)
├── lib/
│   ├── agent-ui/         Transport, store, types for agent-driven UI
│   ├── dev/              Dev-only UI (DevPanel) and view mocks
│   ├── map/              Map data + clustering helpers
│   └── shadcn/           shadcn helpers (cn, etc.)
├── public/               Static assets
├── styles/
└── app-config.ts         Branding + feature flags (single source of truth)
```

## Where to put a new file

| You're adding…                               | Goes in…                                                      |
| -------------------------------------------- | ------------------------------------------------------------- |
| A new shadcn primitive                       | `components/ui/` (via the shadcn CLI, never by hand)          |
| A reusable visual block (card, panel, chart) | `components/panels/` or a new folder under `components/`      |
| A view the agent can switch to               | `components/agent-ui/views/` + register in `view-registry.ts` |
| App-shell / layout glue                      | `components/layout/`                                          |
| A pure helper, type, or store                | `lib/<domain>/`                                               |
| A cross-cutting React hook                   | `hooks/`                                                      |
| A hook that only one component uses          | Co-locate with the component                                  |
| A new route                                  | `app/<segment>/page.tsx`                                      |
| Branding / feature flag                      | `app-config.ts`                                               |
| Dev-only tooling                             | `lib/dev/`                                                    |

## Boundary rules

- `components/ui/` is read-only for humans. Re-run `pnpm dlx shadcn` to update.
- `lib/agent-ui/transport.ts` is the only place that talks to LiveKit `room.registerTextStreamHandler`. Everything else uses the store.
- `lib/dev/` may import from anywhere in the app, but **nothing in `app/` or `components/` may import from `lib/dev/`** — except the layout root, which mounts the dev panel.
- `app-config.ts` is imported, not mutated.
