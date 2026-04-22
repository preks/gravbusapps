import React, { useCallback, useMemo, useState } from 'react'
import { Button, DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { useSentBackProposalsForManagerTeam } from '../hooks/useSentBackProposalsForManagerTeam'
import translations from '../_i18n'
import { SentBackProposalEditDialog } from './SentBackProposalEditDialog'
import type { SentBackProposalTableRow } from './sentBackProposalTableRow'
import { useSentBackProposalsTableModel } from './useSentBackProposalsTableModel'

export interface ManagerSentBackProposalsPanelProps {
  accessToken: string | undefined
  managerEmployeeId: string | undefined
  companyId: string
  activeCompensationBudgetPlanId: string | null
  teamMembers: TeamMemberCompensationData[]
  currencyCode: string
  onBack: () => void
}

export function ManagerSentBackProposalsPanel({
  accessToken,
  managerEmployeeId,
  companyId,
  activeCompensationBudgetPlanId,
  teamMembers,
  currencyCode,
  onBack
}: Readonly<ManagerSentBackProposalsPanelProps>) {
  const { t } = useTranslation(translations)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)

  const teamMemberIds = useMemo(() => teamMembers.map(m => m.employeeId), [teamMembers])
  const memberById = useMemo(() => {
    const m = new Map<string, TeamMemberCompensationData>()
    for (const tm of teamMembers) {
      m.set(tm.employeeId, tm)
    }
    return m
  }, [teamMembers])

  const { sentBackRows, loading, error, refetchSentBack } = useSentBackProposalsForManagerTeam({
    accessToken,
    companyId,
    planId: activeCompensationBudgetPlanId,
    teamMemberEmployeeIds: teamMemberIds
  })

  const [editRow, setEditRow] = useState<SentBackProposalTableRow | null>(null)

  const sourceRows: SentBackProposalTableRow[] = useMemo(
    () =>
      sentBackRows.map(r => ({
        ...r,
        employeeDisplayName:
          memberById.get(r.employeeId)?.displayName ?? memberById.get(r.employeeId)?.employeeCode ?? r.employeeId
      })),
    [memberById, sentBackRows]
  )

  const openEdit = useCallback((row: SentBackProposalTableRow) => {
    setEditRow(row)
  }, [])

  const {
    searchInput,
    setSearchInput,
    sorting,
    setSorting,
    pagination,
    visibleColumns,
    setVisibleColumns,
    filteredRows,
    emptyMessage,
    visibleTableColumns,
    sortableColumns,
    availableColumnsForDisplay,
    handlePaginationChange
  } = useSentBackProposalsTableModel(t, currencyCode, sourceRows, openEdit)

  const planMissing = activeCompensationBudgetPlanId == null

  return (
    <div className="gba:flex gba:min-h-0 gba:flex-col gba:gap-4" data-testid="manager-sent-back-proposals-panel">
      <Button
        type="button"
        variant="ghost"
        className="gba:-ms-2 gba:self-start gba:gap-2 gba:px-2"
        data-testid="manager-sent-back-proposals-back"
        onClick={onBack}
      >
        <ArrowLeftIcon className="gba:size-4" aria-hidden />
        {t('sent-back-back-to-team')}
      </Button>

      <SentBackProposalEditDialog
        open={editRow != null}
        onOpenChange={open => {
          if (!open) {
            setEditRow(null)
          }
        }}
        accessToken={accessToken}
        managerEmployeeId={managerEmployeeId}
        restClient={restClient}
        row={editRow}
        teamMember={editRow ? (memberById.get(editRow.employeeId) ?? null) : null}
        currencyCode={currencyCode}
        onSaved={async () => {
          await refetchSentBack()
        }}
      />

      {planMissing ? (
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="manager-sent-back-no-plan">
          {t('sent-back-no-active-plan')}
        </p>
      ) : (
        <DataDisplay
          data-testid="manager-sent-back-proposals-display"
          titleSections={[
            {
              id: 'sent-back-proposals',
              label: t('sent-back-table-section-title'),
              metadata: { count: filteredRows.length, isLoading: loading }
            }
          ]}
          currentSection="sent-back-proposals"
          toolbarDensity="default"
          searchValue={searchInput}
          searchPlaceholder={t('sent-back-table-search-placeholder')}
          onSearchChange={setSearchInput}
          sorting={sorting}
          sortableColumns={sortableColumns}
          onSortingChange={setSorting}
          availableColumns={availableColumnsForDisplay}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
        >
          <TooltipProvider>
            <DataTable<SentBackProposalTableRow>
              data={filteredRows}
              columns={visibleTableColumns}
              loading={loading}
              error={error ?? undefined}
              sorting={sorting}
              onSortingChange={setSorting}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              enablePagination
              enableSorting
              enableSelection={false}
              enableColumnPinning
              enableResizing={false}
              tableLayout="auto"
              rowsPerPageOptions={[10, 20, 50, 100]}
              showPageNumbers
              maxVisiblePages={7}
              emptyMessage={emptyMessage}
              data-testid="manager-sent-back-proposals-table"
            />
          </TooltipProvider>
        </DataDisplay>
      )}
    </div>
  )
}
