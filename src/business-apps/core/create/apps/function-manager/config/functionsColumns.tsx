import React from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'

type TranslationFn = (key: string) => string

const BooleanCell: React.FC<{ value?: boolean }> = ({ value }) => (
  <div className="gba:flex gba:items-center gba:justify-center">
    {value ? (
      <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
    ) : (
      <span className="gba:text-muted-foreground">-</span>
    )}
  </div>
)

export const createFunctionsColumns = (t: TranslationFn): ColumnDef<LatestFunctionItem>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: t('column-name'),
    size: 200,
    cell: ({ row }) => <div className="gba:font-medium">{row.original.name}</div>
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: t('column-description'),
    size: 300,
    meta: { type: 'text' }
  },
  {
    id: 'agentEnabled',
    header: t('column-agent'),
    size: 80,
    meta: { align: 'center' },
    cell: ({ row }) => <BooleanCell value={row.original.agentEnabled} />
  },
  {
    id: 'workflowEnabled',
    header: t('column-workflow'),
    size: 80,
    meta: { align: 'center' },
    cell: ({ row }) => <BooleanCell value={row.original.workflowEnabled} />
  },
  {
    id: 'version',
    header: t('column-version'),
    size: 120,
    meta: { align: 'right' },
    cell: ({ row }) => <div className="gba:text-right">v{row.original.latestVersion?.version ?? '-'}</div>
  }
]

export const functionsSortableColumns = [
  { id: 'name', label: 'Name' },
  { id: 'description', label: 'Description' },
  { id: 'agentEnabled', label: 'Agent' },
  { id: 'workflowEnabled', label: 'Workflow' },
  { id: 'version', label: 'Version' }
]

export const getDefaultVisibleColumns = (): string[] => [
  'name',
  'description',
  'agentEnabled',
  'workflowEnabled',
  'version'
]
