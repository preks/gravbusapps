import React from 'react'
import CatalogSelectComponent from './CatalogSelect'
import CatalogSelectProviderComponent, { CatalogSelectContext, useCatalogValidation } from './CatalogSelectProvider'

// Namespace-style export for cleaner imports
export const CatalogSelect = Object.assign(CatalogSelectComponent, {
  Provider: CatalogSelectProviderComponent,
  Context: CatalogSelectContext,
  useValidation: useCatalogValidation,
  useContext: () => {
    const ctx = React.useContext(CatalogSelectContext)
    if (!ctx) {
      throw new Error('CatalogSelect.useContext must be used within CatalogSelect.Provider')
    }
    return ctx
  }
})

// Legacy exports for backward compatibility
export { default as CatalogSelectProvider } from './CatalogSelectProvider'
export { CatalogSelectContext } from './CatalogSelectProvider'
export { useCatalogValidation } from './CatalogSelectProvider'

// Export types
export type { CatalogSelectProps, CatalogSelectOption, CatalogSelectConfig, ListFilter } from './CatalogSelect'
