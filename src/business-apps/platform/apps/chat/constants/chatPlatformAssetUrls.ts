/**
 * Same path on every host: gravity-platform copies @newwork/assets into public/platform/assets;
 * gravity-business-apps syncs the same package into ./public for Vite dev only. `vite build` strips
 * public/platform/assets before emit so these files are not part of remote dist output.
 */
export const CHAT_BACKGROUND_POSTER_PATH = '/platform/assets/chat/background-poster.jpg'

/** Absolute URL for img.src when running on the platform origin; override when testing remotes off-platform. */
export function getChatBackgroundPosterUrl(): string {
  const fromEnv = import.meta.env?.VITE_CHAT_BACKGROUND_POSTER_URL
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined') {
    return new URL(CHAT_BACKGROUND_POSTER_PATH, window.location.origin).href
  }
  return CHAT_BACKGROUND_POSTER_PATH
}
