// Backward-compat shim for `zustand` so that libraries which still rely on the
// pre-v5 `import create from 'zustand'` default-export pattern (notably
// `@react-three/fiber` v8.x) keep working against the host's zustand v5
// instance, which only exposes named exports.
//
// The vite build aliases `zustand` to this file (see vite.config.ts). To avoid
// recursion we re-export from the sub-paths `zustand/react` and
// `zustand/vanilla`, which are NOT affected by the alias.

export { create, useStore } from 'zustand/react'
export { createStore } from 'zustand/vanilla'
export { create as default } from 'zustand/react'
