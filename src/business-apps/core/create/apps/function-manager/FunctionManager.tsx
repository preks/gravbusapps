import React from 'react'
import '@newwork/nw-design-system/style'
import { Button, DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { Code, ListPlus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { FunctionEditor } from './components/FunctionEditor'
import { useFunctionsData } from './hooks/useFunctionsData'
import { createFunctionsColumns } from './config/functionsColumns'
import translations from './_i18n'
import { CreateHeroHeader } from '../../components/CreateHeroHeader'

export interface FunctionManagerProps extends BusinessAppContextProps {
  className?: string
  'data-testid'?: string
}

const DATA_TEST_ID = 'FunctionManager'

export const FunctionManager: React.FC<FunctionManagerProps> = ({ className, ...context }) => {
  const { t } = useTranslation(translations)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingFunctionId, setEditingFunctionId] = React.useState<string | null>(null)
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

  const handleRowClick = React.useCallback((fn: LatestFunctionItem) => setEditingFunctionId(fn.id), [])

  const editingFunction = editingFunctionId ? data.find(f => f.id === editingFunctionId) : null

  if (isCreateOpen) {
    return (
      <div
        className={['gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background', className]
          .filter(Boolean)
          .join(' ')}
        data-testid={DATA_TEST_ID}
      >
        <CreateHeroHeader
          icon={Code}
          appLabel="Create"
          title={t('create-function')}
          description={t('page-description')}
          data-testid={`${DATA_TEST_ID}-hero`}
        />
        <div className="gba:flex gba:flex-1 gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-hidden">
            <FunctionEditor
              {...context}
              mode="create"
              function={null}
              onBack={() => setIsCreateOpen(false)}
              onSaved={() => {
                setIsCreateOpen(false)
                refetch()
              }}
            />
          </div>
        </div>
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
        <CreateHeroHeader
          icon={Code}
          appLabel="Create"
          title={editingFunction.name}
          description={t('page-description')}
          data-testid={`${DATA_TEST_ID}-hero`}
        />
        <div className="gba:flex gba:flex-1 gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-hidden">
            <FunctionEditor
              {...context}
              mode="edit"
              function={editingFunction}
              onBack={() => setEditingFunctionId(null)}
              onSaved={() => {
                setEditingFunctionId(null)
                refetch()
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={['gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background', className].filter(Boolean).join(' ')}
      data-testid={DATA_TEST_ID}
    >
      <CreateHeroHeader
        icon={Code}
        appLabel="Create"
        title={t('page-title')}
        description={t('page-description')}
        actions={
          <Button
            variant="secondary"
            tone="inverse"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            data-testid={`${DATA_TEST_ID}-hero-create`}
            type="button"
          >
            <ListPlus className="gba:h-4 gba:w-4 gba:mr-1" />
            {t('new-function')}
          </Button>
        }
        data-testid={`${DATA_TEST_ID}-hero`}
      />
      <div className="gba:flex gba:flex-1 gba:overflow-hidden">
        <div className="gba:flex-1 gba:overflow-auto gba:p-6">
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
            sortableColumns={allColumns}
            toolbarDensity="default"
          >
            <DataTable<LatestFunctionItem>
              data={data}
              columns={columns}
              loading={loading}
              error={error}
              actions={[{ label: t('edit'), onClick: (fn: LatestFunctionItem) => setEditingFunctionId(fn.id) }]}
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
        </div>
      </div>
    </div>
  )
}

export default FunctionManager
