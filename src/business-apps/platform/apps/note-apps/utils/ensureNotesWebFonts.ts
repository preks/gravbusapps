import { PLATFORM_FONTS_NOTES_CSS } from '@/common/constants/platformFontUrls'

const NOTES_WEBFONTS_LINK_ID = 'gba-note-imported-webfonts'

/** Lazy-load Inter from the platform host; avoid CSS @import (breaks Vite/PostCSS build). */
export function ensureNotesWebFonts(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(NOTES_WEBFONTS_LINK_ID)) return
  const head = document.head
  if (!head) return

  const link = document.createElement('link')
  link.id = NOTES_WEBFONTS_LINK_ID
  link.rel = 'stylesheet'
  link.href = PLATFORM_FONTS_NOTES_CSS
  head.appendChild(link)
}
