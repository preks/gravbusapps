import React, { useCallback, useEffect } from 'react'
import { CreateLayout, DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { CodeIcon, KeyIcon, ListIcon, PlusIcon } from '@phosphor-icons/react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import {
  FUNCTION_CATEGORIES,
  type FunctionCategory,
  type LatestFunctionItem
} from '@/common/network/functions/FunctionsServiceClient'
import { deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { FunctionEditor } from './components/FunctionEditor'
import { useFunctionsData, type CategoryFilter } from './hooks/useFunctionsData'
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
    allItems,
    total,
    categoryCounts,
    loading,
    error,
    search,
    setSearch,
    category,
    setCategory,
    pagination,
    setPagination,
    visibleColumns,
    setVisibleColumns,
    refetch
  } = useFunctionsData(context.accessToken, sorting)

  const categoryLabels: Record<CategoryFilter, string> = React.useMemo(
    () => ({
      All: t('category-all'),
      General: t('category-general'),
      HR: t('category-hr'),
      CRM: t('category-crm'),
      Expenses: t('category-expenses'),
      Office: t('category-office'),
      Service: t('category-service'),
      Custom: t('category-custom')
    }),
    [t]
  )

  const categoryTitleSections = React.useMemo(() => {
    const tabs: CategoryFilter[] = ['All', ...FUNCTION_CATEGORIES]
    return tabs.map(value => ({
      id: value,
      label: categoryLabels[value],
      metadata: { count: categoryCounts[value] ?? 0 }
    }))
  }, [categoryCounts, categoryLabels])

  const handleCategorySectionChange = React.useCallback(
    (value: string) => {
      if (value === 'All') {
        setCategory('All')
        return
      }
      if ((FUNCTION_CATEGORIES as readonly string[]).includes(value)) {
        setCategory(value as FunctionCategory)
      }
    },
    [setCategory]
  )

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

  // Use the full unpaginated list so deep-links (?functionId=) resolve even when the target
  // function is not on the current page slice. Falls back to `data` (current page) only for safety.
  const editingFunction = editingFunctionId
    ? (allItems.find(f => f.id === editingFunctionId) ?? data.find(f => f.id === editingFunctionId) ?? null)
    : null

  // Clear editingFunctionId from URL only when the id is truly not in the loaded full list (invalid id).
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
      icon: <ListIcon className="gba:h-4 gba:w-4" />
    }
    if (!showCredentialsTab) return [functionsTab]
    return [
      functionsTab,
      { value: 'credentials', label: t('tab-credentials'), icon: <KeyIcon className="gba:h-4 gba:w-4" /> }
    ]
  }, [showCredentialsTab, t])

  const openCredentialsFromEditor = showCredentialsTab ? navigateToTenantCredentials : undefined

  if (isCreateOpen) {
    return (
      <FunctionEditor
        {...context}
        mode="create"
        function={null}
        heroTitle={t('create-function')}
        heroSubtitle={t('page-description')}
        onBack={closeEditorToList}
        onOpenTenantCredentials={openCredentialsFromEditor}
        onSaved={() => {
          setIsCreateOpen(false)
          updateUrlWithFunctionId(null)
          setListView(resolveListViewFromUrl(context.accessToken))
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
        onOpenTenantCredentials={openCredentialsFromEditor}
        onSaved={() => {
          setEditingFunctionId(null)
          updateUrlWithFunctionId(null)
          setListView(resolveListViewFromUrl(context.accessToken))
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
      heroIcon={<CodeIcon className="gba:w-8 gba:h-8 gba:text-white" />}
      heroTitle={t('page-title')}
      heroSubtitle={t('page-description')}
      heroBackground={<PremiumHeroBackground />}
      views={overviewViews}
      currentView={listView}
      onViewChange={handleListViewChange}
      canvasPanel={
        listView === 'credentials' ? (
          <FunctionManagerSecretsView accessToken={context.accessToken} />
        ) : (
          <DataDisplay
            titleSections={categoryTitleSections}
            currentSection={category}
            onSectionChange={handleCategorySectionChange}
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
              icon: PlusIcon
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
      data-testid={DATA_TEST_ID}
    />
  )
}

export default FunctionManager
