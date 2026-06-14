import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@newwork/nw-design-system'
import { BankIcon } from '@phosphor-icons/react'
import type { CustomerPortfolioRow } from '../../../data/portfolio/types'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getStatusBadgeVariant } from '../../../utils/statusBadge'
import { ATTENTION_REASON_KEYS, attentionBadgeVariant } from '../../attention'

type Translate = (key: string, vars?: Record<string, unknown>) => string

function getInitials(name: string): string {
  const initials = name
    .split(' ')
    .map(part => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return initials || 'O'
}

export interface ExplorerColumnsDeps {
  t: Translate
  openCustomer: (id: string) => void
}

export function createExplorerColumns({ t, openCustomer }: ExplorerColumnsDeps): ColumnDef<CustomerPortfolioRow>[] {
  return [
    {
      id: 'displayName',
      header: t('explorer-column-customer'),
      size: 360,
      minSize: 280,
      cell: ({ row }) => {
        const data = row.original
        return (
          <button
            type="button"
            onClick={() => openCustomer(data.id)}
            className="gba:flex gba:w-full gba:min-w-0 gba:items-center gba:gap-2 gba:text-left"
            data-testid={`customer-360-explorer-open-${data.type}-${data.id}`}
          >
            <BankIcon className="gba:size-4 gba:shrink-0 gba:text-muted-foreground" />
            <span className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col">
              <span className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground gba:hover:underline">
                {data.displayName}
              </span>
              {data.secondary ? (
                <span className="gba:truncate gba:text-xs gba:text-muted-foreground">{data.secondary}</span>
              ) : null}
            </span>
          </button>
        )
      }
    },
    {
      id: 'email',
      header: t('explorer-column-email'),
      size: 180,
      minSize: 140,
      cell: ({ row }) => {
        const email = row.original.email
        if (!email) return <span className="gba:text-muted-foreground">—</span>
        return (
          <a
            href={`mailto:${email}`}
            onClick={event => event.stopPropagation()}
            className="gba:truncate gba:text-sm gba:text-muted-foreground gba:hover:underline"
            data-testid={`customer-360-explorer-email-${row.original.id}`}
          >
            {email}
          </a>
        )
      }
    },
    {
      id: 'status',
      header: t('explorer-column-status'),
      size: 120,
      minSize: 100,
      cell: ({ row }) => {
        const status = row.original.status
        if (!status) return <span className="gba:text-muted-foreground">—</span>
        return (
          <Badge variant={getStatusBadgeVariant(status)} size="sm">
            {status}
          </Badge>
        )
      }
    },
    {
      id: 'owner',
      header: t('explorer-column-owner'),
      size: 220,
      minSize: 180,
      cell: ({ row }) => {
        const ownerId = row.original.ownerId
        const ownerName = row.original.ownerName

        if (!ownerId || !ownerName) {
          return <span className="gba:text-sm gba:text-muted-foreground">{t('explorer-owner-unassigned')}</span>
        }

        return (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              navigateTo(`/platform/employee-record?employeeId=${ownerId}`)
            }}
            className="gba:flex gba:w-full gba:min-w-0 gba:items-center gba:gap-3 gba:border-0 gba:bg-transparent gba:p-0 gba:text-left gba:cursor-pointer gba:group"
            data-testid={`customer-360-explorer-owner-${row.original.id}`}
          >
            <Avatar className="gba:size-8 gba:shrink-0 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:transition-all gba:group-hover:[outline-color:var(--nw-color-primary-500)]">
              {row.original.ownerPictureThumbnail ? (
                <AvatarImage src={`data:image/gif;base64,${row.original.ownerPictureThumbnail}`} alt={ownerName} />
              ) : null}
              <AvatarFallback>{getInitials(ownerName)}</AvatarFallback>
            </Avatar>
            <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium gba:transition-colors gba:group-hover:gba:text-primary">
              {ownerName}
            </span>
          </button>
        )
      }
    },
    {
      id: 'health',
      header: t('explorer-column-health'),
      size: 110,
      minSize: 90,
      cell: ({ row }) => {
        const health = row.original.summary.health
        return typeof health === 'number' ? (
          <span className="gba:font-medium">{health}</span>
        ) : (
          <span className="gba:text-muted-foreground">—</span>
        )
      }
    },
    {
      id: 'attentionScore',
      header: t('explorer-column-attention'),
      size: 120,
      minSize: 100,
      cell: ({ row }) => (
        <Badge variant={attentionBadgeVariant(row.original.attentionScore)} size="sm">
          {row.original.attentionScore}
        </Badge>
      )
    },
    {
      id: 'reasons',
      header: t('explorer-column-reasons'),
      size: 220,
      minSize: 160,
      cell: ({ row }) => {
        const reasons = row.original.attentionReasons
        if (reasons.length === 0) return <span className="gba:text-muted-foreground">—</span>
        return (
          <span className="gba:text-xs gba:text-muted-foreground">
            {reasons
              .slice(0, 3)
              .map(code => t(ATTENTION_REASON_KEYS[code]))
              .join(' · ')}
          </span>
        )
      }
    }
  ]
}

export const EXPLORER_SORTABLE_COLUMNS = [
  { id: 'displayName', label: 'Customer' },
  { id: 'status', label: 'Status' },
  { id: 'health', label: 'Health' },
  { id: 'attentionScore', label: 'Attention' }
]
