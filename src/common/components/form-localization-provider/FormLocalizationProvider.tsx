import React, { useMemo } from 'react'
import { LocalizationProvider } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface FormLocalizationProviderProps {
  children: React.ReactNode
}

/**
 * Provides the design-system LocalizationProvider for screens that render
 * design-system components (e.g. useTranslation) outside the platform shell.
 * Without it, the strict design-system throws
 * "useLocalizationContext must be used within LocalizationProvider".
 */
export const FormLocalizationProvider: React.FC<FormLocalizationProviderProps> = ({ children }) => {
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  return <LocalizationProvider locale={locale as any}>{children}</LocalizationProvider>
}
