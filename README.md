# Hermes Agent Crossing

A virtual office space to manage and interact with your Hermes AI agents.

## Overview

Hermes Agent Crossing is a pixel art desktop environment where you can:
- See your agents working in real-time
- Interact with them through chat
- Assign tasks and track progress via Kanban
- Monitor agent states and performance
- Customize teams and workspace layout

## Architecture

- **Frontend**: React 18 + Phaser 3 + Vite (apps/web)
- **Backend**: Fastify + TypeScript (apps/server)
- **Shared**: TypeScript types and Zod schemas (packages/shared)
- **Mock**: Hermes API mock for development (packages/hermes-mock)

## Key Features

- Pixel art world with office environments
- Agent sprites that reflect their real-time state
- Interactive agent panels with chat and task assignment
- Kanban board integration
- Real-time synchronization via WebSocket
- Team-based organization
- Day/night cycle
- Accessibility support (WCAG 2.1 AA)
- Multi-profile support

## Development

### Prerequisites
- Node.js >= 20
- pnpm >= 9

### Setup
```bash
pnpm install
```

### Development Mode
```bash
pnpm dev
```
This will start:
- Web frontend (Vite dev server)
- Backend API (Fastify)
- Hermes mock server (for development)

### Building Assets
```bash
pnpm run -w @crossing/web assets:build
```
Exports and optimizes game assets from Aseprite source files.

### Building for Production
```bash
pnpm build
```

## Asset Pipeline

Source assets are stored in `assets-src/` in Aseprite format (.aseprite).
The build process exports them to PNG and creates texture atlases for Phaser 3.

See `assets-src/CREDITS.md` for attribution information.

## License

MIT License - see LICENSE file for details.