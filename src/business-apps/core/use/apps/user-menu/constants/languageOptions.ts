import type { UserMenuLanguageOption } from '../types'

/** Default labels for IDE / local development when simulating the platform host contract. */
export const IDE_USER_MENU_LANGUAGE_OPTIONS: readonly UserMenuLanguageOption[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'de-DE', label: 'Deutsch (DE)' },
  { value: 'ro-RO', label: 'Română (RO)' }
] as const
