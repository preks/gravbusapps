import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { PlusIcon, SparkleIcon, StackIcon, XCircleIcon } from '@phosphor-icons/react'
import { SortableHeader, ActionsColumnHeader } from '@/business-apps/mdm/utils/tableUtils'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSkillDetails } from '../hooks/useSkillDetails'
import { useSkillMutations } from '../hooks/useSkillMutations'
import { useSkillDeduplication } from '../hooks/useSkillDeduplication'
import { useSkillMerge } from '../hooks/useSkillMerge'
import SkillFormDialog from './SkillFormDialog'
import SkillDetailsPanel from './SkillDetailsPanel'
import SkillDeduplicationPanel from './SkillDeduplicationPanel'
import ConfirmSkillActionDialog from './ConfirmSkillActionDialog'
import type { SkillDirectoryRecord, SkillStatusFilter } from '../types'
import translations from '../_i18n'

export interface SkillDirectoryTabProps extends BusinessAppContextProps {
  skills: SkillDirectoryRecord[]
  isLoading: boolean
  error: Error | null
  categoryMap: Record<string, string>
  categories: string[]
  prefixDataTestId?: string
  onDataChange: () => void
}

function renderSkillNameCell(value: string) {
  return (
    <span className="gba:block gba:max-w-[240px] gba:truncate gba:font-semibold gba:text-sm" title={value}>
      {value}
    </span>
  )
}

function renderSkillCategoryCell(category?: string) {
  if (!category) {
    return <span className="gba:text-muted-foreground">—</span>
  }

  return (
    <span className="gba:block gba:max-w-[170px] gba:truncate" title={category}>
      <Badge variant="secondary">{category}</Badge>
    </span>
  )
}

function renderSkillEmployeeCountCell(count: number) {
  return <Badge variant="outline">{count}</Badge>
}

function renderSkillStatusCell(isActive: boolean, t: (key: string) => string) {
  return (
    <Badge variant={isActive ? 'success' : 'destructive'}>{isActive ? t('status-active') : t('status-inactive')}</Badge>
  )
}

function getStartOfTodayIso(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function isSkillActive(skill: SkillDirectoryRecord, todayIso: string): boolean {
  return !skill.activeTo || skill.activeTo >= todayIso
}

function renderSkillDescriptionCell(description?: string) {
  return (
    <span
      className="gba:block gba:max-w-[280px] gba:truncate gba:text-sm gba:text-muted-foreground"
      title={description ?? ''}
    >
      {description ?? '—'}
    </span>
  )
}

function renderSkillActionsCell(
  skill: SkillDirectoryRecord,
  prefixDataTestId: string | undefined,
  handleView: (skill: SkillDirectoryRecord) => void,
  setEditDialogOpen: React.Dispatch<React.SetStateAction<string | null>>,
  setDeleteConfirmSkill: React.Dispatch<React.SetStateAction<SkillDirectoryRecord | null>>,
  t: (key: string) => string
) {
  return (
    <div className="gba:flex gba:items-center gba:gap-1">
      <Button
        variant="outline"
        size="sm"
        className="gba:hover:bg-accent gba:hover:text-accent-foreground"
        onClick={() => handleView(skill)}
        data-testid={`${prefixDataTestId}-view-${skill.id}`}
      >
        {t('skill-actions-view')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gba:hover:bg-accent gba:hover:text-accent-foreground"
        onClick={event => {
          event.stopPropagation()
          setEditDialogOpen(skill.id)
        }}
        data-testid={`${prefixDataTestId}-edit-${skill.id}`}
      >
        {t('skill-actions-edit')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gba:text-destructive gba:hover:bg-destructive/10 gba:hover:text-destructive"
        onClick={event => {
          event.stopPropagation()
          setDeleteConfirmSkill(skill)
        }}
        data-testid={`${prefixDataTestId}-delete-${skill.id}`}
      >
        {t('skill-actions-delete')}
      </Button>
    </div>
  )
}

function toSkillStatusFilter(value: string): SkillStatusFilter {
  if (value === 'active' || value === 'inactive' || value === 'all') {
    return value
  }
  return 'all'
}

function buildSkillDirectoryColumns(
  t: (key: string) => string,
  categoryMap: Record<string, string>,
  prefixDataTestId: string | undefined,
  handleView: (skill: SkillDirectoryRecord) => void,
  setEditDialogOpen: React.Dispatch<React.SetStateAction<string | null>>,
  setDeleteConfirmSkill: React.Dispatch<React.SetStateAction<SkillDirectoryRecord | null>>
): ColumnDef<SkillDirectoryRecord>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => SortableHeader({ column, children: t('skill-name') }),
      enableSorting: true,
      size: 260,
      maxSize: 320,
      cell: ({ getValue }) => renderSkillNameCell(getValue() as string)
    },
    {
      id: 'category',
      header: t('skill-category'),
      enableSorting: false,
      size: 180,
      maxSize: 220,
      cell: ({ row }) => renderSkillCategoryCell(categoryMap[row.original.id])
    },
    {
      id: 'employeeCount',
      header: ({ column }) => SortableHeader({ column, children: t('skill-employees') }),
      enableSorting: true,
      size: 140,
      maxSize: 160,
      accessorFn: row => row.employeeSkillsAggregate?.aggregate?.count ?? 0,
      cell: ({ getValue }) => renderSkillEmployeeCountCell(getValue() as number)
    },
    {
      id: 'status',
      header: t('skill-status'),
      enableSorting: false,
      size: 140,
      maxSize: 160,
      cell: ({ row }) => renderSkillStatusCell(isSkillActive(row.original, getStartOfTodayIso()), t)
    },
    {
      accessorKey: 'description',
      header: t('skill-description'),
      enableSorting: false,
      size: 300,
      maxSize: 380,
      cell: ({ getValue }) => renderSkillDescriptionCell(getValue() as string | undefined)
    },
    {
      id: 'actions',
      header: () => ActionsColumnHeader(),
      enableSorting: false,
      size: 170,
      maxSize: 190,
      cell: ({ row }) =>
        renderSkillActionsCell(row.original, prefixDataTestId, handleView, setEditDialogOpen, setDeleteConfirmSkill, t)
    }
  ]
}

