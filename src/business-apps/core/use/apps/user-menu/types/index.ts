import type { BusinessAppContextProps, UserInfoProps } from '@/common/BusinessAppContext'
import { DATA_PRIVACY_DOCUMENT_URL } from '../constants'
import { isUserMenuSupportedLocale, type UserMenuSupportedLocale } from '../constants/locale'

export type { UserMenuSupportedLocale } from '../constants/locale'

export interface UserMenuLanguageOption {
  label: string
  value: string
}

export interface UserMenuAdditionalData {
  isProfileLoaded: boolean
  onLogout: () => void
  /** Host-provided locale options; required with selectedLanguage and onLanguageChange to show language UI. */
  languageOptions?: UserMenuLanguageOption[]
  /** Current platform locale from the host (e.g. en-US). */
  selectedLanguage?: string
  /** Persists locale via platform (user profile); remote must not update locale locally only. */
  onLanguageChange?: (locale: UserMenuSupportedLocale) => void
  /** Optional; defaults to product privacy policy URL defined in user-menu constants */
  dataPrivacyUrl?: string
}

export type UserMenuUserInfo = UserInfoProps & {
  email?: string
}

function isLanguageOption(value: unknown): value is UserMenuLanguageOption {
  if (!value || typeof value !== 'object') {
    return false
  }

  const option = value as UserMenuLanguageOption
  return typeof option.label === 'string' && typeof option.value === 'string'
}

export function parseUserMenuLanguageOptions(value: unknown): UserMenuLanguageOption[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined
  }

  const options = value.filter(isLanguageOption)
  if (options.length === 0) {
    return undefined
  }

  return options
}

export function hasUserMenuLanguageContract(data: UserMenuAdditionalData): boolean {
  return (
    typeof data.onLanguageChange === 'function' &&
    typeof data.selectedLanguage === 'string' &&
    data.selectedLanguage.length > 0 &&
    Array.isArray(data.languageOptions) &&
    data.languageOptions.length > 0
  )
}

export function resolveUserMenuAdditionalData(
  additionalData: BusinessAppContextProps['additionalData'] | undefined
): UserMenuAdditionalData {
  if (!additionalData) {
    throw new Error('UserMenu requires additionalData')
  }

  const {
    isProfileLoaded,
    onLogout,
    languageOptions: rawLanguageOptions,
    selectedLanguage,
    onLanguageChange,
    dataPrivacyUrl
  } = additionalData

  if (typeof isProfileLoaded !== 'boolean') {
    throw new Error('UserMenu requires additionalData.isProfileLoaded as boolean')
  }

  if (typeof onLogout !== 'function') {
    throw new Error('UserMenu requires additionalData.onLogout as function')
  }

  if (onLanguageChange !== undefined && typeof onLanguageChange !== 'function') {
    throw new Error('UserMenu requires additionalData.onLanguageChange as function when provided')
  }

  if (selectedLanguage !== undefined && !isUserMenuSupportedLocale(selectedLanguage)) {
    throw new Error('UserMenu requires additionalData.selectedLanguage to be en-US, de-DE, or ro-RO when provided')
  }

  const languageOptions = parseUserMenuLanguageOptions(rawLanguageOptions)

  if (rawLanguageOptions !== undefined && languageOptions === undefined) {
    throw new Error('UserMenu requires additionalData.languageOptions as a non-empty array of { label, value }')
  }

  const resolvedPrivacyUrl =
    typeof dataPrivacyUrl === 'string' && dataPrivacyUrl.length > 0 ? dataPrivacyUrl : DATA_PRIVACY_DOCUMENT_URL

  return {
    isProfileLoaded,
    onLogout,
    languageOptions,
    selectedLanguage: isUserMenuSupportedLocale(selectedLanguage) ? selectedLanguage : undefined,
    onLanguageChange: onLanguageChange as UserMenuAdditionalData['onLanguageChange'],
    dataPrivacyUrl: resolvedPrivacyUrl
  }
}
