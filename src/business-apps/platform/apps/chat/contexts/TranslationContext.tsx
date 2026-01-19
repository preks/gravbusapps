import React, { createContext, useContext, ReactNode, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'

type TranslationFunction = (key: string, params?: Record<string, any>) => string

const TranslationContext = createContext<TranslationFunction | null>(null)

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // CRITICAL: Call useTranslation ONCE at the top level
  // This prevents the expensive addResource operation from happening in every component
  const { t } = useTranslation(translations)

  // Memoize the translation function to prevent unnecessary re-renders
  // of all components that consume this context
  const memoizedT = useMemo(() => t, [t])

  return <TranslationContext.Provider value={memoizedT}>{children}</TranslationContext.Provider>
}

export const useChatTranslation = (): TranslationFunction => {
  const t = useContext(TranslationContext)
  if (!t) {
    throw new Error('useChatTranslation must be used within TranslationProvider')
  }
  return t
}
