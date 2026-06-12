import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  ActionMenu,
  Badge,
  Button,
  DataDisplay,
  Icon,
  Spinner,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import type { ActionOption, FilterConfiguration } from '@newwork/nw-design-system'
import { Column, ColumnDef } from '@tanstack/react-table'
import { DotsThreeIcon, PlusIcon, SparkleIcon, XCircleIcon } from '@phosphor-icons/react'
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
import { TabDataTable } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/TabDataTable'
import type { SkillDirectoryRecord, SkillCategoryRecord } from '../types'
import translations from '../_i18n'

export interface SkillDirectoryTabProps extends BusinessAppContextProps {
  skills: SkillDirectoryRecord[]
  isLoading: boolean
  error: Error | null
  categoryMap: Record<string, string>
  categories: string[]
  categoryOptions: SkillCategoryRecord[]
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

function SortableTextHeader<TData>({
  column,
  children
}: Readonly<{ column: Column<TData>; children: React.ReactNode }>) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
    >
      {children}
    </Button>
  )
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
  setEditDialogOpen: React.Dispatch<React.SetStateAction<string | null>>,
  setDeleteConfirmSkill: React.Dispatch<React.SetStateAction<SkillDirectoryRecord | null>>,
  t: (key: string) => string
) {
  const actions: ActionOption[] = [
    {
      key: `edit-${skill.id}`,
      label: t('skill-actions-edit'),
      onClick: () => setEditDialogOpen(skill.id)
    },
    {
      key: `delete-${skill.id}`,
      label: t('skill-actions-delete'),
      onClick: () => setDeleteConfirmSkill(skill)
    }
  ]

  return (
    <ActionMenu actions={actions} emptyStateBehavior="enable">
      <div className="gba:flex gba:justify-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('skill-actions-menu')}
          onClick={event => {
            event.stopPropagation()
            event.preventDefault()
          }}
          data-testid={`${prefixDataTestId}-actions-${skill.id}`}
        >
          <Icon icon={DotsThreeIcon} />
        </Button>
      </div>
    </ActionMenu>
  )
}

function buildSkillDirectoryFilterConfig(
  t: (key: string) => string,
  categoryOptions: Array<{ id: string; label: string }>
): FilterConfiguration {
  return {
    id: 'skill-directory-filters',
    name: t('tab-skills-directory'),
    groups: [
      ...(categoryOptions.length > 0
        ? [
            {
              id: 'category-group',
              label: t('filter-by-category'),
              collapsible: true,
              filters: [
                {
                  id: 'category',
                  field: 'category',
                  label: t('filter-by-category'),
                  type: 'multi-select' as const,
                  config: { options: categoryOptions }
                }
              ]
            }
          ]
        : [])
    ]
  }
}

