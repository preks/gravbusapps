'use client'

import { FeatureHub } from 'featurehub-react-sdk'
import FeatureHubConfig from './FeatureHubConfig'
import { env } from '@/common/env/EnvUtils'

// When on localhost, use the Vite proxy path to avoid CORS from features-dev.newwork.com
const baseUrl = env('NEXT_PUBLIC_FEATURE_HUB_API') ?? ''
const url =
  typeof window !== 'undefined' &&
  (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1') &&
  baseUrl.includes('features-dev.newwork.com')
    ? '/__featurehub'
    : baseUrl
const apiKey = env('NEXT_PUBLIC_FEATURE_HUB_API_KEY') ?? ''

export default function FeatureHubProvider({ userId }: { userId: string }): JSX.Element {
  return (
    <FeatureHub url={url} apiKey={apiKey}>
      <FeatureHubConfig userId={userId}></FeatureHubConfig>
    </FeatureHub>
  )
}
