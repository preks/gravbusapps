import { useMemo, useState, useEffect, useCallback } from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import { getWinningChanceBadgeVariant } from '@/common/utils/badgeUtils'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'

interface OpportunityViewProps extends BusinessAppContextProps {
  contactId: string
}

export const OpportunityView: React.FC<OpportunityViewProps> = ({ contactId, ...context }) => {
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOpportunities = useCallback(async () => {
    if (!contactId || !context.accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await fetchCustomerOpportunities({
        contactIds: [contactId],
        limit: 100,
        orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
      })
      setOpportunities(result.opportunities || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }, [contactId, context.accessToken, fetchCustomerOpportunities])

  useEffect(() => {
    loadOpportunities()
  }, [loadOpportunities])

  const recordUrlBuilder = (opportunityId: string) => {
    return buildPlatformUrl('/platform/crm/opportunity-record', {
      opportunityId,
      source: 'customer-relations'
    })
  }

  const accountUrlBuilder = (accountId: string) => {
    return buildPlatformUrl('/platform/crm/account-record', {
      accountId,
      source: 'customer-relations'
    })
  }

  // CRM-specific: Winning Chance column (inline, following exit-opportunities pattern)
  const winningChanceColumn: ColumnDef<CustomerOpportunity> = useMemo(
    () => ({
      id: 'winningChance',
      accessorKey: 'winningChance',
      header: 'Winning Chance',
      size: 140,
      minSize: 120,
      maxSize: 180,
      cell: ({ row }) => {
        const winningChance = row.original.winningChance
        if (winningChance === undefined || winningChance === null) {
          return <span className="gba:text-sm gba:text-muted-foreground">Not set</span>
        }
        return (
          <Badge
            variant={getWinningChanceBadgeVariant(winningChance)}
            data-testid={`opportunity-winning-chance-${row.original.id}`}
          >
            {winningChance}%
          </Badge>
        )
      }
    }),
    []
  )

  return (
    <OpportunitySection
      opportunities={opportunities}
      isLoading={loading}
      error={error}
      recordUrlBuilder={recordUrlBuilder}
      accountUrlBuilder={accountUrlBuilder}
      additionalColumns={[winningChanceColumn]}
      extendVisibleColumns={['winningChance']}
      data-testid="contact-opportunities-section"
    />
  )
}
