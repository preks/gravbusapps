import React, { useCallback, useEffect } from 'react'
import { DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { Code, ListPlus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateLayout } from '@/components/create-layout'
import { LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { FunctionEditor } from './components/FunctionEditor'
import { useFunctionsData } from './hooks/useFunctionsData'
import { createFunctionsColumns } from './config/functionsColumns'
import translations from './_i18n'

export interface FunctionManagerProps extends BusinessAppContextProps {
  className?: string
  'data-testid'?: string
}

const DATA_TEST_ID = 'FunctionManager'
const FUNCTION_ID_PARAM = 'functionId'
const FUNCTION_ID_NEW = 'new'

function getFunctionIdFromUrl(): string | null {
  if (typeof globalThis.window === 'undefined') return null
  const urlParams = new URLSearchParams(globalThis.location.search)
  const id = urlParams.get(FUNCTION_ID_PARAM)?.trim() ?? ''
  if (!id || id.toLowerCase() === FUNCTION_ID_NEW) return null
  return id
}

function isFunctionIdNewFromUrl(): boolean {
  if (typeof globalThis.window === 'undefined') return false
  const urlParams = new URLSearchParams(globalThis.location.search)
  const id = urlParams.get(FUNCTION_ID_PARAM)?.trim() ?? ''
  return id.toLowerCase() === FUNCTION_ID_NEW
}

function updateUrlWithFunctionId(functionId: string | null, push = false): void {
  if (typeof globalThis.window === 'undefined') return
  const urlParams = new URLSearchParams(globalThis.location.search)
  if (functionId) {
    urlParams.set(FUNCTION_ID_PARAM, functionId)
  } else {
    urlParams.delete(FUNCTION_ID_PARAM)
  }
  const newUrl = `${globalThis.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${globalThis.location.hash}`
  if (push) {
    globalThis.history.pushState({}, '', newUrl)
  } else {
    globalThis.history.replaceState({}, '', newUrl)
  }
}

export const FunctionManager: React.FC<FunctionManagerProps> = ({ className, ...context }) => {
  const { t } = useTranslation(translations)
  const [isCreateOpen, setIsCreateOpen] = React.useState(() => isFunctionIdNewFromUrl())
  const [editingFunctionId, setEditingFunctionId] = React.useState<string | null>(() => getFunctionIdFromUrl())
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'lastVersionAt', desc: true }])

  const {
    data,
    total,
    loading,
    error,
    search,
    setSearch,
    pagination,
    setPagination,
    visibleColumns,
    setVisibleColumns,
    refetch
  } = useFunctionsData(context.accessToken, sorting)

  // Build columns on each render so headers always match current locale
  const allColumns = createFunctionsColumns(t)
  const availableColumns = React.useMemo(() => deriveAvailableColumns(allColumns), [allColumns])
  const columns = React.useMemo(
    () => allColumns.filter(col => visibleColumns.includes(col.id as string)),
    [allColumns, visibleColumns]
  )

  const handleRowClick = React.useCallback((fn: LatestFunctionItem) => {
    setEditingFunctionId(fn.id)
    setIsCreateOpen(false)
    updateUrlWithFunctionId(fn.id, true)
  }, [])

  const editingFunction = editingFunctionId ? data.find(f => f.id === editingFunctionId) : null

  // Clear editingFunctionId from URL if the function is not in loaded data (e.g. invalid id or not in page)
  useEffect(() => {
    if (!loading && editingFunctionId && !editingFunction) {
      setEditingFunctionId(null)
      updateUrlWithFunctionId(null)
    }
  }, [loading, editingFunctionId, editingFunction])

  // Sync state from URL on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const id = getFunctionIdFromUrl()
      const isNew = isFunctionIdNewFromUrl()
      setEditingFunctionId(id)
      setIsCreateOpen(isNew)
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const openCreate = useCallback(() => {
    setIsCreateOpen(true)
    setEditingFunctionId(null)
    updateUrlWithFunctionId(FUNCTION_ID_NEW, true)
  }, [])

  const closeEditorToList = useCallback(() => {
    setEditingFunctionId(null)
    setIsCreateOpen(false)
    updateUrlWithFunctionId(null)
  }, [])

  if (isCreateOpen) {
    return (
      <FunctionEditor
        {...context}
        mode="create"
        function={null}
        heroTitle={t('create-function')}
        heroSubtitle={t('page-description')}
        onBack={closeEditorToList}
        onSaved={() => {
          setIsCreateOpen(false)
          updateUrlWithFunctionId(null)
          refetch()
        }}
        className={className}
        data-testid={DATA_TEST_ID}
      />
    )
  }

  if (editingFunction) {
    return (
      <FunctionEditor
        {...context}
        mode="edit"
        function={editingFunction}
        heroTitle={editingFunction.name}
        heroSubtitle={t('page-description')}
        onBack={closeEditorToList}
        onSaved={() => {
          setEditingFunctionId(null)
          updateUrlWithFunctionId(null)
          refetch()
        }}
        className={className}
        data-testid={DATA_TEST_ID}
      />
    )
  }

  return (
    <CreateLayout
      heroVariant="overview"
      heroOverline="Create"
      heroIcon={<Code className="gba:w-8 gba:h-8 gba:text-white" />}
      heroTitle={t('page-title')}
      heroSubtitle={t('page-description')}
      canvasPanel={
        <DataDisplay
          titleSections={[
            {
              id: 'functions',
              label: t('section-label'),
              metadata: { count: total }
            }
          ]}
          currentSection="functions"
          searchValue={search}
          searchPlaceholder={t('search-placeholder')}
          onSearchChange={setSearch}
          availableColumns={availableColumns}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          sorting={sorting}
          onSortingChange={setSorting}
          sortableColumns={availableColumns}
          primaryAction={{
            label: t('new-function'),
            onClick: openCreate,
            icon: ListPlus
          }}
          toolbarDensity="default"
        >
          <DataTable<LatestFunctionItem>
            data={data}
            columns={columns}
            loading={loading}
            error={error}
            actions={[{ label: t('edit'), onClick: (fn: LatestFunctionItem) => handleRowClick(fn) }]}
            tableLayout="fixed"
            enableColumnPinning={true}
            enableSorting
            sorting={sorting}
            onSortingChange={setSorting}
            enablePagination
            pagination={pagination}
            onPaginationChange={setPagination}
            totalCount={total}
            rowsPerPageOptions={[10, 20, 50, 100]}
            emptyMessage={t('empty-message')}
            onRowClick={handleRowClick}
            data-testid={`${DATA_TEST_ID}-table`}
          />
        </DataDisplay>
      }
      className={className}
      testId={DATA_TEST_ID}
    />
  )
}

export default FunctionManager
