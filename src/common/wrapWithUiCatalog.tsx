import React, { ComponentType } from 'react'
import { UiCatalogProvider } from '@newwork/gravity-ui-catalog'
import { BusinessAppContextProps } from './BusinessAppContext'

/**
 * Higher-order component that wraps a component with UiCatalogProvider
 * @param Component Component to wrap
 * @returns Wrapped component
 */
export function wrapWithUiCatalog<P extends BusinessAppContextProps>(Component: ComponentType<P>): React.FC<P> {
  // 🔍 DEBUG: Validate component before wrapping (runs in both dev AND production)
  if (!Component) {
    console.error('❌ [wrapWithUiCatalog] Component is undefined/null:', Component)
    console.error('📍 Location: This error happens when wrapping the component')
    console.error('🔧 Fix: Ensure your component file has: export default YourComponent')
    throw new Error('[wrapWithUiCatalog] Component is undefined or null - check default export')
  }

  const componentType = typeof Component
  const isValidComponent = typeof Component === 'function' || (typeof Component === 'object' && Component !== null)

  // Always log in production too (not just dev)
  console.log('🔍 [wrapWithUiCatalog] Wrapping component:', {
    componentType,
    isValidComponent,
    displayName: Component.displayName || Component.name || 'Unknown',
    hasRender: Component && typeof Component === 'object' ? 'render' in Component : false,
    keys: Component && typeof Component === 'object' ? Object.keys(Component) : [],
    isProduction: import.meta.env.PROD
  })

  if (!isValidComponent) {
    console.error('❌ [wrapWithUiCatalog] Invalid component type:', componentType)
    console.error('📍 Got:', Component)
    console.error('🔧 Fix: Component must be a function, not an object. Check your export.')
    throw new Error(`[wrapWithUiCatalog] Component must be a function or valid React component, got ${componentType}`)
  }

  const WrappedComponent = (props: P) => {
    const screenName = Component.displayName || Component.name || 'Unknown'
    console.log('🎬 [wrapWithUiCatalog] Rendering wrapped component:', screenName)

    try {
      return (
        <UiCatalogProvider>
          <Component {...props} />
        </UiCatalogProvider>
      )
    } catch (error) {
      console.error('❌ [wrapWithUiCatalog] Error rendering component:', error)
      console.error('Component details:', {
        component: Component,
        props,
        displayName: screenName
      })
      throw error
    }
  }

  const displayName = Component.displayName || Component.name || 'Component'
  WrappedComponent.displayName = `UiCatalogProvider(${displayName})`

  return WrappedComponent
}
