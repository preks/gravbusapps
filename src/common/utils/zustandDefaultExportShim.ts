// Backward-compat shim for `zustand` so that libraries which still rely on the
// pre-v5 `import create from 'zustand'` default-export pattern (notably
// `@react-three/fiber` v8.x) keep working against the host's zustand v5
// instance, which only exposes named exports.
//
// The vite build aliases `zustand` to this file (see vite.config.ts). To avoid
// recursion we re-export from the sub-paths `zustand/react` and
// `zustand/vanilla`, which are NOT affected by the alias.

import { create, useStore } from 'zustand/react'
import { createStore } from 'zustand/vanilla'

export { create, createStore, useStore }
export default create
