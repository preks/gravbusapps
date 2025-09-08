import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  Button,
  Badge
} from '@newwork/nw-design-system';
import { Calendar, TrendingUp, DollarSign, BarChart3, Percent } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetEquityInvestmentReports } from '../queries/EquityInvestmentReportQueries';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface EquityHistoricalDataTableProps extends BusinessAppContextProps {
  investmentId?: string;
  equityInvestmentId?: string;
}

interface HistoricalDataPoint {
  id: string;
  reportDate: string;
  uploadDate: string;
  totalInvestmentAmount?: number | null;
  marketValue?: number | null;
  stakePercentage?: number | null;
  turnoverAmount?: number | null;
  ebitdaAmount?: number | null;
  currency?: {
    code: string;
    value: string;
  } | null;
  investment?: {
    totalInvestmentAmount?: number | null;
    stakePercentage?: number | null;
  } | null;
}

const EquityHistoricalDataTable: React.FC<EquityHistoricalDataTableProps> = ({ 
  investmentId, 
  equityInvestmentId, 
  accessToken,
  ...context 
}) => {
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchEquityInvestmentReports } = useGetEquityInvestmentReports({ accessToken, ...context });

  // Helper function to format currency values
  const formatCurrencyValue = (amount: number | null, currencyCode = 'EUR'): string => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format percentage values
  const formatPercentageValue = (value: number | null): string => {
    if (!value && value !== 0) return '-';
    return `${value.toFixed(1)}%`;
  };

  // Helper function to format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return '-';
    }
  };

  // Load historical data directly in useEffect to avoid callback dependency issues
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || !investmentId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch equity investment reports for this specific investment
        const investmentIds = [investmentId];
        const reports = await fetchEquityInvestmentReports({
          investmentIds,
          orderBy: [{ field: 'date', direction: 'DESC' }],
          limit: 50
        });
        
        // Transform reports into historical data points
        const transformedData: HistoricalDataPoint[] = reports.map((report: any) => ({
          id: report.id,
          reportDate: report.date,
          uploadDate: report.createdAt || report.date, // Use upload date (createdAt) or fallback to report date
          totalInvestmentAmount: report.equityInvestment?.investment?.totalInvestmentAmount || null,
          marketValue: report.marketValue || null,
          stakePercentage: report.equityInvestment?.investment?.stakePercentage || null,
          turnoverAmount: report.turnoverAmount || null,
          ebitdaAmount: report.ebitdaAmount || null,
          currency: report.currency || report.equityInvestment?.investment?.currency || null,
          investment: report.equityInvestment?.investment || null
        }));
        
        setHistoricalData(transformedData);
      } catch (err) {
        console.error('Error loading historical data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load historical data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [accessToken, investmentId]); // Only depend on stable props

  // Manual refresh function for retry button
  const refreshData = useCallback(async () => {
    if (!accessToken || !investmentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const investmentIds = [investmentId];
      const reports = await fetchEquityInvestmentReports({
        investmentIds,
        orderBy: [{ field: 'date', direction: 'DESC' }],
        limit: 50
      });
      
      const transformedData: HistoricalDataPoint[] = reports.map((report: any) => ({
        id: report.id,
        reportDate: report.date,
        uploadDate: report.createdAt || report.date,
        totalInvestmentAmount: report.equityInvestment?.investment?.totalInvestmentAmount || null,
        marketValue: report.marketValue || null,
        stakePercentage: report.equityInvestment?.investment?.stakePercentage || null,
        turnoverAmount: report.turnoverAmount || null,
        ebitdaAmount: report.ebitdaAmount || null,
        currency: report.currency || report.equityInvestment?.investment?.currency || null,
        investment: report.equityInvestment?.investment || null
      }));
      
      setHistoricalData(transformedData);
    } catch (err) {
      console.error('Error loading historical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load historical data');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, investmentId, fetchEquityInvestmentReports]);

  if (isLoading) {
    return (
      <Card data-testid="equity-historical-data-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrendingUp className="gba:h-5 gba:w-5 gba:text-gray-700" />
            {getTranslationFromI18nKeyAndLabel('crm.investments.equity.reports.historical.title', 'Historical Investment Data')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <Spinner size="large" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="equity-historical-data-error">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrendingUp className="gba:h-5 gba:w-5 gba:text-gray-700" />
            {getTranslationFromI18nKeyAndLabel('crm.investments.equity.reports.historical.title', 'Historical Investment Data')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert
            message="Error Loading Historical Data"
            description={error}
            type="error"
            showIcon
            action={<Button size="small" onClick={refreshData}>Retry</Button>}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="equity-historical-data-table">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <TrendingUp className="gba:h-5 gba:w-5 gba:text-gray-700" />
            {getTranslationFromI18nKeyAndLabel('crm.investments.equity.reports.historical.title', 'Historical Investment Data')}
            <Badge variant="secondary" className="gba:ml-2">
              {historicalData.length} reports
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {historicalData.length === 0 ? (
          <div className="gba:text-center gba:py-8" data-testid="equity-historical-data-empty">
            <TrendingUp className="gba:h-12 gba:w-12 gba:text-gray-400 gba:mx-auto gba:mb-4" />
            <p className="gba:text-gray-600 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm.investments.equity.reports.historical.empty', 'No historical investment data available')}
            </p>
            <p className="gba:text-sm gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('crm.investments.equity.reports.historical.empty.description', 'Upload investment reports to see historical data trends')}
            </p>
          </div>
        ) : (
          <div className="gba:overflow-x-auto">
            <Table data-testid="equity-historical-data-table-content">
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[60px]" data-testid="equity-historical-data-actions-header">
                    ACTIONS
                  </TableHead>
                  <TableHead data-testid="equity-historical-data-upload-date-header">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:h-4 gba:w-4" />
                      Upload Date
                    </div>
                  </TableHead>
                  <TableHead data-testid="equity-historical-data-report-date-header">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:h-4 gba:w-4" />
                      Report Date
                    </div>
                  </TableHead>
                  <TableHead data-testid="equity-historical-data-total-investment-header">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <DollarSign className="gba:h-4 gba:w-4" />
                      Total Investment
                    </div>
                  </TableHead>
                  <TableHead data-testid="equity-historical-data-market-value-header">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <TrendingUp className="gba:h-4 gba:w-4" />
                      Market Value
                    </div>
                  </TableHead>
                  <TableHead data-testid="equity-historical-data-stake-percentage-header">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Percent className="gba:h-4 gba:w-4" />
                      Stake %
                    </div>
                  </TableHead>
                  <TableHead data-testid="equity-historical-data-turnover-header">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <BarChart3 className="gba:h-4 gba:w-4" />
                      Turnover
                    </div>
                  </TableHead>
                  <TableHead data-testid="equity-historical-data-ebitda-header">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <TrendingUp className="gba:h-4 gba:w-4" />
                      EBITDA
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalData.map((dataPoint) => {
                  const currencyCode = dataPoint.currency?.code || 'EUR';
                  
                  return (
                    <TableRow key={dataPoint.id} data-testid={`equity-historical-data-row-${dataPoint.id}`}>
                      <TableCell className="gba:py-4 gba:px-6">
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`equity-historical-data-update-report-button-${dataPoint.id}`}
                            size="icon"
                            contextsArray={[FlowContextName.entityContext]}
                            externalContextData={{ entityId: dataPoint.id }}
                            prefixDataTestId={`equity-historical-data-update-report`}
                            accessToken={accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                      <TableCell data-testid={`equity-historical-data-upload-date-${dataPoint.id}`}>
                        <div className="gba:font-medium gba:text-gray-900">
                          {formatDate(dataPoint.uploadDate)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`equity-historical-data-report-date-${dataPoint.id}`}>
                        <div className="gba:text-gray-700">
                          {formatDate(dataPoint.reportDate)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`equity-historical-data-total-investment-${dataPoint.id}`}>
                        <div className="gba:font-medium gba:text-gray-900">
                          {formatCurrencyValue(dataPoint.totalInvestmentAmount, currencyCode)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`equity-historical-data-market-value-${dataPoint.id}`}>
                        <div className="gba:font-medium gba:text-green-600">
                          {formatCurrencyValue(dataPoint.marketValue, currencyCode)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`equity-historical-data-stake-percentage-${dataPoint.id}`}>
                        <div className="gba:font-medium gba:text-blue-600">
                          {formatPercentageValue(dataPoint.stakePercentage)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`equity-historical-data-turnover-${dataPoint.id}`}>
                        <div className="gba:font-medium gba:text-gray-900">
                          {formatCurrencyValue(dataPoint.turnoverAmount, currencyCode)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`equity-historical-data-ebitda-${dataPoint.id}`}>
                        <div className="gba:font-medium gba:text-purple-600">
                          {formatCurrencyValue(dataPoint.ebitdaAmount, currencyCode)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquityHistoricalDataTable;
