import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CatalogSelectConfig, CatalogSelectController } from './useCatalogSelect'
import useCatalogSelect from './useCatalogSelect'

interface CatalogSelectContextValue {
  controllers: Record<string, CatalogSelectController>
}

const CatalogSelectContext = createContext<CatalogSelectContextValue | null>(null)

interface CatalogSelectProviderProps extends BusinessAppContextProps {
  configs: CatalogSelectConfig[]
  children: React.ReactNode
  externalValues?: Record<string, string | null>
}

export const CatalogSelectProvider: React.FC<CatalogSelectProviderProps> = ({
  configs,
  children,
  externalValues,
  ...context
}) => {
  const { controllers, preload } = useCatalogSelect(context, configs, externalValues)

  useEffect(() => {
    preload()
  }, [preload])

  const value = useMemo(() => ({ controllers }), [controllers])

  return <CatalogSelectContext.Provider value={value}>{children}</CatalogSelectContext.Provider>
}

export const useCatalogSelectController = (catalogIdentifier: string): CatalogSelectController | null => {
  const ctx = useContext(CatalogSelectContext)
  return ctx?.controllers[catalogIdentifier] || null
}

export default CatalogSelectProvider
