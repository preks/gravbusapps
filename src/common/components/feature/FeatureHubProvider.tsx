'use client'

import { FeatureHub } from 'featurehub-react-sdk'
import FeatureHubConfig from './FeatureHubConfig'
import { env } from '@/common/env/EnvUtils'

const url = env('NEXT_PUBLIC_FEATURE_HUB_API') ?? ''
const apiKey = env('NEXT_PUBLIC_FEATURE_HUB_API_KEY') ?? ''

export default function FeatureHubProvider({ userId }: { userId: string }): JSX.Element {
  return (
    <FeatureHub url={url} apiKey={apiKey}>
      <FeatureHubConfig userId={userId}></FeatureHubConfig>
    </FeatureHub>
  )
}
