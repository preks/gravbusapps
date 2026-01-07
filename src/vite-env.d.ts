/// <reference types="vite/client" />

// Type declarations for virtual modules
declare module 'virtual:dynamic-screen-loader' {
  export function loadScreen(screenKey: string): Promise<React.ComponentType<any>>
  export function preloadScreen(screenKey: string): Promise<React.ComponentType<any>>
  export function getAvailableScreens(): string[]
  export function isScreenAvailable(screenKey: string): boolean
  export function getScreenInfo(screenKey: string): {
    key: string
    path: string
    isLoaded: boolean
  }
  export const availableScreens: Record<string, string>
}

declare module 'virtual:wrapped-entries' {
  // This module exports wrapped components dynamically
  const content: Record<string, React.ComponentType<any>>
  export default content
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly MODE: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.ftl?raw' {
  const content: string
  export default content
}
