import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import { saveCompensationBudgetPlanEmployee } from '../../../api/saveCompensationBudgetPlan'
import { useCompensationBudgetPlanEmployeesByOrgUnitIds } from '../../../hooks/useCompensationBudgetPlanEmployeesByOrgUnitIds'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import {
  buildSupervisorApproveEmployeeProposalBody,
  buildSupervisorSendBackEmployeeProposalBody
} from '../../../utils/buildSupervisorEmployeeProposalRestBodies'
import type { SupervisorSubmittedProposalsSelectionParams } from './buildSupervisorSubmittedProposalsTableColumns'
import { SupervisorReviewSendBackDialog } from './SupervisorReviewSendBackDialog'
import { SupervisorSubmittedProposalsDataDisplay } from './SupervisorSubmittedProposalsDataDisplay'
import { useSupervisorSubmittedProposalsTableModel } from './useSupervisorSubmittedProposalsTableModel'
import { rollupTeamOrgUnitBudgetAfterSupervisorApprovals } from '../../../utils/rollupTeamOrgUnitBudgetAfterSupervisorApprovals'
import translations from '../_i18n'

const SUPERVISOR_REVIEW_TABLE_STATUSES = new Set(['BUDGET_PLAN_SUBMITTED', 'BUDGET_PLAN_DRAFT'])

export interface SupervisorOrgUnitProposalReviewProps {
  accessToken: string | undefined
  supervisorEmployeeId: string | undefined
  /** `compensation_budget_plan_organizational_unit.id` for this team. */
  planOuRowId: string
  organizationalUnitLabel: string
  currencyCode: string
  employeeDisplayNameById: ReadonlyMap<string, string>
  /** Refetch manager budget / team context after approve or send-back (GraphQL + probes). */
  onSupervisorReviewDataChanged?: () => void
}

function submittedRowsSelectionSignature(rows: readonly CompensationBudgetPlanEmployeeRestRow[]): string {
  return rows
    .map(r => r.id)
    .sort((a, b) => a.localeCompare(b))
    .join(',')
}

