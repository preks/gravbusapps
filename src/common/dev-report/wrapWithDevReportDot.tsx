import React, { type ComponentType } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { DevReportDot } from './DevReportDot'

export function wrapWithDevReportDot(screenKey: string) {
  return function withDevReportDot<P extends BusinessAppContextProps>(Component: ComponentType<P>): React.FC<P> {
    const WrappedComponent = (props: P) => {
      const enabled = useFeature<boolean>(Feature.Reporting.Internal.Enabled.Key) === true

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
