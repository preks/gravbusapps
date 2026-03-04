import React, { type ComponentType } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isDevPlatform } from '@/business-apps/platform/apps/debugger/utils/devPlatformDetector'
import { DevReportDot } from './DevReportDot'

function isAllowedDevHost(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location?.hostname || ''
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('newwork-dev')
}

export function wrapWithDevReportDot(screenKey: string) {
  return function withDevReportDot<P extends BusinessAppContextProps>(Component: ComponentType<P>): React.FC<P> {
    const WrappedComponent = (props: P) => {
      // Keep this feature strictly dev-only: local dev server OR NEWWORK dev tenant host + dev-platform detection.
      const enabled = import.meta.env.MODE === 'development' || (isAllowedDevHost() && isDevPlatform())

      if (!enabled) {
        return <Component {...props} />
      }

      return (
        <>
          <Component {...props} />
          <DevReportDot enabled={enabled} screenKey={screenKey} context={props} />
        </>
      )
    }

    const displayName = Component.displayName || Component.name || 'Component'
    WrappedComponent.displayName = `DevReportDot(${displayName})`
    return WrappedComponent
  }
}
