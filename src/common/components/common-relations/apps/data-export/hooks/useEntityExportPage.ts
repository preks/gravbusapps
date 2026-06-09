import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/contact-layout/utils/filterHelpers'
import type { EntityExportDefinition } from '../types/configTypes'
import { getDefaultSelectedFieldKeys } from '../types/exportFieldTypes'
import { partitionExportFields } from '../utils/exportFieldPartition'
import { getQueryableFilterDescriptors } from '../utils/resolveExportFilterDescriptors'
import { buildExportToastMessages, translateExportFields, translateFilterConfiguration } from '../utils/exportI18n'
import translations from '../_i18n'
import { useExportDownload } from './useExportDownload'

interface UseEntityExportPageOptions<TEntity, TQueryVars> {
  context: BusinessAppContextProps
  definition: EntityExportDefinition<TEntity, TQueryVars>
  enhanceFilterConfig?: (config: FilterConfiguration) => FilterConfiguration
  externalFilterLoading?: boolean
}

type ExportFormat = 'csv' | 'excel'

export function useEntityExportPage<TEntity, TQueryVars>({
  context,
  definition,
  enhanceFilterConfig,
  externalFilterLoading
}: UseEntityExportPageOptions<TEntity, TQueryVars>) {
  const { t } = useTranslation(translations)
  const accessToken = context.accessToken ?? ''
  const [selectedFilters, setSelectedFilters] = useState<Record<string, unknown>>({})
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>(() =>
    getDefaultSelectedFieldKeys(definition.exportFields)
  )
  const [selectedExternalIdKeys, setSelectedExternalIdKeys] = useState<string[]>([])
  const [externalIdsDialogOpen, setExternalIdsDialogOpen] = useState(false)
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [isCountLoading, setIsCountLoading] = useState(false)

  const translatedDefinition = useMemo(
    () => ({
      ...definition,
      exportFields: translateExportFields(definition.exportFields, t, definition.entityType)
    }),
    [definition, t]
  )

  const { regularFields, externalIdFields } = useMemo(
    () => partitionExportFields(translatedDefinition.exportFields),
    [translatedDefinition.exportFields]
  )

  const filterContext = useMemo(
    () => ({ accessToken, userInfo: context.userInfo, additionalData: context.additionalData }),
    [accessToken, context.userInfo, context.additionalData]
  )

  const filterDescriptors = definition.filterDescriptors ?? definition.descriptors
  const queryableFilterDescriptors = useMemo(
    () => getQueryableFilterDescriptors(filterDescriptors),
    [filterDescriptors]
  )

  const filterGroups = useFilterGroups(filterContext, definition.graphqlEntityName, queryableFilterDescriptors, {
    limit: 100,
    enabled: queryableFilterDescriptors.length > 0
  })

  const useDescriptorFilters = queryableFilterDescriptors.length > 0

  const filterDataSnapshot = useMemo(() => JSON.stringify(filterGroups.filterData), [filterGroups.filterData])

  const dynamicFilterConfig = useMemo(() => {
    let builtConfig = useDescriptorFilters
      ? buildDynamicFilterConfig(definition.baseFilterConfig, queryableFilterDescriptors, filterGroups)
      : structuredClone(definition.baseFilterConfig)

    if (enhanceFilterConfig) {
      builtConfig = enhanceFilterConfig(builtConfig)
    }

    return translateFilterConfiguration(builtConfig, t)
  }, [
    definition.baseFilterConfig,
    queryableFilterDescriptors,
    enhanceFilterConfig,
    filterDataSnapshot,
    filterGroups,
    t,
    useDescriptorFilters
  ])

  const toastMessages = useMemo(() => buildExportToastMessages(t, definition.entityLabel), [definition.entityLabel, t])

  const refreshCount = useCallback(async () => {
    if (!accessToken) {
      setTotalCount(0)
      return
    }

    setIsCountLoading(true)
    try {
      const vars = definition.buildQueryVariables({
        selectedFilters,
        limit: 1,
        offset: 0
      })
      const result = await definition.fetchPage(vars)
      setTotalCount(result.total)
    } catch {
      setTotalCount(0)
    } finally {
      setIsCountLoading(false)
    }
  }, [accessToken, definition, selectedFilters])

  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setSelectedFilters(filters)
  }, [])

  const handleFieldToggle = useCallback((fieldKey: string, checked: boolean) => {
    setSelectedFieldKeys(previous => {
      if (checked) {
        return previous.includes(fieldKey) ? previous : [...previous, fieldKey]
      }
      return previous.filter(key => key !== fieldKey)
    })
  }, [])

  const handleSelectAllFields = useCallback(() => {
    setSelectedFieldKeys(regularFields.map(field => field.key))
  }, [regularFields])

  const handleClearAllFields = useCallback(() => {
    setSelectedFieldKeys([])
  }, [])

  const handleExternalIdToggle = useCallback((fieldKey: string, checked: boolean) => {
    setSelectedExternalIdKeys(previous => {
      if (checked) {
        return previous.includes(fieldKey) ? previous : [...previous, fieldKey]
      }
      return previous.filter(key => key !== fieldKey)
    })
  }, [])

  const { isExporting, runExport } = useExportDownload({
    definition: translatedDefinition,
    selectedFilters,
    totalCount,
    toastMessages
  })

  const executeExport = useCallback(
    async (format: ExportFormat, externalIdKeys: string[]) => {
      const fieldKeys = [...selectedFieldKeys, ...externalIdKeys]
      await runExport(format, fieldKeys)
    },
    [runExport, selectedFieldKeys]
  )

  const beginExport = useCallback(
    (format: ExportFormat) => {
      if (externalIdFields.length === 0) {
        executeExport(format, []).catch(() => undefined)
        return
      }

      setPendingExportFormat(format)
      setSelectedExternalIdKeys([])
      setExternalIdsDialogOpen(true)
    },
    [executeExport, externalIdFields.length]
  )

  const handleExportCsv = useCallback(() => {
    beginExport('csv')
  }, [beginExport])

  const handleExportExcel = useCallback(() => {
    beginExport('excel')
  }, [beginExport])

  const handleExternalIdsDialogOpenChange = useCallback((open: boolean) => {
    setExternalIdsDialogOpen(open)
    if (!open) {
      setPendingExportFormat(null)
      setSelectedExternalIdKeys([])
    }
  }, [])

  const handleConfirmExternalIdsExport = useCallback(async () => {
    if (!pendingExportFormat) {
      return
    }

    const format = pendingExportFormat
    const externalIdKeys = selectedExternalIdKeys
    setExternalIdsDialogOpen(false)
    setPendingExportFormat(null)
    setSelectedExternalIdKeys([])
    await executeExport(format, externalIdKeys)
  }, [executeExport, pendingExportFormat, selectedExternalIdKeys])

  return {
    selectedFilters,
    selectedFieldKeys,
    selectedExternalIdKeys,
    externalIdsDialogOpen,
    externalIdFields,
    totalCount,
    isCountLoading,
    dynamicFilterConfig,
    exportFields: regularFields,
    filterGroupsLoading: externalFilterLoading ?? (useDescriptorFilters ? filterGroups.isLoading : false),
    handleFilterChange,
    handleFieldToggle,
    handleSelectAllFields,
    handleClearAllFields,
    handleExternalIdToggle,
    handleExternalIdsDialogOpenChange,
    handleConfirmExternalIdsExport,
    isExporting,
    handleExportCsv,
    handleExportExcel
  }
}
