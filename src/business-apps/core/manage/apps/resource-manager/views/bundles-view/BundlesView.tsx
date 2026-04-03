import React, { useState, useCallback, useMemo } from 'react'
import {
  DataDisplay,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  type FilterConfiguration
} from '@newwork/nw-design-system'
import { PlusCircleIcon, CaretDownIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Component } from '@/common/data/resources/types/component.types'
import { getScreenKeyCategory, parseUserTaskScreenKey } from '../../utils/componentKeyUtils'
import { BundleTab } from './BundleTab'
import { ScreenBundleDialog } from './ScreenBundleDialog'
import { ActionBundleDialog } from './ActionBundleDialog'
import { UserTaskBundleDialog } from './UserTaskBundleDialog'

const BUNDLE_SORTABLE_COLUMNS = [
  { id: 'name', label: 'Name' },
  { id: 'path', label: 'Path' },
  { id: 'count', label: 'Components' }
]

const BUNDLE_FILTER_CONFIG: FilterConfiguration = {
  id: 'bundle-filters',
  name: 'Bundle Filters',
  groups: [
    {
      id: 'bundle-type-group',
      label: 'Bundle type',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'bundleTypes',
          field: 'bundleTypes',
          label: 'Bundle type',
          type: 'checkbox-group',
          config: {
            options: [
              { id: 'screen', label: 'Screen' },
              { id: 'action', label: 'Action' },
              { id: 'task', label: 'User Task' }
            ]
          }
        }
      ]
    },
    {
      id: 'component-type-group',
      label: 'Component type',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'componentTypes',
          field: 'componentTypes',
          label: 'Component type',
          type: 'checkbox-group',
          config: {
            options: [
              { id: 'screen', label: 'Screen' },
              { id: 'form', label: 'Form' },
              { id: 'window', label: 'Window' },
              { id: 'popup', label: 'Popup' }
            ]
          }
        }
      ]
    }
  ]
}

export interface BundlesViewProps extends BusinessAppContextProps {
  'data-testid'?: string
  onNavigateTo?: (view: string, params?: { tab?: string; subview?: string }) => void
}

