'use client'

import React from 'react'
import { DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { PlusIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import type { SortingState } from '@tanstack/react-table'
import { deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import type { StoredSecretOption } from './editor/SettingsEditor'
import translations from '../_i18n'
import { createCredentialsColumns, CREDENTIALS_TABLE_COLUMN_IDS } from '../config/credentialsColumns'

export interface CredentialsListPanelProps {
  secrets: StoredSecretOption[]
  loading: boolean
  onRefreshSecrets: () => void | Promise<void>
  onRowClick: (row: StoredSecretOption) => void
  onNewCredential: () => void
  'data-testid'?: string
}

const DEFAULT_VISIBLE = [...CREDENTIALS_TABLE_COLUMN_IDS] as string[]

export const CredentialsListPanel: React.FC<CredentialsListPanelProps> = ({
  secrets,
  loading,
  onRefreshSecrets,
  onRowClick,
  onNewCredential,
  'data-testid': testId = 'FunctionManager-credentials-panel'
}) => {
  const { t } = useTranslation(translations)
  const [search, setSearch] = React.useState('')
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'displayName', desc: false }])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(DEFAULT_VISIBLE)
  const [refreshing, setRefreshing] = React.useState(false)

  const allColumns = React.useMemo(() => createCredentialsColumns(t), [t])
  const availableColumns = React.useMemo(() => deriveAvailableColumns(allColumns), [allColumns])
  const columns = React.useMemo(
    () => allColumns.filter(col => visibleColumns.includes(col.id as string)),
    [allColumns, visibleColumns]
  )

  const titleSections = React.useMemo(
    () => [{ id: 'all', label: t('credentials-section-all'), metadata: { count: secrets.length } }],
    [secrets.length, t]
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = [...secrets].sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }))
    if (!q) return base
    return base.filter(s => s.displayName.toLowerCase().includes(q))
  }, [secrets, search])

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await onRefreshSecrets()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <DataDisplay
      titleSections={titleSections}
      currentSection="all"
      onSectionChange={() => {}}
      searchValue={search}
      searchPlaceholder={t('credentials-search-placeholder')}
      onSearchChange={setSearch}
      availableColumns={availableColumns}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      sorting={sorting}
      onSortingChange={setSorting}
      sortableColumns={availableColumns}
      secondaryActions={[
        {
          label: t('credentials-refresh'),
          onClick: () => {
            if (refreshing || loading) return
            void handleRefresh()
          },
          icon: ArrowClockwiseIcon
        }
      ]}
      primaryAction={{
        label: t('new-credential'),
        onClick: onNewCredential,
        icon: PlusIcon
      }}
      toolbarDensity="default"
    >
      <DataTable<StoredSecretOption>
        data={filtered}
        columns={columns}
        loading={loading}
        error={null}
        actions={[{ label: t('edit'), onClick: (row: StoredSecretOption) => onRowClick(row) }]}
        tableLayout="fixed"
        enableColumnPinning
        enableSorting
        sorting={sorting}
        onSortingChange={setSorting}
        enablePagination
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={filtered.length}
        rowsPerPageOptions={[10, 20, 50, 100]}
        emptyMessage={t('credentials-empty')}
        onRowClick={onRowClick}
        data-testid={`${testId}-table`}
      />
    </DataDisplay>
  )
}

export default CredentialsListPanel
