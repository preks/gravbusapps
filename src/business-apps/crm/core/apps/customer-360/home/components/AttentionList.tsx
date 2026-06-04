import React, { useCallback } from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { BankIcon, UserIcon } from '@phosphor-icons/react'
import customer360I18n from '../../_i18n'
import type { CustomerPortfolioRow } from '../../data/portfolio/types'
import type { CustomerSubjectType } from '../../data/types'
import Customer360List, { type Customer360RowData } from '../../components/Customer360List'
import { ATTENTION_REASON_KEYS, attentionBadgeVariant } from '../attention'

export interface AttentionListProps {
  rows: CustomerPortfolioRow[]
  openCustomer: (type: CustomerSubjectType, id: string) => void
  /** Limit the number of rows rendered (e.g. cockpit preview). */
  limit?: number
  testId?: string
}

/**
 * Prioritized list of customers needing attention. Each row deep-links into the
 * 360° detail and explains *why* it surfaced via translated reason codes.
 */
const AttentionList: React.FC<AttentionListProps> = ({ rows, openCustomer, limit, testId }) => {
  const { t } = useFluentTranslation(customer360I18n)

  const buildReasonText = useCallback(
    (row: CustomerPortfolioRow): string =>
      row.attentionReasons
        .slice(0, 3)
        .map(code => t(ATTENTION_REASON_KEYS[code]))
        .join(' · '),
    [t]
  )

  const visible = typeof limit === 'number' ? rows.slice(0, limit) : rows

  const listRows: Customer360RowData[] = visible.map(row => ({
    id: `${row.type}:${row.id}`,
    icon: row.type === 'account' ? BankIcon : UserIcon,
    primary: row.displayName,
    secondary: buildReasonText(row) || row.secondary,
    trailing: (
      <Badge variant={attentionBadgeVariant(row.attentionScore)} size="sm">
        {row.attentionScore}
      </Badge>
    ),
    onClick: () => openCustomer(row.type, row.id),
    testId: `customer-360-attention-row-${row.type}-${row.id}`
  }))

  return <Customer360List rows={listRows} testId={testId} />
}

export default AttentionList
export { AttentionList }
