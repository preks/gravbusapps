export type UserMenuSupportedLocale = 'en-US' | 'de-DE' | 'ro-RO'

export const USER_MENU_SUPPORTED_LOCALES: readonly UserMenuSupportedLocale[] = ['en-US', 'de-DE', 'ro-RO'] as const

export function isUserMenuSupportedLocale(value: unknown): value is UserMenuSupportedLocale {
  return typeof value === 'string' && USER_MENU_SUPPORTED_LOCALES.includes(value as UserMenuSupportedLocale)
}
