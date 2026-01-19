import React, { ComponentType } from 'react'
import { UiCatalogProvider } from '@newwork/gravity-ui-catalog'
import { BusinessAppContextProps } from './BusinessAppContext'

/**
 * Higher-order component that wraps a component with UiCatalogProvider
 * @param Component Component to wrap
 * @returns Wrapped component
 */
export function wrapWithUiCatalog<P extends BusinessAppContextProps>(Component: ComponentType<P>): React.FC<P> {
  const WrappedComponent = (props: P) => (
    <UiCatalogProvider>
      <Component {...props} />
    </UiCatalogProvider>
  )

  const displayName = Component.displayName || Component.name || 'Component'
  WrappedComponent.displayName = `UiCatalogProvider(${displayName})`

  return WrappedComponent
}
