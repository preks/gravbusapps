import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Alert,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button
} from '@newwork/nw-design-system'
import { BarChartOutlined } from '@ant-design/icons'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatNumberFunction, formatDate } from '@/common/utils/windowUtils'
import type { GenericOpportunity, OpportunitySectionProps } from './types'

export const OpportunitySection = <T extends GenericOpportunity = GenericOpportunity>({
  opportunities,
  isLoading = false,
  error = null,
  onRetry,
  recordUrlBuilder,
  className = '',
  'data-testid': dataTestId = 'opportunity-section'
}: OpportunitySectionProps<T>) => {
  const formatCurrency = (amount: number, currencyCode: string = 'EUR') => {
    const formattedNumber = formatNumberFunction(amount, '0,0')
    return `${formattedNumber} ${currencyCode}`
  }

  const handleOpportunityClick = (opportunityId: string) => {
    const url = recordUrlBuilder(opportunityId)
    navigateTo(url)
  }

  const getStageVariant = (stage: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      NEW_OPPORTUNITY: 'default',
      IN_QUALIFICATION: 'secondary',
      PROPOSAL_IN_PROGRESS: 'outline',
      NEGOTIATION: 'secondary',
      CLOSED: 'default'
    }
    return variants[stage] || 'outline'
  }

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Open: 'default',
      Won: 'default',
      Lost: 'destructive'
    }
    return variants[status] || 'outline'
  }

  // Calculate total value and detect currency
  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)

  // Get unique currencies from opportunities
  const currencies = Array.from(new Set(opportunities.filter(opp => opp.currency?.code).map(opp => opp.currency!.code)))

  // Use single currency if all opportunities share the same currency, otherwise indicate mixed
  const totalCurrency = currencies.length === 1 ? currencies[0] : null
  const isMixedCurrency = currencies.length > 1

  const openOpportunities = opportunities.filter(opp => {
    const status = opp.opportunityStatus?.value || opp.opportunityStatus?.code || ''
    return status !== 'Lost' && status !== 'Won'
  })
  const wonOpportunities = opportunities.filter(opp => {
    const status = opp.opportunityStatus?.value || opp.opportunityStatus?.code || ''
    return status === 'Won'
  })

  return (
    <Card className={`gba:w-full ${className}`} data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <BarChartOutlined />
            Opportunities ({opportunities.length})
          </CardTitle>
          <div className="gba:flex gba:gap-4 gba:text-sm">
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-info">Open</div>
              <div>{openOpportunities.length}</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-success">Won</div>
              <div>{wonOpportunities.length}</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-muted-foreground">Total Value</div>
              <div className="gba:font-semibold">
                {totalCurrency
                  ? formatCurrency(totalValue, totalCurrency)
                  : isMixedCurrency
                    ? `${formatNumberFunction(totalValue, '0,0')} (Mixed)`
                    : '-'}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="gba:text-center gba:py-10">
            <Spinner size="lg" />
            <p className="gba:mt-4 gba:text-muted-foreground">Loading opportunities...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="gba:mb-4">
            <div>Failed to load opportunities</div>
            <div className="gba:text-sm gba:mt-2">{error}</div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm" className="gba:mt-2">
                Retry
              </Button>
            )}
          </Alert>
        ) : opportunities.length === 0 ? (
          <div className="gba:text-center gba:py-10" data-testid="no-opportunities-message">
            <div className="gba:text-4xl gba:mb-4">💼</div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">No Opportunities Found</h3>
            <p className="gba:text-muted-foreground">This account doesn't have any opportunities yet.</p>
          </div>
        ) : (
          <div className="gba:w-full" data-testid="opportunities-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map(opportunity => (
                  <TableRow key={opportunity.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => handleOpportunityClick(opportunity.id)}
                        className="gba:p-0 gba:h-auto gba:text-primary gba:hover:text-primary"
                        data-testid={`opportunity-link-${opportunity.id}`}
                      >
                        {opportunity.name || 'Unnamed Opportunity'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {opportunity.estimatedAmount
                        ? formatCurrency(opportunity.estimatedAmount, opportunity.currency?.code || 'EUR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStageVariant(
                          opportunity.opportunityPipelineStage?.value ||
                            opportunity.opportunityPipelineStage?.code ||
                            ''
                        )}
                        data-testid={`opportunity-stage-${opportunity.id}`}
                      >
                        {opportunity.opportunityPipelineStage?.value ||
                          opportunity.opportunityPipelineStage?.code ||
                          '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {opportunity.opportunityStatus ? (
                        <Badge
                          variant={getStatusVariant(
                            opportunity.opportunityStatus.value || opportunity.opportunityStatus.code || ''
                          )}
                        >
                          {opportunity.opportunityStatus.value || opportunity.opportunityStatus.code || '-'}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {opportunity.ownerEmployee
                        ? `${opportunity.ownerEmployee.firstName || ''} ${opportunity.ownerEmployee.lastName || ''}`.trim()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {opportunity.closeDate ? formatDate(opportunity.closeDate, 'date.short') : '-'}
                    </TableCell>
                    <TableCell>
                      {opportunity.createdAt ? formatDate(opportunity.createdAt, 'date.short') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Simple pagination info */}
            <div className="gba:mt-4 gba:text-sm gba:text-muted-foreground gba:text-center">
              Showing {opportunities.length} opportunities
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default OpportunitySection
