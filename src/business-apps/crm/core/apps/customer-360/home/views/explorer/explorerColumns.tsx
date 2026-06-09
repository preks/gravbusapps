import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { BankIcon, UserIcon } from '@phosphor-icons/react'
import type { CustomerPortfolioRow } from '../../../data/portfolio/types'
import type { CustomerSubjectType } from '../../../data/types'
import { getStatusBadgeVariant } from '../../../utils/statusBadge'
import { ATTENTION_REASON_KEYS, attentionBadgeVariant } from '../../attention'

type Translate = (key: string, vars?: Record<string, unknown>) => string

export interface ExplorerColumnsDeps {
  t: Translate
  openCustomer: (type: CustomerSubjectType, id: string) => void
}

export function createExplorerColumns({ t, openCustomer }: ExplorerColumnsDeps): ColumnDef<CustomerPortfolioRow>[] {
  return [
    {
      id: 'displayName',
      header: t('explorer-column-customer'),
      cell: ({ row }) => {
        const data = row.original
        const RowIcon = data.type === 'account' ? BankIcon : UserIcon
        return (
          <button
            type="button"
            onClick={() => openCustomer(data.type, data.id)}
            className="gba:flex gba:min-w-0 gba:items-center gba:gap-2 gba:text-left"
            data-testid={`customer-360-explorer-open-${data.type}-${data.id}`}
          >
            <RowIcon className="gba:size-4 gba:shrink-0 gba:text-muted-foreground" />
            <span className="gba:flex gba:min-w-0 gba:flex-col">
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
      id: 'type',
      header: t('explorer-column-type'),
      cell: ({ row }) => (
        <Badge variant="outline" size="sm">
          {row.original.type === 'account' ? t('overline-account') : t('overline-contact')}
        </Badge>
      )
    },
    {
      id: 'status',
      header: t('explorer-column-status'),
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
      cell: ({ row }) =>
        row.original.ownerId ? (
          <Badge variant="secondary" size="sm">
            {t('explorer-owner-assigned')}
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            {t('explorer-owner-unassigned')}
          </Badge>
        )
    },
    {
      id: 'health',
      header: t('explorer-column-health'),
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
      cell: ({ row }) => (
        <Badge variant={attentionBadgeVariant(row.original.attentionScore)} size="sm">
          {row.original.attentionScore}
        </Badge>
      )
    },
    {
      id: 'reasons',
      header: t('explorer-column-reasons'),
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
