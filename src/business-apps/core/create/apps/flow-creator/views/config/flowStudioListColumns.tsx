import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@newwork/nw-design-system'
import { Download } from 'lucide-react'
import type { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import type { UserInfo } from '@/business-apps/platform/apps/spaces/hooks/useSpaceUserLookup'

export type FlowTemplateRow = FlowTemplate & { id: string; templateId?: string }

type TranslationFn = (key: string, vars?: Record<string, any>) => string

const formatDateTime = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const getInitials = (name: string): string => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase() || '?'
}

export function createFlowStudioListColumns(params: {
  t: TranslationFn
  appLabelByCode: Record<string, string>
  getCreatorInfo: (userId: string) => UserInfo | undefined
  getAppCode: (row: FlowTemplateRow) => string
  showCreatorColumn: boolean
  onExportTemplate?: (templateId: string) => void
}): ColumnDef<FlowTemplateRow>[] {
  const { t, appLabelByCode, getCreatorInfo, getAppCode, showCreatorColumn, onExportTemplate } = params

  const base: ColumnDef<FlowTemplateRow>[] = [
    {
      id: 'name',
      header: t('list-col-name'),
      accessorKey: 'name',
      size: 320,
      cell: ({ row }) => {
        const tpl = row.original
        const subtitle = tpl.description || tpl.id || t('list-no-id')
        return (
          <div className="gba:min-w-0">
            <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">
              {tpl.name || t('list-untitled')}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{subtitle}</div>
          </div>
        )
      }
    },
    {
      id: 'app',
      header: t('list-col-app'),
      accessorFn: row => getAppCode(row),
      size: 180,
      cell: ({ row }) => {
        const code = getAppCode(row.original)
        const label = appLabelByCode[code] || code || '—'
        return <div className="gba:text-sm gba:text-muted-foreground gba:truncate">{label}</div>
      }
    },
    {
      id: 'updatedAt',
      header: t('list-col-updated'),
      accessorFn: row => row.updatedAt || '',
      size: 190,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <div className="gba:text-right gba:text-sm gba:text-muted-foreground">
          {formatDateTime(row.original.updatedAt)}
        </div>
      )
    },
    {
      id: 'version',
      header: t('list-col-version'),
      accessorKey: 'version',
      size: 80,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <div className="gba:text-right gba:text-sm gba:text-muted-foreground">{row.original.version ?? 1}</div>
      )
    },
    {
      id: 'steps',
      header: t('list-col-steps'),
      accessorFn: row => Number(row.steps?.length || 0),
      size: 90,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <div className="gba:text-right gba:text-sm gba:text-muted-foreground">{row.original.steps?.length ?? 0}</div>
      )
    }
  ]

  if (onExportTemplate) {
    base.push({
      id: 'actions',
      header: '',
      size: 44,
      minSize: 44,
      maxSize: 44,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const templateId = String(row.original.templateId || row.original.id || '').trim()
        return (
          <div className="gba:flex gba:justify-end">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={event => {
                event.stopPropagation()
                if (templateId) onExportTemplate(templateId)
              }}
              disabled={!templateId}
              data-testid={`flow-template-export-${templateId || row.index}`}
            >
              <Download className="gba:h-4 gba:w-4" />
              <span className="gba:sr-only">{t('studio-export-flow')}</span>
            </Button>
          </div>
        )
      }
    })
  }

  if (!showCreatorColumn) return base

  const creatorColumn: ColumnDef<FlowTemplateRow> = {
    id: 'createdBy',
    header: t('list-col-created-by'),
    accessorFn: row => row.createdBy || '',
    size: 200,
    cell: ({ row }) => {
      const creatorId = String(row.original.createdBy || '').trim()
      const info = creatorId ? getCreatorInfo(creatorId) : undefined
      if (!info) {
        return <div className="gba:text-sm gba:text-muted-foreground">—</div>
      }
      const name = info.name || '—'
      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <Avatar className="gba:w-6 gba:h-6">
            {info.avatar && <AvatarImage src={info.avatar} />}
            <AvatarFallback className="gba:text-xs gba:bg-muted">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <span className="gba:text-sm gba:text-muted-foreground gba:truncate">{name}</span>
        </div>
      )
    }
  }

  // Insert creator column right after "app"
  return [base[0], base[1], creatorColumn, ...base.slice(2)]
}
