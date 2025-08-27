import React, { useState, useEffect } from 'react';
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
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities';
import type { InvestmentOpportunity } from '@/common/data/investment/types';
import { navigateTo } from '@/common/utils/navigationUtils';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';
import { BarChartOutlined } from '@ant-design/icons';

interface AccountOpportunitiesProps {
  accountId: string;
  context: BusinessAppContextProps;
}

interface Opportunity extends InvestmentOpportunity {
  // Additional properties specific to this component
}

export const AccountOpportunities: React.FC<AccountOpportunitiesProps> = ({ 
  accountId, 
  context 
}) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context);

  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!accountId || !context.accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchInvestmentOpportunities({ 
          accountIds: [accountId], // Fix: use accountIds array instead of accountId
          limit: 50,
          orderBy: [{ field: 'createdAt', direction: 'DESC' }]
        });
        setOpportunities(result.InvestmentOpportunity || []);
      } catch (err) {
        console.error('Error fetching account opportunities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load opportunities');
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [accountId, context.accessToken, fetchInvestmentOpportunities]);

  const formatCurrency = (amount: number, currencyCode: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };



  const handleOpportunityClick = (opportunityId: string) => {
    const url = buildPlatformUrl('/platform/investments/investment-opportunity-record', { 
      opportunityId, 
      source: 'investments' 
    });
    navigateTo(url);
  };

  const getStageVariant = (stage: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'NEW_OPPORTUNITY': 'default',
      'IN_QUALIFICATION': 'secondary',
      'PROPOSAL_IN_PROGRESS': 'outline',
      'NEGOTIATION': 'secondary',
      'CLOSED': 'default'
    };
    return variants[stage] || 'outline';
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Open': 'default',
      'Won': 'default',
      'Lost': 'destructive'
    };
    return variants[status] || 'outline';
  };

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0);
  const openOpportunities = opportunities.filter(opp => opp.status !== 'Lost' && opp.status !== 'Won');
  const wonOpportunities = opportunities.filter(opp => opp.status === 'Won');

  return (
    <Card className="gba:w-full" data-testid="account-opportunities-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <BarChartOutlined />
            Opportunities ({opportunities.length})
          </CardTitle>
          <div className="gba:flex gba:gap-4 gba:text-sm">
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-blue-600">Open</div>
              <div>{openOpportunities.length}</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-green-600">Won</div>
              <div>{wonOpportunities.length}</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-gray-600">Total Value</div>
              <div className="gba:font-semibold">{formatCurrency(totalValue)}</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:text-center gba:py-10">
            <Spinner size="lg" />
            <p className="gba:mt-4 gba:text-gray-500">Loading opportunities...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="gba:mb-4">
            <div>Failed to load opportunities</div>
            <div className="gba:text-sm gba:mt-2">{error}</div>
          </Alert>
        ) : opportunities.length === 0 ? (
          <div className="gba:text-center gba:py-10" data-testid="no-opportunities-message">
            <div className="gba:text-4xl gba:mb-4">💼</div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-700 gba:mb-2">
              No Opportunities Found
            </h3>
            <p className="gba:text-gray-500">
              This account doesn't have any opportunities yet.
            </p>
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
                {opportunities.map((opportunity) => (
                  <TableRow key={opportunity.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => handleOpportunityClick(opportunity.id)}
                        className="gba:p-0 gba:h-auto gba:text-blue-600 gba:hover:text-blue-800"
                        data-testid={`opportunity-link-${opportunity.id}`}
                      >
                        {opportunity.name || 'Unnamed Opportunity'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {opportunity.estimatedAmount 
                        ? formatCurrency(opportunity.estimatedAmount, opportunity.currency?.code || 'EUR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStageVariant(opportunity.salesPipelineStage?.value || '')}
                        data-testid={`opportunity-stage-${opportunity.id}`}
                      >
                        {opportunity.salesPipelineStage?.value || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {opportunity.status ? (
                        <Badge variant={getStatusVariant(opportunity.status)}>
                          {opportunity.status}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {opportunity.ownerEmployee 
                        ? `${opportunity.ownerEmployee.firstName || ''} ${opportunity.ownerEmployee.lastName || ''}`.trim()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {opportunity.closeDate 
                        ? new Date(opportunity.closeDate).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {opportunity.createdAt 
                        ? new Date(opportunity.createdAt).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Simple pagination info */}
            <div className="gba:mt-4 gba:text-sm gba:text-gray-500 gba:text-center">
              Showing {opportunities.length} opportunities
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 