export function SupervisorOrgUnitProposalReview({
  accessToken,
  supervisorEmployeeId,
  planOuRowId,
  organizationalUnitLabel,
  currencyCode,
  employeeDisplayNameById,
  onSupervisorReviewDataChanged
}: Readonly<SupervisorOrgUnitProposalReviewProps>) {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken ?? '')
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const orgUnitIds = useMemo(() => [planOuRowId], [planOuRowId])
  const { rows, loading, error, refetch } = useCompensationBudgetPlanEmployeesByOrgUnitIds(accessToken, orgUnitIds)

  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sendBackError, setSendBackError] = useState<string | null>(null)
  const [sendBackOpen, setSendBackOpen] = useState(false)
  const [sendBackNotes, setSendBackNotes] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const reviewTableRows = useMemo(
    () => rows.filter(r => SUPERVISOR_REVIEW_TABLE_STATUSES.has(r.budgetPlanStatus)),
    [rows]
  )

  const submittedRows = useMemo(() => rows.filter(r => r.budgetPlanStatus === 'BUDGET_PLAN_SUBMITTED'), [rows])

  const draftRows = useMemo(() => rows.filter(r => r.budgetPlanStatus === 'BUDGET_PLAN_DRAFT'), [rows])

  const selectableRowIds = useMemo(() => new Set(submittedRows.map(r => r.id)), [submittedRows])

  const reviewTableSignature = useMemo(() => submittedRowsSelectionSignature(reviewTableRows), [reviewTableRows])

  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set<string>()
      for (const id of prev) {
        if (selectableRowIds.has(id)) {
          next.add(id)
        }
      }
      if (next.size === prev.size && [...prev].every(id => next.has(id))) {
        return prev
      }
      return next
    })
  }, [reviewTableSignature, selectableRowIds])

  const selectedRows = useMemo(() => submittedRows.filter(r => selectedIds.has(r.id)), [submittedRows, selectedIds])

  const allSubmittedSelected = submittedRows.length > 0 && submittedRows.every(r => selectedIds.has(r.id))
  const someSubmittedSelected = submittedRows.some(r => selectedIds.has(r.id)) && !allSubmittedSelected

  const getEmployeeLabel = useCallback(
    (employeeId: string) => employeeDisplayNameById.get(employeeId) ?? t('supervisor-review-employee-unknown'),
    [employeeDisplayNameById, t]
  )

  const toggleRow = useCallback(
    (id: string, checked: boolean) => {
      if (!selectableRowIds.has(id)) {
        return
      }
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (checked) {
          next.add(id)
        } else {
          next.delete(id)
        }
        return next
      })
    },
    [selectableRowIds]
  )

  const selectAllSubmitted = useCallback(
    (select: boolean) => {
      if (select) {
        setSelectedIds(new Set(submittedRows.map(r => r.id)))
        return
      }
      setSelectedIds(new Set())
    },
    [submittedRows]
  )

  const selectionParams = useMemo<SupervisorSubmittedProposalsSelectionParams>(
    () => ({
      selectedIds,
      busy,
      allSubmittedSelected,
      someSubmittedSelected,
      selectableRowIds,
      submittedRowCount: submittedRows.length,
      onToggleRow: toggleRow,
      onSelectAllSubmitted: selectAllSubmitted,
      getEmployeeLabel,
      t
    }),
    [
      selectedIds,
      busy,
      allSubmittedSelected,
      someSubmittedSelected,
      selectableRowIds,
      submittedRows.length,
      toggleRow,
      selectAllSubmitted,
      getEmployeeLabel,
      t
    ]
  )

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
  } = useSupervisorSubmittedProposalsTableModel(t, reviewTableRows, getEmployeeLabel, currencyCode, selectionParams)

  const runApproveSelected = useCallback(async () => {
    setActionError(null)
    if (!accessToken || !supervisorEmployeeId) {
      setActionError(t('supervisor-review-no-auth'))
      return
    }
    if (submittedRows.length === 0) {
      setActionError(t('supervisor-review-no-submitted'))
      return
    }
    if (selectedRows.length === 0) {
      setActionError(t('supervisor-review-none-selected'))
      return
    }
    setBusy(true)
    try {
      for (const row of selectedRows) {
        const body = buildSupervisorApproveEmployeeProposalBody(row, supervisorEmployeeId)
        await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
      }
      await rollupTeamOrgUnitBudgetAfterSupervisorApprovals(
        graphqlClient,
        restClient,
        accessToken,
        planOuRowId,
        selectedRows
      )
      setSelectedIds(new Set())
      await refetch()
      onSupervisorReviewDataChanged?.()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('supervisor-review-error-generic')
      setActionError(msg)
    } finally {
      setBusy(false)
    }
  }, [
    accessToken,
    graphqlClient,
    onSupervisorReviewDataChanged,
    planOuRowId,
    refetch,
    restClient,
    selectedRows,
    submittedRows.length,
    supervisorEmployeeId,
    t
  ])

  const runSendBack = useCallback(async () => {
    setActionError(null)
    setSendBackError(null)
    if (!accessToken || !supervisorEmployeeId) {
      setSendBackError(t('supervisor-review-no-auth'))
      return
    }
    if (submittedRows.length === 0) {
      setSendBackError(t('supervisor-review-no-submitted'))
      return
    }
    if (selectedRows.length === 0) {
      setSendBackError(t('supervisor-review-none-selected'))
      return
    }
    const notes = sendBackNotes.trim()
    if (notes === '') {
      return
    }
    setBusy(true)
    try {
      for (const row of selectedRows) {
        const body = buildSupervisorSendBackEmployeeProposalBody(row, supervisorEmployeeId, notes)
        await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
      }
      setSendBackOpen(false)
      setSendBackNotes('')
      setSelectedIds(new Set())
      setSendBackError(null)
      await refetch()
      onSupervisorReviewDataChanged?.()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('supervisor-review-error-generic')
      setSendBackError(msg)
    } finally {
      setBusy(false)
    }
  }, [
    accessToken,
    onSupervisorReviewDataChanged,
    refetch,
    restClient,
    selectedRows,
    sendBackNotes,
    submittedRows.length,
    supervisorEmployeeId,
    t
  ])

  return (
    <>
      <Card className="gba:w-full gba:shadow-sm" data-testid="supervisor-org-unit-proposal-review">
        <CardHeader className="gba:space-y-1 gba:border-b gba:border-border gba:pb-4">
          <CardTitle className="gba:text-lg">{t('supervisor-review-card-title')}</CardTitle>
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{organizationalUnitLabel}</p>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-0 gba:pt-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {actionError ? (
            <Alert variant="destructive" data-testid="supervisor-review-action-error">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}
          {loading ? (
            <div
              className="gba:flex gba:min-h-32 gba:flex-col gba:items-center gba:justify-center gba:gap-2"
              data-testid="supervisor-review-loading"
            >
              <Spinner className="gba:h-8 gba:w-8" />
              <span className="gba:text-sm gba:text-muted-foreground">{t('supervisor-review-loading')}</span>
            </div>
          ) : (
            <>
              <div className="gba:space-y-1">
                <p className="gba:text-sm gba:leading-relaxed gba:text-foreground">
                  {t('supervisor-review-submitted-count', { count: submittedRows.length })}
                </p>
                {draftRows.length > 0 ? (
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {t('supervisor-review-draft-in-table', { count: draftRows.length })}
                  </p>
                ) : null}
              </div>
              {reviewTableRows.length > 0 ? (
                <SupervisorSubmittedProposalsDataDisplay
                  t={t}
                  busy={busy}
                  selectedIds={selectedIds}
                  searchInput={searchInput}
                  setSearchInput={setSearchInput}
                  sorting={sorting}
                  setSorting={setSorting}
                  pagination={pagination}
                  visibleColumns={visibleColumns}
                  setVisibleColumns={setVisibleColumns}
                  filteredRows={filteredRows}
                  emptyMessage={emptyMessage}
                  visibleTableColumns={visibleTableColumns}
                  sortableColumns={sortableColumns}
                  availableColumnsForDisplay={availableColumnsForDisplay}
                  handlePaginationChange={handlePaginationChange}
                  onApproveSelected={runApproveSelected}
                  onSendBackOpen={() => {
                    setActionError(null)
                    setSendBackError(null)
                    setSendBackOpen(true)
                  }}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <SupervisorReviewSendBackDialog
        open={sendBackOpen}
        onOpenChange={open => {
          setSendBackOpen(open)
          if (!open) {
            setSendBackError(null)
          }
        }}
        sendBackNotes={sendBackNotes}
        onSendBackNotesChange={v => {
          setSendBackNotes(v)
          setSendBackError(null)
        }}
        busy={busy}
        onConfirm={runSendBack}
        errorMessage={sendBackError}
        t={t}
      />
    </>
  )
}