export const BundlesView: React.FC<BundlesViewProps> = ({
  'data-testid': dataTestId = 'bundles-view',
  onNavigateTo,
  ...context
}) => {
  const [bundlesCount, setBundlesCount] = useState<number | undefined>(undefined)
  const [bundlesLoading, setBundlesLoading] = useState(false)
  const [bundlesSearchValue, setBundlesSearchValue] = useState('')
  const [bundlesSorting, setBundlesSorting] = useState<Array<{ id: string; desc: boolean }>>([
    { id: 'path', desc: false }
  ])
  const [bundlesFilters, setBundlesFilters] = useState<Record<string, unknown>>({})
  const [openScreen, setOpenScreen] = useState(false)
  const [openAction, setOpenAction] = useState(false)
  const [openUserTask, setOpenUserTask] = useState(false)
  const [screenDialogInitialData, setScreenDialogInitialData] = useState<
    | {
        componentPath: string
        name?: string
        code?: string
        componentVersion?: string
        screenKey?: string
        existingComponentId?: string
      }
    | undefined
  >(undefined)
  const [actionDialogInitialData, setActionDialogInitialData] = useState<
    | {
        componentPath: string
        name?: string
        screenKey?: string
        domain?: string
        process?: string
        existingComponentId?: string
      }
    | undefined
  >(undefined)
  const [userTaskDialogInitialData, setUserTaskDialogInitialData] = useState<
    | {
        componentPath: string
        name?: string
        process?: string
        userTaskName?: string
        screenKey?: string
        existingComponentId?: string
      }
    | undefined
  >(undefined)

  const handleEditBundle = useCallback((path: string, components: Component[]) => {
    const first = components[0]
    if (!first?.screenKey) return
    const category = getScreenKeyCategory(first.screenKey)
    const existingId = first.id ?? undefined
    if (category === 'screen') {
      const componentPath =
        first.screenComponents?.formDefinition?.componentPath?.trim() ?? (path.startsWith('/') ? path : `/${path}`)
      setScreenDialogInitialData({
        componentPath,
        name: first.name ?? undefined,
        code: (first as { code?: string }).code ?? undefined,
        componentVersion: first.screenComponents?.formDefinition?.version?.trim() ?? undefined,
        screenKey: first.screenKey ?? undefined,
        existingComponentId: existingId
      })
      setOpenScreen(true)
    } else if (category === 'action') {
      setActionDialogInitialData({
        componentPath: path,
        name: first.name ?? undefined,
        screenKey: first.screenKey,
        existingComponentId: existingId
      })
      setOpenAction(true)
    } else if (category === 'task') {
      const parsed = parseUserTaskScreenKey(first.screenKey)
      setUserTaskDialogInitialData({
        componentPath: path,
        name: first.name ?? undefined,
        process: parsed?.processName,
        userTaskName: parsed?.userTaskName,
        screenKey: first.screenKey,
        existingComponentId: existingId
      })
      setOpenUserTask(true)
    }
  }, [])

  const primaryAction = useMemo(
    () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" data-testid={`${dataTestId}-create-button`}>
            <PlusCircleIcon className="gba:h-4 gba:w-4 gba:mr-1" />
            Create
            <CaretDownIcon className="gba:h-4 gba:w-4 gba:ml-1" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setScreenDialogInitialData(undefined)
              setOpenScreen(true)
            }}
          >
            Create Screen
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setActionDialogInitialData(undefined)
              setOpenAction(true)
            }}
          >
            Create Action
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setUserTaskDialogInitialData(undefined)
              setOpenUserTask(true)
            }}
          >
            Create User Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [dataTestId]
  )

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        titleSections={[
          {
            id: 'bundles',
            label: 'Bundles',
            metadata: { count: bundlesCount, isLoading: bundlesLoading }
          }
        ]}
        currentSection="bundles"
        onSectionChange={() => {}}
        searchValue={bundlesSearchValue}
        onSearchChange={setBundlesSearchValue}
        searchPlaceholder="Search bundles..."
        sorting={bundlesSorting}
        sortableColumns={BUNDLE_SORTABLE_COLUMNS}
        onSortingChange={setBundlesSorting}
        filterConfiguration={BUNDLE_FILTER_CONFIG}
        filters={bundlesFilters}
        onFilterChange={setBundlesFilters}
        enableLiveFiltering
        primaryAction={primaryAction}
      >
        <BundleTab
          {...context}
          data-testid={`${dataTestId}-bundle-tab`}
          onCountChange={setBundlesCount}
          onLoadingChange={setBundlesLoading}
          searchValue={bundlesSearchValue}
          sorting={bundlesSorting}
          filters={bundlesFilters}
          onNavigateTo={onNavigateTo}
          onEditBundle={handleEditBundle}
        />
      </DataDisplay>

      <ScreenBundleDialog
        open={openScreen}
        onOpenChange={open => {
          setOpenScreen(open)
          if (!open) setScreenDialogInitialData(undefined)
        }}
        onSuccess={() => setOpenScreen(false)}
        initialData={screenDialogInitialData}
        {...context}
      />
      <ActionBundleDialog
        open={openAction}
        onOpenChange={open => {
          setOpenAction(open)
          if (!open) setActionDialogInitialData(undefined)
        }}
        onSuccess={() => setOpenAction(false)}
        initialData={actionDialogInitialData}
        {...context}
      />
      <UserTaskBundleDialog
        open={openUserTask}
        onOpenChange={open => {
          setOpenUserTask(open)
          if (!open) setUserTaskDialogInitialData(undefined)
        }}
        onSuccess={() => setOpenUserTask(false)}
        initialData={userTaskDialogInitialData}
        {...context}
      />
    </div>
  )
}
