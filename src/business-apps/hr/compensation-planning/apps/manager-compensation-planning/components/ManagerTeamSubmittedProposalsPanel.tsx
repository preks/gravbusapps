import { useCallback, useMemo, useState } from 'react'
import { Button, DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { useManagerTeamSubmittedProposalsTableModel } from './useManagerTeamSubmittedProposalsTableModel'
import { SentBackProposalEditDialog } from './SentBackProposalEditDialog'
import type { SentBackProposalTableRow } from './sentBackProposalTableRow'
import type { SupervisorProposalTableRow } from './supervisorProposalTableRow'
import translations from '../_i18n'

export interface ManagerTeamSubmittedProposalsPanelProps {
  teamMembers: TeamMemberCompensationData[]
  currencyCode: string
  /** Pre-fetched employee budget rows for the team (org-unit scope filtered to team members in parent). */
  proposalRows: readonly CompensationBudgetPlanEmployeeRestRow[]
  proposalsLoading: boolean
  proposalsError: string | null
  onNewProposal: () => void
  accessToken: string | undefined
  managerEmployeeId: string | undefined
  /** After saving a sent-back revision (dialog). */
  onSentBackRevisionSaved?: () => void
}

export function ManagerTeamSubmittedProposalsPanel({
  teamMembers,
  currencyCode,
  proposalRows,
  proposalsLoading,
  proposalsError,
  onNewProposal,
  accessToken,
  managerEmployeeId,
  onSentBackRevisionSaved
}: Readonly<ManagerTeamSubmittedProposalsPanelProps>) {
  const { t } = useTranslation(translations)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const [editSentBackRow, setEditSentBackRow] = useState<SentBackProposalTableRow | null>(null)

  const memberById = useMemo(() => {
    const m = new Map<string, TeamMemberCompensationData>()
    for (const tm of teamMembers) {
      m.set(tm.employeeId, tm)
    }
    return m
  }, [teamMembers])

  const getEmployeeLabel = useCallback(
    (employeeId: string) => {
      const m = teamMembers.find(x => x.employeeId === employeeId)
      if (m) {
        return m.displayName || `${m.firstName} ${m.lastName}`.trim() || m.employeeCode
      }
      return t('supervisor-review-employee-unknown')
    },
    [teamMembers, t]
  )

  const tableSourceRows = useMemo(() => (proposalRows.length === 0 ? [] : [...proposalRows]), [proposalRows])

  const openSentBackEdit = useCallback((row: SupervisorProposalTableRow) => {
    setEditSentBackRow(row as SentBackProposalTableRow)
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
  } = useManagerTeamSubmittedProposalsTableModel(t, tableSourceRows, getEmployeeLabel, currencyCode, openSentBackEdit)

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="manager-team-submitted-proposals-panel">
      {proposalsError != null && proposalsError !== '' ? (
        <p className="gba:text-sm gba:text-destructive" data-testid="manager-team-submitted-proposals-error">
          {proposalsError}
        </p>
      ) : null}
      <SentBackProposalEditDialog
        open={editSentBackRow != null}
        onOpenChange={open => {
          if (!open) {
            setEditSentBackRow(null)
          }
        }}
        accessToken={accessToken}
        managerEmployeeId={managerEmployeeId}
        restClient={restClient}
        row={editSentBackRow}
        teamMember={editSentBackRow != null ? (memberById.get(editSentBackRow.employeeId) ?? null) : null}
        currencyCode={currencyCode}
        onSaved={async () => {
          onSentBackRevisionSaved?.()
        }}
      />
      <DataDisplay
        data-testid="manager-team-submitted-proposals-display"
        titleSections={[
          {
            id: 'manager-team-submitted-proposals',
            label: t('manager-team-submitted-proposals-title'),
            metadata: { count: filteredRows.length, isLoading: proposalsLoading }
          }
        ]}
        currentSection="manager-team-submitted-proposals"
        toolbarDensity="default"
        searchValue={searchInput}
        searchPlaceholder={t('supervisor-review-table-search-placeholder')}
        onSearchChange={setSearchInput}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumnsForDisplay}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          <div className="gba:flex gba:min-w-0 gba:items-center gba:justify-end gba:gap-2 gba:pl-2 gba:md:pl-3">
            <Button type="button" variant="default" data-testid="manager-team-new-proposal" onClick={onNewProposal}>
              {t('manager-team-new-proposal')}
            </Button>
          </div>
        }
      >
        <>
          <TooltipProvider>
            <DataTable<SupervisorProposalTableRow>
              data={filteredRows}
              columns={visibleTableColumns}
              loading={proposalsLoading}
              sorting={sorting}
              onSortingChange={setSorting}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              enablePagination
              enableSorting
              enableSelection={false}
              enableColumnPinning={false}
              enableResizing={false}
              tableLayout="auto"
              rowsPerPageOptions={[10, 20, 50, 100]}
              showPageNumbers
              maxVisiblePages={7}
              emptyMessage={emptyMessage}
              data-testid="manager-team-submitted-proposals-table"
            />
          </TooltipProvider>
        </>
      </DataDisplay>
    </div>
  )
}
