import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DataDisplay,
  DataTable,
  useTranslation
} from '@newwork/nw-design-system'
import { ListPlus, RefreshCw, Upload } from 'lucide-react'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import type { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import translations from '../_i18n'
import { useSpaceUserLookup } from '@/business-apps/platform/apps/spaces/hooks/useSpaceUserLookup'
import { useAppCatalogLabels } from './hooks/useAppCatalogLabels'
import { parseCatalogCode } from './utils/flowTagUtils'
import { createFlowStudioListColumns, type FlowTemplateRow } from './config/flowStudioListColumns'

const PAGE_SIZE = 20

interface FlowStudioListViewProps {
  accessToken: string
  onOpenTemplate: (templateId: string) => void
  onCreateFlow?: () => void
  onImportFlow?: () => void
  'data-testid'?: string
}

export const FlowStudioListView: React.FC<FlowStudioListViewProps> = ({
  accessToken,
  onOpenTemplate,
  onCreateFlow,
  onImportFlow,
  'data-testid': testId = 'flow-studio-list-view'
}) => {
  const { t } = useTranslation(translations)
  const client = useFlowTemplateClient(accessToken)

  const [search, setSearch] = useState<string>('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })

  const [isLoading, setIsLoading] = useState(false)
  const initialLoadDoneRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [totalCount, setTotalCount] = useState(0)

  const fetchPage = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await client.getTemplatesList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        onlyLatest: true,
        includeDrafts: true,
        search: search.trim() || undefined
      })
      setTemplates(res.templates || [])
      setTotalCount(res.totalCount || 0)
      initialLoadDoneRef.current = true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
      setTemplates([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client, pagination.pageIndex, pagination.pageSize, search])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  const data: FlowTemplateRow[] = useMemo(
    () =>
      (templates || []).map((tpl, index) => ({
        ...tpl,
        updatedAt:
          tpl.updatedAt ||
          (tpl as any)?.metadata?.databaseInfo?.modifiedOn ||
          (tpl as any)?.metadata?.databaseInfo?.modified_at ||
          (tpl as any)?.modifiedOn ||
          (tpl as any)?.modified_at ||
          tpl.createdAt ||
          (tpl as any)?.metadata?.databaseInfo?.createdOn ||
          (tpl as any)?.createdOn,
        templateId: tpl.id,
        id: String(tpl.id || `missing-${pagination.pageIndex}-${index}`)
      })),
    [pagination.pageIndex, templates]
  )

  const appCodes = useMemo(() => {
    const codes: string[] = []
    for (const tpl of templates || []) {
      const code = parseCatalogCode((tpl.tags as any)?.app)
      if (code) codes.push(code)
    }
    return codes
  }, [templates])

  const { labelsByCode } = useAppCatalogLabels(accessToken, appCodes)

  const creatorIds = useMemo(() => {
    const ids: string[] = []
    for (const tpl of templates || []) {
      const id = String((tpl as any).createdBy || '').trim()
      if (id) ids.push(id)
    }
    return Array.from(new Set(ids))
  }, [templates])

  const { getUserInfo } = useSpaceUserLookup({ accessToken, userIds: creatorIds })

  const getAppCode = useCallback((row: FlowTemplateRow) => parseCatalogCode((row.tags as any)?.app), [])

  const showCreatorColumn = creatorIds.length > 0

  const getExportFileName = useCallback((name: string) => {
    const safeName = String(name || 'flow')
      .trim()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
    return `${safeName || 'flow'}.flow.json`
  }, [])

  const exportTemplate = useCallback(
    async (templateId: string) => {
      try {
        setError(null)
        const metadata = await client.getTemplateWithMetadata(templateId)
        const template = metadata.metadata?.originalTemplate || metadata.template
        const exportPayload = {
          format: 'newwork-flow-template',
          formatVersion: 1,
          exportedAt: new Date().toISOString(),
          template
        }
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = getExportFileName(template.name)
        anchor.click()
        URL.revokeObjectURL(url)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to export template')
      }
    },
    [client, getExportFileName]
  )

  const columns = useMemo(
    () =>
      createFlowStudioListColumns({
        t,
        appLabelByCode: labelsByCode,
        getCreatorInfo: getUserInfo,
        getAppCode,
        showCreatorColumn,
        onExportTemplate: templateId => {
          void exportTemplate(templateId)
        }
      }),
    [exportTemplate, getAppCode, getUserInfo, labelsByCode, showCreatorColumn, t]
  )

  if (error) {
    return (
      <div className="gba:py-6" data-testid={`${testId}-error`}>
        <Alert variant="destructive">
          <AlertTitle>{t('list-error-title')}</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchPage()}
              className="gba:ml-3"
              data-testid={`${testId}-retry`}
            >
              <RefreshCw className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('list-retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:w-full gba:pb-10" data-testid={testId}>
      <DataDisplay
        titleSections={[
          {
            id: 'flows',
            label: t('list-title'),
            metadata: { count: totalCount }
          }
        ]}
        currentSection="flows"
        searchValue={search}
        searchPlaceholder={t('list-search-placeholder')}
        onSearchChange={value => {
          setSearch(value)
          setPagination(prev => ({ ...prev, pageIndex: 0 }))
        }}
        primaryAction={
          onCreateFlow
            ? {
                label: t('list-create'),
                onClick: onCreateFlow,
                icon: ListPlus
              }
            : undefined
        }
        secondaryActions={
          onImportFlow ? (
            <Button variant="outline" size="sm" type="button" onClick={onImportFlow} data-testid={`${testId}-import`}>
              <Upload className="gba:h-4 gba:w-4" />
              <span className="gba:sr-only">{t('studio-import-flow')}</span>
            </Button>
          ) : undefined
        }
        toolbarDensity="default"
      >
        <DataTable<FlowTemplateRow>
          data={data}
          columns={columns}
          loading={isLoading && !initialLoadDoneRef.current}
          error={null}
          tableLayout="fixed"
          enablePagination
          pagination={pagination}
          onPaginationChange={setPagination}
          totalCount={totalCount}
          rowsPerPageOptions={[10, 20, 50, 100]}
          enableSorting={false}
          emptyMessage={t('list-empty-title')}
          onRowClick={row => {
            const tplId = String(row.templateId || '').trim()
            if (tplId) onOpenTemplate(tplId)
          }}
          data-testid={`${testId}-table`}
        />
      </DataDisplay>
    </div>
  )
}
