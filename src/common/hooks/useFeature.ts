import { useEffect, useState } from 'react'
import { FeatureHub } from 'featurehub-javascript-client-sdk'

export function useFeature<T>(key: string): T | undefined {
  const [value, setValue] = useState<T | undefined>(() => FeatureHub.feature<T>(key).value)

  useEffect(() => {
    const feature = FeatureHub.feature<T>(key)

    console.debug('[FeatureHub] feature flag requested', { key, value: feature.value })
    setValue(feature.value)

    const listenerId = feature.addListener(fs => {
      const nextValue = fs.value
      setValue(nextValue)
    })

    return () => feature.removeListener(listenerId)
  }, [key])

  return value
}
