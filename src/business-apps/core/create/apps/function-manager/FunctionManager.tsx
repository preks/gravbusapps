import React from 'react'
import '@newwork/nw-design-system/style'
import { Button, PageLayout, DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { Code } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { FunctionEditor } from './components/FunctionEditor'
import { useFunctionsData } from './hooks/useFunctionsData'
import { createFunctionsColumns } from './config/functionsColumns'
import translations from './_i18n'

export interface FunctionManagerProps extends BusinessAppContextProps {
  className?: string
  'data-testid'?: string
}

const DATA_TEST_ID = 'FunctionManager'

export const FunctionManager: React.FC<FunctionManagerProps> = ({ className, ...context }) => {
  const { t } = useTranslation(translations)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingFunctionId, setEditingFunctionId] = React.useState<string | null>(null)

  const { data, total, loading, error, search, setSearch, pagination, setPagination, refetch } = useFunctionsData(
    context.accessToken
  )

  const columns = React.useMemo(() => createFunctionsColumns(t), [t])

  const editingFunction = editingFunctionId ? data.find(f => f.id === editingFunctionId) : null

  if (isCreateOpen) {
    return (
      <div className={`gba:w-full ${className || ''}`} data-testid={DATA_TEST_ID}>
        <PageLayout
          headerIcon={Code}
          headerTitle={t('create-function')}
          headerDescription={t('page-description')}
          onBack={() => setIsCreateOpen(false)}
          className="gba:min-h-screen"
        >
          <FunctionEditor
            {...context}
            mode="create"
            function={null}
            onSaved={() => {
              setIsCreateOpen(false)
              refetch()
            }}
          />
        </PageLayout>
      </div>
    )
  }

  if (editingFunction) {
    return (
      <div className={`gba:w-full ${className || ''}`} data-testid={DATA_TEST_ID}>
        <PageLayout
          headerIcon={Code}
          headerTitle={editingFunction.name}
          headerDescription={t('page-description')}
          onBack={() => setEditingFunctionId(null)}
          className="gba:min-h-screen"
        >
          <FunctionEditor
            {...context}
            mode="edit"
            function={editingFunction}
            onSaved={() => {
              setEditingFunctionId(null)
              refetch()
            }}
          />
        </PageLayout>
      </div>
    )
  }

  return (
    <div className={`gba:w-full ${className || ''}`} data-testid={DATA_TEST_ID}>
      <PageLayout
        headerIcon={Code}
        headerTitle={t('page-title')}
        headerDescription={t('page-description')}
        className="gba:min-h-screen"
      >
        <DataDisplay
          titleSections={[
            {
              id: 'functions',
              label: t('section-label'),
              metadata: { count: total }
            }
          ]}
          currentSection="functions"
          primaryAction={
            <Button variant="default" onClick={() => setIsCreateOpen(true)} data-testid={`${DATA_TEST_ID}-new-button`}>
              {t('new-function')}
            </Button>
          }
          searchValue={search}
          searchPlaceholder={t('search-placeholder')}
          onSearchChange={setSearch}
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
            enablePagination
            pagination={pagination}
            onPaginationChange={setPagination}
            totalCount={total}
            rowsPerPageOptions={[10, 20, 50, 100]}
            emptyMessage={t('empty-message')}
            data-testid={`${DATA_TEST_ID}-table`}
          />
        </DataDisplay>
      </PageLayout>
    </div>
  )
}

export default FunctionManager
