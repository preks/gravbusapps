import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge
} from '@newwork/nw-design-system';
import { TrendingUp, Calendar, DollarSign, Percent } from 'lucide-react';
import { EquityInvestmentData } from '../hooks/useEquityRecordData';

interface InvestmentRoundsProps {
  equityData?: EquityInvestmentData | null;
  isLoading?: boolean;
  'data-testid'?: string;
}

const InvestmentRounds: React.FC<InvestmentRoundsProps> = ({
  equityData,
  isLoading,
  'data-testid': dataTestId = 'investment-rounds'
}) => {
  // Helper function to format currency
  const formatCurrency = (amount: number | null, currency?: { code: string } | null): string => {
    if (!amount && amount !== 0) return 'N/A';
    const currencyCode = currency?.code || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format percentage
  const formatPercentage = (value: number | null): string => {
    if (!value && value !== 0) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  // Get investment rounds from equity data
  const investmentRounds = equityData?.equityInvestment?.equityInvestmentRound || [];

  if (isLoading) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrendingUp className="gba:h-5 gba:w-5" />
            Investment Rounds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="gba:h-12 gba:bg-gray-200 gba:rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />
          Investment Rounds
          <Badge variant="outline" className="gba:ml-2">
            {investmentRounds.length} rounds
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${dataTestId}-table`}>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:h-4 gba:w-4" />
                      Name
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                      <Calendar className="gba:h-4 gba:w-4" />
                      Year
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                      <DollarSign className="gba:h-4 gba:w-4" />
                      Pre Value
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                      <DollarSign className="gba:h-4 gba:w-4" />
                      Investment Volume
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                      <DollarSign className="gba:h-4 gba:w-4" />
                      Volume Share
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                      <Percent className="gba:h-4 gba:w-4" />
                      Share Percentage
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentRounds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="gba:text-center gba:py-12 gba:text-gray-500">
                      <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                        <TrendingUp className="gba:h-12 gba:w-12 gba:text-gray-300" />
                        <p className="gba:text-lg gba:font-medium">No Investment Rounds</p>
                        <p className="gba:text-sm">No investment rounds have been recorded for this equity investment.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  investmentRounds.map((round, index) => (
                  <TableRow 
                    key={round.id || index} 
                    className="gba:border-b gba:hover:bg-gray-50"
                    data-testid={`${dataTestId}-row-${index}`}
                  >
                    <TableCell className="gba:py-3 gba:px-4">
                      <div className="gba:font-medium gba:text-gray-900">
                        {round.name || `Round ${index + 1}`}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <span className="gba:text-sm gba:text-gray-600">
                        {round.year || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <span className="gba:font-mono gba:font-medium gba:text-gray-900">
                        {formatCurrency(round.preValue, round.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <span className="gba:font-mono gba:font-medium gba:text-gray-900">
                        {formatCurrency(round.investmentVolume, round.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <span className="gba:font-mono gba:font-medium gba:text-blue-600">
                        {formatCurrency(round.volumeShare, round.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <Badge variant="secondary" className="gba:font-mono">
                        {formatPercentage(round.roundSharePercentage)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentRounds;