function SkillDirectoryTab({
  prefixDataTestId,
  accessToken,
  skills,
  isLoading,
  error,
  categoryMap,
  categories,
  onDataChange
}: Readonly<SkillDirectoryTabProps>) {
  const { t } = useTranslation(translations)
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<SkillStatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)
  const [deleteConfirmSkill, setDeleteConfirmSkill] = useState<SkillDirectoryRecord | null>(null)

  const {
    skill: selectedSkill,
    employees,
    totalEmployees,
    isLoading: detailsLoading,
    loadMoreEmployees
  } = useSkillDetails(selectedSkillId, accessToken)

  const { createSkill, updateSkill, deleteSkill, isLoading: mutationLoading } = useSkillMutations(accessToken)

  const {
    proposals,
    isAnalyzing,
    error: analysisError,
    analyze,
    updateProposalStatus,
    approveAll,
    reset: resetDedup
  } = useSkillDeduplication(accessToken)

  const {
    executeMerge,
    isExecuting: isMerging,
    progress: mergeProgress,
    mergeErrors,
    reset: resetMerge
  } = useSkillMerge(accessToken)

  const [isDedupPanelOpen, setIsDedupPanelOpen] = useState(false)
  const [dedupState, setDedupState] = useState<'analyzing' | 'review' | 'executing' | 'done'>('analyzing')

  const handleFindDuplicates = useCallback(() => {
    resetDedup()
    resetMerge()
    setDedupState('analyzing')
    setIsDedupPanelOpen(true)
    analyze(skills)
  }, [skills, analyze, resetDedup, resetMerge])

  useEffect(() => {
    if (isDedupPanelOpen && !isAnalyzing && dedupState === 'analyzing') {
      setDedupState('review')
    }
  }, [isDedupPanelOpen, isAnalyzing, dedupState])

  const handleDedupApprove = useCallback(
    (index: number) => updateProposalStatus(index, 'approved'),
    [updateProposalStatus]
  )

  const handleDedupReject = useCallback(
    (index: number) => updateProposalStatus(index, 'rejected'),
    [updateProposalStatus]
  )

  const handleApproveAllHigh = useCallback(() => approveAll('high'), [approveAll])

  const handleExecuteMerges = useCallback(async () => {
    setDedupState('executing')
    await executeMerge(proposals, updateProposalStatus)
    setDedupState('done')
    onDataChange()
  }, [proposals, executeMerge, updateProposalStatus, onDataChange])

  const handleCloseDedupPanel = useCallback(() => {
    setIsDedupPanelOpen(false)
    if (dedupState === 'done') {
      resetDedup()
      resetMerge()
    }
  }, [dedupState, resetDedup, resetMerge])

  const handleResetDedup = useCallback(() => {
    resetDedup()
    resetMerge()
    setDedupState('analyzing')
    analyze(skills)
  }, [skills, analyze, resetDedup, resetMerge])

  const filteredSkills = useMemo(() => {
    let filtered = skills
    const todayIso = getStartOfTodayIso()

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        s => s.name?.toLowerCase().includes(lower) || s.description?.toLowerCase().includes(lower)
      )
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(skill => isSkillActive(skill, todayIso))
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(skill => !isSkillActive(skill, todayIso))
    }

    if (categoryFilter) {
      filtered = filtered.filter(s => categoryMap[s.id] === categoryFilter)
    }

    return filtered
  }, [skills, searchTerm, statusFilter, categoryFilter, categoryMap])

  useEffect(() => {
    if (selectedSkillId && !skills.some(skill => skill.id === selectedSkillId)) {
      setSelectedSkillId(null)
      setIsDetailsPanelOpen(false)
    }
  }, [skills, selectedSkillId])

  const handleView = useCallback((skill: SkillDirectoryRecord) => {
    setSelectedSkillId(skill.id)
    setIsDetailsPanelOpen(true)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setIsDetailsPanelOpen(false)
    setSelectedSkillId(null)
  }, [])

  const handleLoadMoreEmployees = useCallback(() => {
    loadMoreEmployees(employees.length)
  }, [loadMoreEmployees, employees.length])

  const handleCreateSkill = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await createSkill(data as any)
        toast.success(t('toast-skill-created', { name: String(data.name) }))
        onDataChange()
      } catch {
        toast.error(t('toast-skill-error'))
      }
    },
    [createSkill, onDataChange, t]
  )

  const handleUpdateSkill = useCallback(
    async (data: Record<string, unknown>) => {
      if (!editDialogOpen) return
      try {
        await updateSkill(editDialogOpen, data as any)
        toast.success(t('toast-skill-updated', { name: String(data.name) }))
        setEditDialogOpen(null)
        onDataChange()
      } catch {
        toast.error(t('toast-skill-error'))
      }
    },
    [editDialogOpen, updateSkill, onDataChange, t]
  )

  const handleDeleteSkill = useCallback(async () => {
    if (!deleteConfirmSkill) return
    try {
      await deleteSkill(deleteConfirmSkill.id)
      toast.success(t('toast-skill-deleted', { name: deleteConfirmSkill.name }))
      setDeleteConfirmSkill(null)
      if (selectedSkillId === deleteConfirmSkill.id) {
        setSelectedSkillId(null)
        setIsDetailsPanelOpen(false)
      }
      onDataChange()
    } catch {
      toast.error(t('toast-skill-error'))
    }
  }, [deleteConfirmSkill, deleteSkill, onDataChange, selectedSkillId, t])

  const columns = useMemo(
    () =>
      buildSkillDirectoryColumns(
        t,
        categoryMap,
        prefixDataTestId,
        handleView,
        setEditDialogOpen,
        setDeleteConfirmSkill
      ),
    [categoryMap, handleView, prefixDataTestId, t]
  )

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            {t('error-loading-skills')}
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={onDataChange}>
              {t('skill-actions-retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading && skills.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes aiInsightsPulseGlow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35), 0 0 16px rgba(59, 130, 246, 0.12); }
          50% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.55), 0 0 24px rgba(59, 130, 246, 0.2); }
        }
      `}</style>
      <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
        <div className="gba:flex gba:items-center gba:justify-between gba:p-6 gba:pb-0">
          <div>
            <h3 className="gba:text-lg gba:font-semibold">
              {t('tab-skills-directory')} ({skills.length})
            </h3>
            <p className="gba:text-sm gba:text-muted-foreground">{t('skill-management-description')}</p>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2"
              style={{ animation: 'aiInsightsPulseGlow 2.5s ease-in-out infinite' }}
              onClick={handleFindDuplicates}
              disabled={isAnalyzing || skills.length < 2}
              data-testid={`${prefixDataTestId}-find-duplicates`}
            >
              {isAnalyzing ? <Spinner size="sm" /> : <SparkleIcon className="gba:h-4 gba:w-4" weight="fill" />}
              {t('dedup-find-duplicates')}
            </Button>
            <ErrorBoundary>
              <SkillFormDialog
                childAddButton={
                  <Button variant="default" data-testid={`${prefixDataTestId}-add-skill`}>
                    <PlusIcon className="gba:mr-1" /> {t('add-new-skill')}
                  </Button>
                }
                onSubmit={handleCreateSkill}
                isLoading={mutationLoading}
                prefixDataTestId={prefixDataTestId}
              />
            </ErrorBoundary>
          </div>
        </div>

        <CardContent className="gba:pt-4">
          <div className="gba:flex gba:gap-3 gba:mb-6 gba:flex-wrap">
            <div className="gba:relative gba:max-w-sm gba:flex-1 gba:min-w-[200px]">
              <Input
                placeholder={t('search-skills')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                data-testid={`${prefixDataTestId}-search-input`}
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(toSkillStatusFilter(value))}>
              <SelectTrigger className="gba:w-[150px]">
                <SelectValue placeholder={t('filter-by-status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter-status-all')}</SelectItem>
                <SelectItem value="active">{t('filter-status-active')}</SelectItem>
                <SelectItem value="inactive">{t('filter-status-inactive')}</SelectItem>
              </SelectContent>
            </Select>

            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="gba:w-[180px]">
                  <SelectValue placeholder={t('filter-by-category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('filter-status-all')}</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {filteredSkills.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <StackIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500 gba:mt-2">
                {searchTerm || statusFilter !== 'all' || categoryFilter
                  ? t('empty-no-matching-skills')
                  : t('empty-no-skills')}
              </p>
              <p className="gba:text-sm gba:text-gray-400">
                {searchTerm || statusFilter !== 'all' || categoryFilter
                  ? t('empty-no-matching-skills-description')
                  : t('empty-no-skills-description')}
              </p>
            </div>
          ) : (
            <ErrorBoundary>
              <DataTable
                data={filteredSkills}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>
      </Card>

      {isDetailsPanelOpen && selectedSkillId && (
        <ErrorBoundary>
          <SkillDetailsPanel
            skill={selectedSkill}
            employees={employees}
            totalEmployees={totalEmployees}
            isLoading={detailsLoading}
            isOpen={isDetailsPanelOpen}
            onClose={handleCloseDetails}
            onLoadMore={handleLoadMoreEmployees}
            categoryName={selectedSkillId ? categoryMap[selectedSkillId] : undefined}
            prefixDataTestId={prefixDataTestId}
          />
        </ErrorBoundary>
      )}

      {editDialogOpen &&
        (() => {
          const skillToEdit = skills.find(s => s.id === editDialogOpen) ?? null
          if (!skillToEdit) return null
          return (
            <ErrorBoundary>
              <SkillFormDialog
                key={editDialogOpen}
                skill={skillToEdit}
                open={true}
                setOpen={open => setEditDialogOpen(open ? editDialogOpen : null)}
                onSubmit={handleUpdateSkill}
                isLoading={mutationLoading}
                prefixDataTestId={prefixDataTestId}
              />
            </ErrorBoundary>
          )
        })()}

      <ConfirmSkillActionDialog
        open={!!deleteConfirmSkill}
        onOpenChange={open => {
          if (!open) setDeleteConfirmSkill(null)
        }}
        title={t('confirm-delete-title')}
        description={t('confirm-delete-description', {
          skillName: deleteConfirmSkill?.name ?? ''
        })}
        confirmLabel={t('confirm-delete-confirm')}
        cancelLabel={t('confirm-delete-cancel')}
        onConfirm={handleDeleteSkill}
        variant="destructive"
        isLoading={mutationLoading}
      />

      {isDedupPanelOpen && (
        <ErrorBoundary>
          <SkillDeduplicationPanel
            isOpen={isDedupPanelOpen}
            onClose={handleCloseDedupPanel}
            panelState={dedupState}
            proposals={proposals}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            isExecuting={isMerging}
            progress={mergeProgress}
            mergeErrors={mergeErrors}
            onApprove={handleDedupApprove}
            onReject={handleDedupReject}
            onApproveAllHigh={handleApproveAllHigh}
            onExecute={handleExecuteMerges}
            onReset={handleResetDedup}
            prefixDataTestId={prefixDataTestId}
          />
        </ErrorBoundary>
      )}
    </>
  )
}

export default React.memo(SkillDirectoryTab)
