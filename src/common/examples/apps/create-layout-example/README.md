# Create Layout Example

Example app for the central **CreateLayout** component (`@/components/create-layout`).

## How to open

1. Start the dev server (`npm run dev`).
2. In the IDE start screen or app selector, go to **Examples** and open **Create Layout Example** (path: `examples/apps/create-layout-example`).

## What it shows

- **CreateLayout** is the only layout wrapper (no PageLayout). It owns both the header and the resizable body.
- **Header** is passed via the `header` prop (back button, icon, title, description).
- **ResizablePanelGroup** / **ResizablePanel** / **ResizableHandle** from the design system (same as ai-builder):
  - **Left:** Resizable chat panel (mock messages + input). Drag the vertical divider to resize.
  - **Right:** Canvas panel (main content area).
- Optional `sidebar` is not used here; see `CreateLayout` props for full options.

## Using CreateLayout elsewhere

```tsx
import { CreateLayout } from '@/components/create-layout'

<CreateLayout
  header={/* optional ReactNode above the two columns */}
  chatPanel={/* left: chat / AI wizard */}
  canvasPanel={/* right: editor / preview */}
  sidebar={/* optional: e.g. session history */}
  sidebarOpen={boolean}
  chatDefaultSize={25}
  chatMinSize={25}
  canvasMinSize={25}
  testId="my-create-layout"
/>
```
