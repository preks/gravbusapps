import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DataDisplay,
  Textarea,
  toast
} from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckIcon, XIcon } from '@phosphor-icons/react'
import { CatalogEntry, useCatalogEntries } from '@/common/data/catalog'
import type { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { TabDataTable } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/TabDataTable'
import {
  BENEFIT_TYPE_CATALOG,
  BENEFIT_TYPE_VERSION,
  BENEFIT_PROVIDER_CATALOG,
  BENEFIT_PROVIDER_VERSION
} from '../constants/benefitsMaintenanceConstants'
import { PendingBenefitTask } from '../hooks/usePendingBenefitApprovals'
import type { BenefitsFilterConfiguration, BenefitsTranslationFn } from '../types/benefitsMaintenanceTypes'
import { formatDate } from '@/common/utils/windowUtils'

type ApprovalAction = 'approve' | 'reject'

interface ActionState {
  task: PendingBenefitTask
  action: ApprovalAction
}

interface BenefitPendingApprovalsViewProps {
  t: BenefitsTranslationFn
  accessToken: string
  tasks: PendingBenefitTask[]
  totalCount: number
  isLoading: boolean
  isActioning: boolean
  error: Error | null
  refetch: () => Promise<void>
  approve: (task: FlowExecutionTask, userId?: string, reason?: string) => Promise<void>
  reject: (task: FlowExecutionTask, userId?: string, reason?: string) => Promise<void>
  userId?: string
}

type NameMap = Map<string, string>

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatRequestedDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return formatDate(dateStr, 'date.medium') ?? dateStr
}

function formatAmount(amount: string, currency: string): string {
  if (!amount) return '-'
  return currency ? `${amount} ${currency}` : amount
}

function renderEmployeeCell(name: string, picture: string | null) {
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
      <Avatar size="sm">
        <AvatarImage src={picture ?? undefined} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="gba:font-medium gba:text-sm gba:truncate">{name || '-'}</span>
    </div>
  )
}

function buildNameMap(entries: CatalogEntry[]): NameMap {
  const map: NameMap = new Map()
  for (const e of entries) {
    if (e.id) map.set(e.id, e.value || e.code || '')
    if (e.code) map.set(e.code, e.value || e.code)
  }
  return map
}

function buildCodeMap(entries: CatalogEntry[]): NameMap {
  const map: NameMap = new Map()
  for (const e of entries) {
    if (e.id) map.set(e.id, e.code || e.value || '')
    if (e.code) map.set(e.code, e.code)
  }
  return map
}

function resolveName(ref: string | undefined, nameMap: NameMap): string {
  if (!ref) return ''
  const direct = nameMap.get(ref)
  if (direct) return direct
  const code = ref.includes(':') ? ref.split(':').pop()! : ref
  return nameMap.get(code) || code.replace(/_/g, ' ')
}

interface PendingColumnsParams {
  readonly t: BenefitsTranslationFn
  readonly isActioning: boolean
  readonly benefitTypeNames: NameMap
  readonly providerNames: NameMap
  readonly currencyCodes: NameMap
  readonly onStartAction: (task: PendingBenefitTask, action: ApprovalAction) => void
}

function createPendingColumns({
  t,
  isActioning,
  benefitTypeNames,
  providerNames,
  currencyCodes,
  onStartAction
}: PendingColumnsParams): ColumnDef<PendingBenefitTask>[] {
  return [
    {
      id: 'employee',
      accessorFn: row => row.employeeName,
      header: t('pending-col-employee'),
      cell: ({ row }) => renderEmployeeCell(row.original.employeeName, row.original.employeePicture)
    },
    {
      id: 'benefitType',
      accessorFn: row => resolveName(row.benefitTypeRef, benefitTypeNames) || row.benefitTypeName,
      header: t('pending-col-benefit-type'),
      cell: ({ row }) => {
        const name = resolveName(row.original.benefitTypeRef, benefitTypeNames) || row.original.benefitTypeName
        return (
          <Badge variant="info" size="sm">
            {name || '-'}
          </Badge>
        )
      }
    },
    {
      id: 'provider',
      accessorFn: row => resolveName(row.providerRef, providerNames) || row.providerName,
      header: t('pending-col-provider'),
      cell: ({ row }) => {
        const name = resolveName(row.original.providerRef, providerNames) || row.original.providerName
        return <span className="gba:text-sm">{name || '-'}</span>
      }
    },
    {
      id: 'amount',
      accessorFn: row => row.amount,
      header: () => <div className="gba:text-right">{t('pending-col-amount')}</div>,
      cell: ({ row }) => {
        const cur = resolveName(row.original.currencyCode, currencyCodes) || row.original.currencyCode
        return (
          <div className="gba:text-right gba:text-sm gba:font-medium gba:tabular-nums">
            {formatAmount(row.original.amount, cur)}
          </div>
        )
      }
    },
    {
      id: 'requestedAt',
      accessorFn: row => row.requestedAt,
      header: t('pending-col-requested-at'),
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatRequestedDate(row.original.requestedAt)}</span>
      )
    },
    {
      id: 'actions',
      header: t('pending-col-actions'),
      cell: ({ row }) => {
        const task = row.original
        const hasEndpoint = Boolean(task.flowTask.endpoint)
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gba:hover:bg-accent gba:hover:text-accent-foreground"
              onClick={e => {
                e.stopPropagation()
                onStartAction(task, 'approve')
              }}
              disabled={isActioning || !hasEndpoint}
            >
              <CheckIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('pending-action-approve')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gba:text-destructive gba:hover:bg-destructive/10 gba:hover:text-destructive"
              onClick={e => {
                e.stopPropagation()
                onStartAction(task, 'reject')
              }}
              disabled={isActioning || !hasEndpoint}
            >
              <XIcon className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('pending-action-reject')}
            </Button>
          </div>
        )
      }
    }
  ]
}

