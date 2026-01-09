import { useState, useCallback } from 'react'
import {
  getPlatformContext,
  getCurrentActiveStructureId,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel,
  formatDate,
  formatNumberFunction
} from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'
import { FeatureHub } from 'featurehub-javascript-client-sdk'
import { Feature } from '@/common/types/constants/FeatureHub'

interface PlatformFunctionResult {
  name: string
  value: any
  error?: string
}

export const usePlatformFunctions = () => {
  const [results, setResults] = useState<Record<string, PlatformFunctionResult>>({})

  const testFunction = useCallback((name: string, fn: () => any) => {
    try {
      const value = fn()
      setResults(prev => ({
        ...prev,
        [name]: { name, value }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: {
          name,
          value: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    }
  }, [])

  const testTranslation = useCallback(() => {
    testFunction('getTranslationFromI18nKeyAndLabel', () => {
      return getTranslationFromI18nKeyAndLabel('breadcrumbs.create', 'Create', {})
    })
  }, [testFunction])

  const testFormatDate = useCallback(() => {
    testFunction('formatDate', () => {
      const now = new Date()
      return {
        'date.short': formatDate(now, 'date.short'),
        'date.long': formatDate(now, 'date.long'),
        'dateTime.short': formatDate(now, 'dateTime.short'),
        'dateTime.long': formatDate(now, 'dateTime.long')
      }
    })
  }, [testFunction])

  const testFormatNumber = useCallback(() => {
    testFunction('formatNumber', () => {
      return {
        '1234.56': formatNumberFunction(1234.56, '0.00[,]00'),
        '1000': formatNumberFunction(1000, '0.00[,]00'),
        '0.5': formatNumberFunction(0.5, '0.00[,]00')
      }
    })
  }, [testFunction])

  const testUseFeature = useCallback(() => {
    testFunction('useFeature (FeatureHub)', () => {
      try {
        const testFeatureKey = Feature.OrgChart.Finance.Key
        const feature = FeatureHub.feature(testFeatureKey)
        return {
          key: testFeatureKey,
          value: feature.value,
          enabled: feature.enabled,
          note: 'Testing with orgchart.finance.mode feature'
        }
      } catch {
        throw new Error('FeatureHub not available or feature not found')
      }
    })
  }, [testFunction])

  const testGetPlatformContext = useCallback(() => {
    testFunction('getPlatformContext', () => {
      return getPlatformContext()
    })
  }, [testFunction])

  const testGetActiveStructureId = useCallback(() => {
    testFunction('getCurrentActiveStructureId', () => {
      return getCurrentActiveStructureId()
    })
  }, [testFunction])

  const testEnv = useCallback(() => {
    testFunction('env', () => {
      return {
        NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK: env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK'),
        NEXT_PUBLIC_FLOW_MANAGER_ENDPOINT: env('NEXT_PUBLIC_FLOW_MANAGER_ENDPOINT'),
        NEXT_PUBLIC_BASE_URL: env('NEXT_PUBLIC_BASE_URL'),
        NEXT_PUBLIC_FEATURE_HUB_API: env('NEXT_PUBLIC_FEATURE_HUB_API')
      }
    })
  }, [testFunction])

  const testGetActiveUserLocale = useCallback(() => {
    testFunction('getCurrentActiveUserLocale', () => {
      return getCurrentActiveUserLocale()
    })
  }, [testFunction])

  const testWindowLocation = useCallback(() => {
    testFunction('window.location', () => {
      if (typeof window === 'undefined') {
        throw new Error('window is not available')
      }
      return {
        hostname: window.location.hostname,
        href: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      }
    })
  }, [testFunction])

  const testDocumentTitle = useCallback(() => {
    testFunction('document.title', () => {
      if (typeof document === 'undefined') {
        throw new Error('document is not available')
      }
      return document.title
    })
  }, [testFunction])

  return {
    results,
    testTranslation,
    testFormatDate,
    testFormatNumber,
    testUseFeature,
    testGetPlatformContext,
    testGetActiveStructureId,
    testEnv,
    testGetActiveUserLocale,
    testWindowLocation,
    testDocumentTitle
  }
}
