import React, { useCallback, useEffect } from 'react'
import { DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { Code, KeyRound, List, ListPlus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateLayout } from '@/components/create-layout'
import { LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { FunctionEditor } from './components/FunctionEditor'
import { useFunctionsData } from './hooks/useFunctionsData'
import { createFunctionsColumns } from './config/functionsColumns'
import translations from './_i18n'
import { FunctionManagerSecretsView } from './components/FunctionManagerSecretsView'
import { tokenHasRole } from '@/common/utils/keycloakTokenRoles'

/** Matches functions-service + Keycloak: Create apps shell and secret CRUD for builders. */
const APPS_CREATOR_ROLE = 'apps-creator'

export interface FunctionManagerProps extends BusinessAppContextProps {
  className?: string
  'data-testid'?: string
}

const DATA_TEST_ID = 'FunctionManager'
const FUNCTION_ID_PARAM = 'functionId'
const FUNCTION_ID_NEW = 'new'
const VIEW_PARAM = 'view'

type ListView = 'functions' | 'credentials'

function getListViewFromUrl(): ListView {
  if (typeof globalThis.window === 'undefined') return 'functions'
  const v = new URLSearchParams(globalThis.location.search).get(VIEW_PARAM)?.trim()
  if (v === 'credentials' || v === 'secrets') return 'credentials'
  return 'functions'
}

/** Credentials tab aligns with API: `apps-creator`. Tenant migration UI stays `functions-secrets-manager` (see FunctionManagerSecretsView). */
function resolveListViewFromUrl(accessToken: string | undefined): ListView {
  const raw = getListViewFromUrl()
  if (raw === 'credentials' && !tokenHasRole(accessToken, APPS_CREATOR_ROLE)) {
    return 'functions'
  }
  return raw
}

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
  const showCredentialsTab = tokenHasRole(context.accessToken, APPS_CREATOR_ROLE)
  const [isCreateOpen, setIsCreateOpen] = React.useState(() => isFunctionIdNewFromUrl())
  const [editingFunctionId, setEditingFunctionId] = React.useState<string | null>(() => getFunctionIdFromUrl())
  const [listView, setListView] = React.useState<ListView>(() => resolveListViewFromUrl(context.accessToken))
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

  // Normalize legacy ?view=secrets → ?view=credentials; strip credentials view from URL if user lacks apps-creator
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return
    if (getFunctionIdFromUrl() || isFunctionIdNewFromUrl()) return
    const url = new URL(globalThis.location.href)
    const v = url.searchParams.get(VIEW_PARAM)?.trim()
    if (v === 'secrets') {
      url.searchParams.set(VIEW_PARAM, 'credentials')
      globalThis.history.replaceState(null, '', url.toString())
    }
    if (!showCredentialsTab && (v === 'credentials' || v === 'secrets')) {
      url.searchParams.delete(VIEW_PARAM)
      globalThis.history.replaceState(null, '', url.toString())
      setListView('functions')
    }
  }, [showCredentialsTab])

  // If apps-creator is removed while on credentials (e.g. token refresh), fall back to functions list
  useEffect(() => {
    if (showCredentialsTab || listView !== 'credentials') return
    setListView('functions')
    if (typeof globalThis.window === 'undefined') return
    const url = new URL(globalThis.location.href)
    url.searchParams.delete(VIEW_PARAM)
    globalThis.history.replaceState(null, '', url.toString())
  }, [showCredentialsTab, listView])

  // Sync state from URL on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const id = getFunctionIdFromUrl()
      const isNew = isFunctionIdNewFromUrl()
      setEditingFunctionId(id)
      setIsCreateOpen(isNew)
      if (!id && !isNew) setListView(resolveListViewFromUrl(context.accessToken))
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [context.accessToken])

  const openCreate = useCallback(() => {
    setIsCreateOpen(true)
    setEditingFunctionId(null)
    updateUrlWithFunctionId(FUNCTION_ID_NEW, true)
  }, [])

  const closeEditorToList = useCallback(() => {
    setEditingFunctionId(null)
    setIsCreateOpen(false)
    updateUrlWithFunctionId(null)
    setListView(resolveListViewFromUrl(context.accessToken))
  }, [context.accessToken])

  const navigateToTenantCredentials = useCallback(() => {
    if (!showCredentialsTab) return
    setEditingFunctionId(null)
    setIsCreateOpen(false)
    setListView('credentials')
    if (typeof globalThis.window === 'undefined') return
    const url = new URL(globalThis.location.href)
    url.searchParams.delete(FUNCTION_ID_PARAM)
    url.searchParams.set(VIEW_PARAM, 'credentials')
    globalThis.history.replaceState(null, '', url.toString())
  }, [showCredentialsTab])

  const handleListViewChange = useCallback(
    (value: string) => {
      const next = value === 'credentials' && showCredentialsTab ? 'credentials' : 'functions'
      setListView(next)
      if (typeof globalThis.window === 'undefined') return
      const url = new URL(globalThis.location.href)
      if (next === 'functions') url.searchParams.delete(VIEW_PARAM)
      else url.searchParams.set(VIEW_PARAM, 'credentials')
      globalThis.history.replaceState(null, '', url.toString())
    },
    [showCredentialsTab]
  )

  const overviewViews = React.useMemo(() => {
    const functionsTab = {
      value: 'functions',
      label: t('tab-functions'),
      icon: <List className="gba:h-4 gba:w-4" />
    }
    if (!showCredentialsTab) return [functionsTab]
    return [
      functionsTab,
      { value: 'credentials', label: t('tab-credentials'), icon: <KeyRound className="gba:h-4 gba:w-4" /> }
    ]
  }, [showCredentialsTab, t])

  const openCredentialsFromEditor = showCredentialsTab ? navigateToTenantCredentials : undefined

  if (isCreateOpen) {
    return (
      <div
        className={['gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background', className]
          .filter(Boolean)
          .join(' ')}
        data-testid={DATA_TEST_ID}
      >
        <FunctionEditor
          {...context}
          mode="create"
          function={null}
          heroTitle={t('create-function')}
          heroSubtitle={t('page-description')}
          onOpenTenantCredentials={openCredentialsFromEditor}
          onBack={closeEditorToList}
          onSaved={() => {
            setIsCreateOpen(false)
            updateUrlWithFunctionId(null)
            setListView(resolveListViewFromUrl(context.accessToken))
            refetch()
          }}
        />
      </div>
    )
  }

  if (editingFunction) {
    return (
      <div
        className={['gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background', className]
          .filter(Boolean)
          .join(' ')}
        data-testid={DATA_TEST_ID}
      >
        <FunctionEditor
          {...context}
          mode="edit"
          function={editingFunction}
          heroTitle={editingFunction.name}
          heroSubtitle={t('page-description')}
          onOpenTenantCredentials={openCredentialsFromEditor}
          onBack={closeEditorToList}
          onSaved={() => {
            setEditingFunctionId(null)
            updateUrlWithFunctionId(null)
            setListView(resolveListViewFromUrl(context.accessToken))
            refetch()
          }}
        />
      </div>
    )
  }

  return (
    <CreateLayout
      heroVariant="overview"
      heroOverline="Create"
      heroIcon={<Code className="gba:w-8 gba:h-8 gba:text-white" />}
      heroTitle={t('page-title')}
      heroSubtitle={t('page-description')}
      views={overviewViews}
      currentView={listView}
      onViewChange={handleListViewChange}
      canvasPanel={
        listView === 'credentials' ? (
          <FunctionManagerSecretsView accessToken={context.accessToken} />
        ) : (
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
        )
      }
      className={className}
      testId={DATA_TEST_ID}
    />
  )
}

export default FunctionManager
