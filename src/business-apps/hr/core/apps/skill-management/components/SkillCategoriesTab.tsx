import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  DataDisplay,
  Spinner,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import { Column, ColumnDef } from '@tanstack/react-table'
import { PlusIcon, XCircleIcon } from '@phosphor-icons/react'
import { ActionsColumnHeader } from '@/business-apps/mdm/utils/tableUtils'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'
import { TabDataTable } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/TabDataTable'
import CategoryFormDialog from './CategoryFormDialog'
import ConfirmSkillActionDialog from './ConfirmSkillActionDialog'
import type { SkillCategoryWithCount } from '../types'
import translations from '../_i18n'

export interface SkillCategoriesTabProps extends BusinessAppContextProps {
  categories: SkillCategoryWithCount[]
  isLoading: boolean
  error: Error | null
  refetchCategories: () => void
  prefixDataTestId?: string
  onDataChange: () => void
}

function renderCategoryNameCell(value: string) {
  return (
    <span className="gba:block gba:max-w-[240px] gba:truncate gba:font-semibold" title={value}>
      {value}
    </span>
  )
}

function renderCategoryDescriptionCell(value?: string) {
  const description = value ?? '—'
  return (
    <span
      className="gba:block gba:max-w-[340px] gba:truncate gba:text-sm gba:text-muted-foreground"
      title={value ?? ''}
    >
      {description}
    </span>
  )
}

function renderCategorySkillsCountCell(value: number) {
  return <Badge variant="outline">{value}</Badge>
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

function renderCategoryActionsCell(
  row: SkillCategoryWithCount,
  prefixDataTestId: string | undefined,
  setEditDialogOpen: React.Dispatch<React.SetStateAction<string | null>>,
  setDeleteConfirmCategory: React.Dispatch<React.SetStateAction<SkillCategoryWithCount | null>>,
  t: (key: string) => string
) {
  return (
    <div className="gba:flex gba:items-center gba:gap-1">
      <Button
        size="sm"
        variant="outline"
        className="gba:hover:bg-accent gba:hover:text-accent-foreground"
        onClick={event => {
          event.stopPropagation()
          setEditDialogOpen(row.id)
        }}
        data-testid={`${prefixDataTestId}-edit-category-${row.id}`}
      >
        {t('skill-actions-edit')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gba:text-destructive gba:hover:bg-destructive/10 gba:hover:text-destructive"
        onClick={event => {
          event.stopPropagation()
          setDeleteConfirmCategory(row)
        }}
        data-testid={`${prefixDataTestId}-delete-category-${row.id}`}
      >
        {t('skill-actions-delete')}
      </Button>
    </div>
  )
}

function buildCategoryColumns(
  t: (key: string) => string,
  prefixDataTestId: string | undefined,
  setEditDialogOpen: React.Dispatch<React.SetStateAction<string | null>>,
  setDeleteConfirmCategory: React.Dispatch<React.SetStateAction<SkillCategoryWithCount | null>>
): ColumnDef<SkillCategoryWithCount>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableTextHeader column={column}>{t('category-name')}</SortableTextHeader>,
      enableSorting: true,
      size: 260,
      maxSize: 320,
      cell: ({ getValue }) => renderCategoryNameCell(getValue() as string)
    },
    {
      accessorKey: 'description',
      header: t('category-description'),
      enableSorting: false,
      size: 360,
      maxSize: 440,
      cell: ({ getValue }) => renderCategoryDescriptionCell(getValue() as string | undefined)
    },
    {
      id: 'skillCount',
      accessorKey: 'skillCount',
      header: ({ column }) => <SortableTextHeader column={column}>{t('category-skills-count')}</SortableTextHeader>,
      enableSorting: true,
      size: 140,
      maxSize: 160,
      cell: ({ getValue }) => renderCategorySkillsCountCell(getValue() as number)
    },
    {
      id: 'actions',
      header: () => ActionsColumnHeader(),
      enableSorting: false,
      size: 180,
      maxSize: 200,
      cell: ({ row }) =>
        renderCategoryActionsCell(row.original, prefixDataTestId, setEditDialogOpen, setDeleteConfirmCategory, t)
    }
  ]
}

