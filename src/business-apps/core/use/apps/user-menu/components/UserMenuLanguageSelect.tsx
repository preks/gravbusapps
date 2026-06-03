import React, { useCallback } from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { isUserMenuSupportedLocale, type UserMenuSupportedLocale } from '../constants/locale'
import type { UserMenuLanguageOption } from '../types'

export interface UserMenuLanguageSelectProps {
  dataTestId: string
  selectedLanguage: UserMenuSupportedLocale
  languageOptions: UserMenuLanguageOption[]
  onLanguageChange: (locale: UserMenuSupportedLocale) => void
}

export function UserMenuLanguageSelect({
  dataTestId,
  selectedLanguage,
  languageOptions,
  onLanguageChange
}: Readonly<UserMenuLanguageSelectProps>) {
  const { t } = useTranslation(translations)
  const languageLabel = t('user-menu-language')

  const handleLanguageChange = useCallback(
    (value: string) => {
      if (isUserMenuSupportedLocale(value)) {
        // TODO: REPLACE PLATFORM RELOAD FUNCTIONALITY ONCE TRANSLATION APPROACH WAS UNIFIED
        onLanguageChange(value)
      }
    },
    [onLanguageChange]
  )

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-xs gba:font-medium gba:text-muted-foreground">{languageLabel}</Label>
      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger data-testid={`${dataTestId}-language-select`} aria-label={languageLabel}>
          <SelectValue placeholder={languageLabel} />
        </SelectTrigger>
        <SelectContent>
          {languageOptions.map(option => (
            <SelectItem key={option.value} value={option.value} data-testid={`${dataTestId}-language-${option.value}`}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
