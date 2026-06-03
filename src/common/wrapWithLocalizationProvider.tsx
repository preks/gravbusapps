import React, { ComponentType } from 'react'
import { LocalizationProvider, SupportedLocale } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from './BusinessAppContext'
import { getCurrentActiveUserLocale } from './utils/windowUtils'

const BrowserTranslateGuard: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div translate="no" className="notranslate" style={{ display: 'contents' }}>
    {children}
  </div>
)

/**
 * Higher-order component that wraps a component with LocalizationProvider
 * @param Component Component to wrap
 * @returns Wrapped component
 */
export function wrapWithLocalizationProvider<P extends BusinessAppContextProps>(
  Component: ComponentType<P>
): React.FC<P> {
  const WrappedComponent = (props: P) => {
    const locale = getCurrentActiveUserLocale() as SupportedLocale

    return (
      <LocalizationProvider locale={locale}>
        <BrowserTranslateGuard>
          <Component {...props} />
        </BrowserTranslateGuard>
      </LocalizationProvider>
    )
  }

  const displayName = Component.displayName || Component.name || 'Component'
  WrappedComponent.displayName = `LocalizationProvider(${displayName})`

  return WrappedComponent
}
