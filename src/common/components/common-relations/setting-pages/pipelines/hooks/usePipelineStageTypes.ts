import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  FALLBACK_STAGE_TYPE_OPTIONS,
  FALLBACK_STAGE_TYPE_VARIANT_MAP,
  getStageTypeVariant,
  type StageTypeBadgeVariant
} from '../utils/pipelineStageTypeVariant'

const VALID_BADGE_VARIANTS: StageTypeBadgeVariant[] = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'success',
  'warning',
  'info',
  'offline'
]

function isValidBadgeVariant(value: unknown): value is StageTypeBadgeVariant {
  return typeof value === 'string' && VALID_BADGE_VARIANTS.includes(value as StageTypeBadgeVariant)
}

export interface PipelineStageTypeOption {
  value: string
  label: string
}

export interface UsePipelineStageTypesReturn {
  options: PipelineStageTypeOption[]
  variantMap: Record<string, StageTypeBadgeVariant>
  loading: boolean
  error: string | null
}

export function usePipelineStageTypes(
  accessToken: string | undefined,
  stageTypeCatalog: string | undefined,
  version: string = 'v1'
): UsePipelineStageTypesReturn {
  const [options, setOptions] = useState<PipelineStageTypeOption[]>(FALLBACK_STAGE_TYPE_OPTIONS)
  const [variantMap, setVariantMap] = useState<Record<string, StageTypeBadgeVariant>>(FALLBACK_STAGE_TYPE_VARIANT_MAP)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken ?? '')

  const fetchStageTypes = useCallback(async () => {
    if (!accessToken || !stageTypeCatalog) {
      setOptions(FALLBACK_STAGE_TYPE_OPTIONS)
      setVariantMap(FALLBACK_STAGE_TYPE_VARIANT_MAP)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: stageTypeCatalog,
          version
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true
        }
      )

      const entries = response?.data ?? []
      if (entries.length === 0) {
        setOptions(FALLBACK_STAGE_TYPE_OPTIONS)
        setVariantMap(FALLBACK_STAGE_TYPE_VARIANT_MAP)
        setLoading(false)
        return
      }

      const sortOrder = (entry: (typeof entries)[0]) => {
        const order = entry.displayOrder ?? entry.additionalValue1
        if (order != null) {
          const num = Number.parseInt(String(order), 10)
          if (!Number.isNaN(num)) return num
        }
        return 999
      }

      const sorted = [...entries].sort((a, b) => sortOrder(a) - sortOrder(b))

      const mappedOptions: PipelineStageTypeOption[] = sorted.map(entry => ({
        value: entry.alternativeCode ?? entry.code ?? entry.id ?? '',
        label: entry.value ?? entry.code ?? entry.id ?? ''
      }))

      const mappedVariantMap: Record<string, StageTypeBadgeVariant> = {}
      for (const entry of sorted) {
        const code = entry.alternativeCode ?? entry.code ?? ''
        const variantFromCatalog = entry.additionalValue2 ?? entry.objectValue?.badgeVariant
        mappedVariantMap[code] = isValidBadgeVariant(variantFromCatalog)
          ? variantFromCatalog
          : getStageTypeVariant(code)
      }

      setOptions(mappedOptions)
      setVariantMap(mappedVariantMap)
    } catch (err) {
      console.error('Error fetching pipeline stage types:', err)
      setOptions(FALLBACK_STAGE_TYPE_OPTIONS)
      setVariantMap(FALLBACK_STAGE_TYPE_VARIANT_MAP)
      setError(err instanceof Error ? err.message : 'Failed to fetch stage types')
    } finally {
      setLoading(false)
    }
  }, [accessToken, stageTypeCatalog, version, catalogClient])

  useEffect(() => {
    fetchStageTypes()
  }, [fetchStageTypes])

  return {
    options: options.length > 0 ? options : FALLBACK_STAGE_TYPE_OPTIONS,
    variantMap,
    loading,
    error
  }
}