function SkillCategoriesTab({
  prefixDataTestId,
  accessToken,
  categories,
  isLoading,
  error,
  refetchCategories,
  onDataChange
}: Readonly<SkillCategoriesTabProps>) {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<SkillCategoryWithCount | null>(null)
  const [mutationLoading, setMutationLoading] = useState(false)

  const restClient = useRestClient(EMPLOYEES_API_URL)

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories
    const lower = searchTerm.toLowerCase()
    return categories.filter(c => c.name?.toLowerCase().includes(lower) || c.description?.toLowerCase().includes(lower))
  }, [categories, searchTerm])

  const getHeaders = useCallback(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])

  const handleCreateCategory = useCallback(
    async (data: Record<string, unknown>) => {
      setMutationLoading(true)
      try {
        await restClient.post(
          '/saveSkillCategory',
          {
            changeMode: 'INSERT',
            skillCategory: { name: data.name, description: data.description || null }
          },
          { headers: getHeaders() }
        )
        toast.success(t('toast-category-created', { name: String(data.name) }))
        onDataChange()
      } catch {
        toast.error(t('toast-category-error'))
      } finally {
        setMutationLoading(false)
      }
    },
    [restClient, getHeaders, onDataChange, t]
  )

  const handleUpdateCategory = useCallback(
    async (data: Record<string, unknown>) => {
      if (!editDialogOpen) return
      const existing = categories.find(c => c.id === editDialogOpen)
      setMutationLoading(true)
      try {
        await restClient.post(
          '/saveSkillCategory',
          {
            changeMode: 'UPDATE',
            skillCategory: {
              id: editDialogOpen,
              name: data.name,
              description: data.description || null,
              version: existing?.version
            }
          },
          { headers: getHeaders() }
        )
        toast.success(t('toast-category-updated', { name: String(data.name) }))
        setEditDialogOpen(null)
        onDataChange()
      } catch {
        toast.error(t('toast-category-error'))
      } finally {
        setMutationLoading(false)
      }
    },
    [editDialogOpen, categories, restClient, getHeaders, onDataChange, t]
  )

  const handleDeleteCategory = useCallback(async () => {
    if (!deleteConfirmCategory) return
    if (deleteConfirmCategory.skillCount > 0) {
      toast.error(t('confirm-delete-category-blocked'))
      setDeleteConfirmCategory(null)
      return
    }
    setMutationLoading(true)
    try {
      await restClient.post(
        '/saveSkillCategory',
        {
          changeMode: 'DELETE',
          skillCategory: {
            id: deleteConfirmCategory.id,
            version: deleteConfirmCategory.version
          }
        },
        { headers: getHeaders() }
      )
      toast.success(t('toast-category-deleted', { name: deleteConfirmCategory.name }))
      setDeleteConfirmCategory(null)
      onDataChange()
    } catch {
      toast.error(t('toast-category-error'))
    } finally {
      setMutationLoading(false)
    }
  }, [deleteConfirmCategory, restClient, getHeaders, onDataChange, t])

  const columns = useMemo(
    () => buildCategoryColumns(t, prefixDataTestId, setEditDialogOpen, setDeleteConfirmCategory),
    [prefixDataTestId, t]
  )

  const titleSections = useMemo(
    () => [{ id: 'all', label: t('tab-skill-categories'), metadata: { count: filteredCategories.length } }],
    [filteredCategories.length, t]
  )

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            {t('error-loading-categories')}
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={refetchCategories}>
              {t('skill-actions-retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading && categories.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <DataDisplay
        titleSections={titleSections}
        currentSection="all"
        onSectionChange={() => {}}
        searchValue={searchTerm}
        searchPlaceholder={t('search-categories')}
        onSearchChange={setSearchTerm}
        filters={{}}
        onFilterChange={() => {}}
        filterSheetTitle={t('tab-skill-categories')}
        filterSheetDescription=""
        secondaryActions={
          <ErrorBoundary>
            <CategoryFormDialog
              childAddButton={
                <Button variant="default" data-testid={`${prefixDataTestId}-add-category`}>
                  <PlusIcon className="gba:mr-1" /> {t('category-add')}
                </Button>
              }
              onSubmit={handleCreateCategory}
              isLoading={mutationLoading}
              prefixDataTestId={prefixDataTestId}
            />
          </ErrorBoundary>
        }
        toolbarDensity="compact"
      >
        <ErrorBoundary>
          <TabDataTable
            data={filteredCategories}
            columns={columns}
            loading={isLoading}
            error={null}
            emptyMessage={t('category-no-categories')}
          />
        </ErrorBoundary>
      </DataDisplay>

      {editDialogOpen &&
        (() => {
          const catToEdit = categories.find(c => c.id === editDialogOpen) ?? null
          if (!catToEdit) return null
          return (
            <ErrorBoundary>
              <CategoryFormDialog
                key={editDialogOpen}
                category={catToEdit}
                open={true}
                setOpen={open => setEditDialogOpen(open ? editDialogOpen : null)}
                onSubmit={handleUpdateCategory}
                isLoading={mutationLoading}
                prefixDataTestId={prefixDataTestId}
              />
            </ErrorBoundary>
          )
        })()}

      <ConfirmSkillActionDialog
        open={!!deleteConfirmCategory}
        onOpenChange={open => {
          if (!open) setDeleteConfirmCategory(null)
        }}
        title={t('confirm-delete-category-title')}
        description={
          deleteConfirmCategory && deleteConfirmCategory.skillCount > 0
            ? t('confirm-delete-category-blocked')
            : t('confirm-delete-category-description', {
                categoryName: deleteConfirmCategory?.name ?? '',
                skillCount: String(deleteConfirmCategory?.skillCount ?? 0)
              })
        }
        confirmLabel={t('confirm-delete-confirm')}
        cancelLabel={t('confirm-delete-cancel')}
        onConfirm={handleDeleteCategory}
        variant="destructive"
        isLoading={mutationLoading}
        hideConfirm={Boolean(deleteConfirmCategory && deleteConfirmCategory.skillCount > 0)}
      />
    </>
  )
}

export default React.memo(SkillCategoriesTab)
