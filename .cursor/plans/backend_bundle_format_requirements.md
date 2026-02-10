# Backend Anforderung: Preview Bundle Format

## Problem

Das aktuelle Bundle ist CommonJS-Format und funktioniert nicht im Browser-iframe:

- `exports is not defined`
- `require() is not defined`
- Browser kann CommonJS nicht nativ ausführen

## Lösung: IIFE Build Format

Das Backend muss den Build für Preview in **IIFE** (Immediately Invoked Function Expression) Format erstellen.

---

## Vite Config Änderungen

**Datei:** `be/ai-builder-service` → Vite Build Config für Preview

**Aktuelle Config (funktioniert nicht):**

```typescript
build: {
  rollupOptions: {
    external: [],
    output: {
      inlineDynamicImports: true
    }
  }
}
```

**Neue Config (Browser-kompatibel):**

```typescript
build: {
  lib: {
    entry: './index.tsx',
    formats: ['iife'],           // IIFE statt ES/CommonJS
    name: 'PreviewApp',          // Global variable name
    fileName: 'preview-bundle'
  },
  rollupOptions: {
    external: [],                // Alle Dependencies inline
    output: {
      format: 'iife',
      inlineDynamicImports: true,
      globals: {}
    }
  },
  minify: false,                 // Kein Minify für Debugging
  sourcemap: false
}
```

---

## Output Format Anforderungen

**Was das Bundle enthalten muss:**

1. **Self-Executing Code:**

   ```javascript
   ;(function () {
     // Alle Dependencies inline (React, Design System, etc.)
     // User Code
     // Auto-initialisierung
   })()
   ```

2. **Root Element Rendering:**

   ```javascript
   // Am Ende des Bundles:
   const root = document.getElementById('root')
   if (root) {
     ReactDOM.createRoot(root).render(<App />)
   }
   ```

3. **Keine External References:**
   - Kein `import` / `require()`
   - Kein `exports` / `module.exports`
   - Alles inline gebundelt

---

## Entry Point Anpassung

**Datei:** `index.tsx` (oder wie der Entry Point heißt)

**Problem:** Vite's normaler Entry Point exportiert Komponenten, aber rendert sie nicht.

**Lösung:** Entry Point muss automatisch rendern:

```typescript
// index.tsx für Preview Build
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './src/App';

// Auto-mount wenn im Browser
if (typeof window !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
```

---

## Alternativer Ansatz: Separater Build Mode

Falls die normale Vite Config nicht geändert werden soll:

**Option A:** Eigene Config nur für Preview

```bash
# Neue Datei: vite.preview.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './preview-entry.tsx',
      formats: ['iife'],
      name: 'PreviewApp'
    },
    outDir: 'dist-preview',
    rollupOptions: {
      external: [],
      output: { format: 'iife' }
    }
  }
});
```

```bash
# Build Command für Preview
vite build --config vite.preview.config.ts
```

**Option B:** Environment Variable basiert

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  const isPreview = process.env.BUILD_MODE === 'preview'

  return {
    build: isPreview
      ? {
          lib: {
            entry: './preview-entry.tsx',
            formats: ['iife'],
            name: 'PreviewApp'
          },
          rollupOptions: {
            external: [],
            output: { format: 'iife' }
          }
        }
      : {
          // Normale Production Build Config
        }
  }
})
```

```bash
# Build Command
BUILD_MODE=preview npm run build
```

---

## Testing

**Wie Backend testen kann, ob Bundle funktioniert:**

1. **Bundle in HTML testen:**

   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <title>Test</title>
     </head>
     <body>
       <div id="root"></div>
       <script>
         // Bundle hier einfügen oder laden
       </script>
     </body>
   </html>
   ```

2. **Keine Errors in Browser Console:**
   - ❌ `exports is not defined`
   - ❌ `require is not defined`
   - ✅ App wird gerendert

3. **Bundle startet automatisch:**
   - Kein manuelles `mount()` oder `render()` nötig
   - App erscheint automatisch in `#root`

---

## Zusammenfassung für Backend Team

**Was ändern:**

1. Vite Config: `formats: ['iife']` statt ES/CommonJS
2. Entry Point: Auto-render in `index.tsx`
3. Output: Self-executing Bundle ohne `exports`/`require`

**Erwartetes Ergebnis:**

```javascript
// dist/preview-bundle.js
;(function () {
  // ... alle Dependencies inline ...
  // ... User Code ...
  // Auto-mount
  const root = document.getElementById('root')
  ReactDOM.createRoot(root).render(React.createElement(App))
})()
```

**Test:**

- Bundle in Browser laden
- Keine CommonJS Errors
- App rendert automatisch
