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
  /** Optional URL for Space hero background video (e.g. Azure Blob/CDN). If unset, uses canvas fallback. */
  readonly VITE_SPACE_HERO_VIDEO_URL?: string
  /** Optional URL for Spaces Hub (listing page) background video. If unset, uses canvas fallback. */
  readonly VITE_SPACES_HUB_VIDEO_URL?: string
  /** Override default chat virtual-background poster (normally /platform/assets/... on the host). */
  readonly VITE_CHAT_BACKGROUND_POSTER_URL?: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.ftl?raw' {
  const content: string
  export default content
}