function buildSkillDirectoryColumns(
  t: (key: string) => string,
  categoryMap: Record<string, string>,
  prefixDataTestId: string | undefined,
  setEditDialogOpen: React.Dispatch<React.SetStateAction<string | null>>,
  setDeleteConfirmSkill: React.Dispatch<React.SetStateAction<SkillDirectoryRecord | null>>
): ColumnDef<SkillDirectoryRecord>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableTextHeader column={column}>{t('skill-name')}</SortableTextHeader>,
      enableSorting: true,
      size: 260,
      maxSize: 320,
      cell: ({ getValue }) => renderSkillNameCell(getValue() as string)
    },
    {
      id: 'category',
      accessorFn: row => categoryMap[row.id] ?? '',
      header: ({ column }) => <SortableTextHeader column={column}>{t('skill-category')}</SortableTextHeader>,
      enableSorting: true,
      size: 180,
      maxSize: 220,
      cell: ({ row }) => renderSkillCategoryCell(categoryMap[row.original.id])
    },
    {
      id: 'employeeCount',
      header: ({ column }) => <SortableTextHeader column={column}>{t('skill-employees')}</SortableTextHeader>,
      enableSorting: true,
      size: 140,
      maxSize: 160,
      accessorFn: row => row.employeeSkillsAggregate?.aggregate?.count ?? 0,
      cell: ({ getValue }) => renderSkillEmployeeCountCell(getValue() as number)
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
      header: () => <div className="gba:w-14 gba:text-center">{t('skill-actions')}</div>,
      enableSorting: false,
      size: 56,
      maxSize: 64,
      cell: ({ row }) =>
        renderSkillActionsCell(row.original, prefixDataTestId, setEditDialogOpen, setDeleteConfirmSkill, t)
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
  categoryOptions,
  onDataChange
}: Readonly<SkillDirectoryTabProps>) {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
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

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        s => s.name?.toLowerCase().includes(lower) || s.description?.toLowerCase().includes(lower)
      )
    }

    const categoryFilter = filters.category ?? []
    if (categoryFilter.length > 0) {
      filtered = filtered.filter(skill => categoryFilter.includes(categoryMap[skill.id] ?? ''))
    }

    return filtered
  }, [skills, searchTerm, filters.category, categoryMap])

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
      const skillToEdit = skills.find(skill => skill.id === editDialogOpen)
      if (!skillToEdit) return

      try {
        await updateSkill(editDialogOpen, {
          ...(data as any),
          version: skillToEdit.version ?? undefined
        })
        toast.success(t('toast-skill-updated', { name: String(data.name) }))
        setEditDialogOpen(null)
        onDataChange()
      } catch {
        toast.error(t('toast-skill-error'))
      }
    },
    [editDialogOpen, skills, updateSkill, onDataChange, t]
  )

  const handleDeleteSkill = useCallback(async () => {
    if (!deleteConfirmSkill) return
    try {
      await deleteSkill(deleteConfirmSkill.id, deleteConfirmSkill.version ?? undefined)
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
    () => buildSkillDirectoryColumns(t, categoryMap, prefixDataTestId, setEditDialogOpen, setDeleteConfirmSkill),
    [categoryMap, prefixDataTestId, t]
  )

  const categoryFilterOptions = useMemo(
    () =>
      categories.map(category => ({ id: category, label: category })).sort((a, b) => a.label.localeCompare(b.label)),
    [categories]
  )

  const filterConfig = useMemo(
    () => buildSkillDirectoryFilterConfig(t, categoryFilterOptions),
    [categoryFilterOptions, t]
  )

  const titleSections = useMemo(
    () => [{ id: 'all', label: t('tab-skills-directory'), metadata: { count: filteredSkills.length } }],
    [filteredSkills.length, t]
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

        .ai-insights-pulse-glow {
          animation: aiInsightsPulseGlow 2.5s ease-in-out infinite;
        }
      `}</style>
      <DataDisplay
        titleSections={titleSections}
        currentSection="all"
        onSectionChange={() => {}}
        searchValue={searchTerm}
        searchPlaceholder={t('search-skills')}
        onSearchChange={setSearchTerm}
        filters={filters}
        filterConfiguration={filterConfig}
        onFilterChange={setFilters}
        filterSheetTitle={t('tab-skills-directory')}
        filterSheetDescription={t('skill-management-description')}
        secondaryActions={
          <div className="gba:flex gba:items-center gba:gap-2 gba:pl-1">
            <Button
              variant="outline"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2 ai-insights-pulse-glow"
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
                categories={categoryOptions}
                prefixDataTestId={prefixDataTestId}
              />
            </ErrorBoundary>
          </div>
        }
        toolbarDensity="compact"
      >
        <ErrorBoundary>
          <TabDataTable
            data={filteredSkills}
            columns={columns}
            loading={isLoading}
            error={null}
            emptyMessage={
              searchTerm || Object.values(filters).some(value => value.length > 0)
                ? t('empty-no-matching-skills')
                : t('empty-no-skills')
            }
            onRowClick={handleView}
          />
        </ErrorBoundary>
      </DataDisplay>

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
                categories={categoryOptions}
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
