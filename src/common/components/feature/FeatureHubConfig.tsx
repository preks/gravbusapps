'use client'

import { useEffect } from 'react'
import { useFeatureHub } from 'featurehub-react-sdk'
import { StrategyAttributeDeviceName } from 'featurehub-javascript-client-sdk'
import { env } from '@/common/env/EnvUtils'
import { CustomAttributeType } from '@/common/types/enums/FeatureHub'

const tenant = env('NEXT_PUBLIC_FEATURE_HUB_TENANT') ?? ''

const FeatureHubConfig = ({ userId }: { userId: string }): JSX.Element => {
  const { client } = useFeatureHub()

  const setContextAttributes = async () => {
    client.attributeValue(CustomAttributeType.Tenant, tenant)
    client.device(StrategyAttributeDeviceName.Browser)
    if (userId) {
      client.userKey(userId)
    }

    await client.build()
  }

  useEffect(() => {
    if (userId) {
      setContextAttributes()
    }
  }, [userId])

  return <></>
}

export default FeatureHubConfig
