import React, { type ComponentType } from 'react'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

export const withRecruitingDevFeatureGate = <Props extends object>(Component: ComponentType<Props>) => {
  const GatedRecruitingComponent: React.FC<Props> = props => {
    const isDevEnabled = useFeature<boolean>(Feature.Dev.Enabled.Key)

    if (isDevEnabled !== true) return null

    return <Component {...props} />
  }

  GatedRecruitingComponent.displayName = `withRecruitingDevFeatureGate(${
    Component.displayName || Component.name || 'Component'
  })`

  return GatedRecruitingComponent
}
