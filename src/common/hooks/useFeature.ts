import { useEffect, useState } from 'react'
import { FeatureHub } from 'featurehub-javascript-client-sdk'

export function useFeature<T>(key: string): T | undefined {
  const [value, setValue] = useState(FeatureHub.feature<T>(key).value)
  const feature = FeatureHub.feature(key)
  const listenerId = feature.addListener(fs => setValue(fs.value))

  useEffect(() => {
    setValue(feature.value)
    return () => feature.removeListener(listenerId)
  }, [listenerId])

  return value
}