function getPendingActionLabel(
  isActioning: boolean,
  action: ApprovalAction | undefined,
  t: BenefitsTranslationFn
): string {
  if (isActioning) {
    return t('pending-processing')
  }
  if (action === 'reject') {
    return t('pending-action-reject')
  }
  return t('pending-action-approve')
}

function BenefitPendingApprovalsView({
  t,
  accessToken,
  tasks,
  totalCount,
  isLoading,
  isActioning,
  error,
  refetch,
  approve,
  reject,
  userId
}: Readonly<BenefitPendingApprovalsViewProps>) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [pendingAction, setPendingAction] = useState<ActionState | null>(null)
  const [reason, setReason] = useState('')

  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })
  const [benefitTypeNames, setBenefitTypeNames] = useState<NameMap>(new Map())
  const [providerNames, setProviderNames] = useState<NameMap>(new Map())
  const [currencyCodes, setCurrencyCodes] = useState<NameMap>(new Map())

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    const load = async () => {
      try {
        const [btResult, provResult, curResult] = await Promise.all([
          fetchCatalogEntries({ catalogIdentifier: BENEFIT_TYPE_CATALOG, version: BENEFIT_TYPE_VERSION, limit: 500 }),
          fetchCatalogEntries({
            catalogIdentifier: BENEFIT_PROVIDER_CATALOG,
            version: BENEFIT_PROVIDER_VERSION,
            limit: 500
          }),
          fetchCatalogEntries({ catalogIdentifier: 'Currency', version: 'v1', limit: 500 }).catch(() => ({
            entries: [] as CatalogEntry[],
            totalCount: 0
          }))
        ])
        if (cancelled) return
        setBenefitTypeNames(buildNameMap(btResult.entries))
        setProviderNames(buildNameMap(provResult.entries))
        setCurrencyCodes(buildCodeMap(curResult.entries))
      } catch {
        // best-effort
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [accessToken, fetchCatalogEntries])

  const handleStartAction = useCallback((task: PendingBenefitTask, action: ApprovalAction) => {
    setPendingAction({ task, action })
    setReason('')
  }, [])

  const handleConfirm = useCallback(
    async (actionState: ActionState) => {
      const { task, action } = actionState
      setPendingAction(null)

      try {
        if (action === 'approve') {
          await approve(task.flowTask, userId, reason)
          toast.success(t('pending-toast-approved'))
        } else {
          await reject(task.flowTask, userId, reason)
          toast.success(t('pending-toast-rejected'))
        }
      } catch (err) {
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [approve, reject, userId, reason, t]
  )

  const benefitTypeFilterOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const task of tasks) {
      const ref = task.benefitTypeRef
      if (ref) {
        const name = resolveName(ref, benefitTypeNames) || task.benefitTypeName
        if (!seen.has(ref)) seen.set(ref, name)
      }
    }
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [tasks, benefitTypeNames])

  const providerFilterOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const task of tasks) {
      const ref = task.providerRef
      if (ref) {
        const name = resolveName(ref, providerNames) || task.providerName
        if (!seen.has(ref)) seen.set(ref, name)
      }
    }
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [tasks, providerNames])

  const filterConfig = useMemo<BenefitsFilterConfiguration>(
    () => ({
      id: 'pending-filters',
      name: t('filter-search-placeholder'),
      groups: [
        ...(benefitTypeFilterOptions.length > 0
          ? [
              {
                id: 'benefit-type-group',
                label: t('pending-col-benefit-type'),
                collapsible: true,
                filters: [
                  {
                    id: 'benefitType',
                    field: 'benefitType',
                    label: t('pending-col-benefit-type'),
                    type: 'multi-select' as const,
                    config: { options: benefitTypeFilterOptions }
                  }
                ]
              }
            ]
          : []),
        ...(providerFilterOptions.length > 0
          ? [
              {
                id: 'provider-group',
                label: t('pending-col-provider'),
                collapsible: true,
                filters: [
                  {
                    id: 'provider',
                    field: 'provider',
                    label: t('pending-col-provider'),
                    type: 'multi-select' as const,
                    config: { options: providerFilterOptions }
                  }
                ]
              }
            ]
          : [])
      ]
    }),
    [t, benefitTypeFilterOptions, providerFilterOptions]
  )

  const filteredTasks = useMemo(() => {
    let result = tasks

    const btFilter: string[] = filters.benefitType ?? []
    if (btFilter.length > 0) {
      result = result.filter(task => task.benefitTypeRef && btFilter.includes(task.benefitTypeRef))
    }

    const provFilter: string[] = filters.provider ?? []
    if (provFilter.length > 0) {
      result = result.filter(task => task.providerRef && provFilter.includes(task.providerRef))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(task => {
        const benefitName = resolveName(task.benefitTypeRef, benefitTypeNames) || task.benefitTypeName
        const providerName = resolveName(task.providerRef, providerNames) || task.providerName
        return (
          task.employeeName.toLowerCase().includes(q) ||
          benefitName.toLowerCase().includes(q) ||
          providerName.toLowerCase().includes(q)
        )
      })
    }

    return result
  }, [tasks, search, filters, benefitTypeNames, providerNames])

  const titleSections = useMemo(
    () => [{ id: 'all', label: t('tab-pending-approvals'), metadata: { count: totalCount } }],
    [totalCount, t]
  )

  const columns = useMemo(
    () =>
      createPendingColumns({
        t,
        isActioning,
        benefitTypeNames,
        providerNames,
        currencyCodes,
        onStartAction: handleStartAction
      }),
    [t, isActioning, benefitTypeNames, providerNames, currencyCodes, handleStartAction]
  )

  let pendingActionDescription = ''
  if (pendingAction) {
    let pendingActionMessageKey = 'pending-confirm-approve'
    if (pendingAction.action === 'reject') {
      pendingActionMessageKey = 'pending-confirm-reject'
    }
    pendingActionDescription = t(pendingActionMessageKey, {
      benefitType:
        resolveName(pendingAction.task.benefitTypeRef, benefitTypeNames) || pendingAction.task.benefitTypeName,
      employeeName: pendingAction.task.employeeName || pendingAction.task.employeeId
    })
  }
  const confirmActionLabel = getPendingActionLabel(isActioning, pendingAction?.action, t)

  return (
    <>
      <DataDisplay
        titleSections={titleSections}
        currentSection="all"
        onSectionChange={() => {}}
        searchValue={search}
        searchPlaceholder={t('filter-search-placeholder')}
        onSearchChange={setSearch}
        filters={filters}
        filterConfiguration={filterConfig}
        onFilterChange={setFilters}
        filterSheetTitle={t('filter-search-placeholder')}
        filterSheetDescription=""
        secondaryActions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch().catch(() => undefined)
            }}
          >
            {t('action-refresh')}
          </Button>
        }
        toolbarDensity="compact"
      >
        <TabDataTable
          data={filteredTasks}
          columns={columns}
          loading={isLoading}
          error={error?.message ?? null}
          emptyMessage={t('pending-no-requests')}
          onRowClick={() => {}}
        />
      </DataDisplay>

      <AlertDialog open={!!pendingAction} onOpenChange={open => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === 'reject' ? t('pending-reject-title') : t('pending-approve-title')}
            </AlertDialogTitle>
            <AlertDialogDescription>{pendingActionDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="gba:px-6 gba:pb-2">
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('pending-reason-placeholder')}
              rows={3}
              className="gba:w-full"
            />
            {pendingAction?.action === 'reject' && !reason.trim() && (
              <p className="gba:text-xs gba:text-destructive gba:mt-1">{t('pending-reason-required')}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>{t('btn-cancel')}</AlertDialogCancel>
            <Button
              onClick={() => {
                if (!pendingAction) {
                  return
                }
                handleConfirm(pendingAction).catch(() => undefined)
              }}
              disabled={isActioning || (pendingAction?.action === 'reject' && !reason.trim())}
              variant={pendingAction?.action === 'reject' ? 'destructive' : 'default'}
            >
              {confirmActionLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default React.memo(BenefitPendingApprovalsView)
