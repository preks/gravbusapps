import React, { ComponentType } from 'react'
import { BlinkProvider } from './providers/BlinkProvider'
import { BusinessAppContextProps } from './BusinessAppContext'

/**
 * Higher-order component that wraps a component with BlinkProvider
 *
 * This enables the component tree to use the useBlink() hook for
 * sharing entities via Blink anywhere in the app.
 *
 * @param Component Component to wrap
 * @returns Wrapped component with Blink sharing capabilities
 */
export function wrapWithBlinkProvider<P extends BusinessAppContextProps>(Component: ComponentType<P>): React.FC<P> {
  const WrappedComponent = (props: P) => {
    const accessToken = props.accessToken || ''
    const currentUserId = props.userInfo?.id || ''

    return (
      <BlinkProvider accessToken={accessToken} currentUserId={currentUserId}>
        <Component {...props} />
      </BlinkProvider>
    )
  }

  const displayName = Component.displayName || Component.name || 'Component'
  WrappedComponent.displayName = `BlinkProvider(${displayName})`

  return WrappedComponent
}
