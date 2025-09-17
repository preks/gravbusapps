// Investment Report Column Definitions Factory
import React from 'react';
import dayjs from 'dayjs';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction, formatDate } from '@/common/utils/windowUtils';

export interface ColumnDefinition {
  key: string;
  title: string;
  width?: string;
  sortable?: boolean;
  render: (record: any) => React.ReactElement;
}

// Helper functions using central windowUtils formatters
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return formatNumberFunction(amount, '€ 0,0');
};

const formatDateDisplay = (date: string | null | undefined): string => {
  if (!date) return '-';
  try {
    const formatted = formatDate(date, 'date.short');
    if (formatted && !formatted.includes('T')) {
      return formatted;
    }
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '-';
  }
};

const calculateHoldingPeriod = (acquisitionDate: string | null): string => {
  if (!acquisitionDate) return '-';
  try {
    const startDate = dayjs(acquisitionDate);
    const today = dayjs();
    const diffDays = today.diff(startDate, 'days');
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      if (remainingMonths > 0) {
        return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
      }
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  } catch {
    return '-';
  }
};

export const createInvestmentReportColumns = (
  investmentType?: string,
  accessToken?: string
): ColumnDefinition[] => {
  // Base columns that all investment types have
  const baseColumns: ColumnDefinition[] = [
    {
      key: 'date',
      title: getTranslationFromI18nKeyAndLabel('crm.investments.reports.columns.date', 'Date'),
      sortable: true,
      render: (record: any) => React.createElement('span', null, formatDateDisplay(record.date)),
    }
  ];

  // Add investment-type-specific columns
  switch (investmentType?.toLowerCase()) {
    case 'real_estate_general':
      baseColumns.push(
        {
          key: 'buildingYear',
          title: 'Building Year',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.realEstateInvestmentReport?.[0]?.realEstateInvestment?.buildingYear || '-'),
        },
        {
          key: 'size',
          title: 'Size',
          sortable: true,
          render: (record: any) => {
            const size = record.realEstateInvestmentReport?.[0]?.realEstateInvestment?.size;
            const unit = record.realEstateInvestmentReport?.[0]?.realEstateInvestment?.sizeMeasurementUnit?.value;
            return React.createElement('span', null, size ? `${size} ${unit || ''}` : '-');
          },
        },
        {
          key: 'occupancyPercent',
          title: 'Occupancy Percent',
          sortable: true,
          render: (record: any) => {
            const occupancy = record.realEstateInvestmentReport?.[0]?.occupancyPercent;
            return React.createElement('span', null, (occupancy !== null && occupancy !== undefined) ? `${occupancy}%` : '-');
          },
        },
        {
          key: 'totalInvestmentAmount',
          title: 'Total Investment Amount',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investment?.totalInvestmentAmount)),
        },
        {
          key: 'annualNetColdRent',
          title: 'Annual Net Cold Rent',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.realEstateInvestmentReport?.[0]?.annualNetColdRent)),
        },
        {
          key: 'funding',
          title: 'Funding',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.realEstateInvestmentReport?.[0]?.funding)),
        },
        {
          key: 'investmentRole',
          title: 'Investment Role',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.investment?.investmentRole?.value || '-'),
        },
        {
          key: 'stakePercentage',
          title: 'Stake Percentage',
          sortable: true,
          render: (record: any) => {
            const stake = record.investment?.stakePercentage;
            return React.createElement('span', null, (stake !== null && stake !== undefined) ? `${stake.toFixed(1)}%` : '-');
          },
        },
        {
          key: 'holdingPeriod',
          title: 'Holding Period',
          sortable: false,
          render: (record: any) => React.createElement('span', null, record.investment?.acquisitionDate ? calculateHoldingPeriod(record.investment.acquisitionDate) : '-'),
        }
      );
      break;
      
    case 'equity':
      baseColumns.push(
        {
          key: 'foundationDate',
          title: 'Foundation Date',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatDateDisplay(record.equityInvestmentReport?.[0]?.equityInvestment?.foundationDate)),
        },
        {
          key: 'acquisitionDate',
          title: 'Acquisition Date',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatDateDisplay(record.investment?.acquisitionDate)),
        },
        {
          key: 'initialInvestmentAmount',
          title: 'Initial Investment',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investment?.initialInvestmentAmount)),
        },
        {
          key: 'totalInvestmentAmount',
          title: 'Total Investment Amount',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investment?.totalInvestmentAmount)),
        },
        {
          key: 'marketValue',
          title: 'Market Value',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investmentMarketValue || record.equityInvestmentReport?.[0]?.marketValue)),
        },
        {
          key: 'stakePercentage',
          title: 'Stake Percentage',
          sortable: true,
          render: (record: any) => {
            const stake = record.investment?.stakePercentage;
            return React.createElement('span', null, (stake !== null && stake !== undefined) ? `${stake.toFixed(1)}%` : '-');
          },
        },
        {
          key: 'turnoverAmount',
          title: 'Turnover Amount',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.equityInvestmentReport?.[0]?.turnoverAmount)),
        },
        {
          key: 'ebitdaAmount',
          title: 'EBITDA Amount',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.equityInvestmentReport?.[0]?.ebitdaAmount)),
        },
        {
          key: 'investmentRole',
          title: 'Investment Role',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.investment?.investmentRole?.value || '-'),
        }
      );
      break;

    case 'liquid_fund':
      baseColumns.push(
        {
          key: 'fundType',
          title: 'Fund Type',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.liquidFundInvestmentReport?.[0]?.investmentLiquidFundType?.value || '-'),
        },
        {
          key: 'isinCode',
          title: 'ISIN Code',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.investment?.isin || '-'),
        },
        {
          key: 'bankName',
          title: 'Bank',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.liquidFundInvestmentReport?.[0]?.bankName || '-'),
        },
        {
          key: 'proprietorName',
          title: 'Proprietor Name',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.investment?.investmentAccount?.name || '-'),
        },
        {
          key: 'initialInvestmentAmount',
          title: 'Initial Investment',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investment?.initialInvestmentAmount)),
        },
        {
          key: 'totalInvestmentAmount',
          title: 'Total Investment Amount',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investment?.totalInvestmentAmount)),
        },
        {
          key: 'marketValue',
          title: 'Market Value',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investmentMarketValue)),
        },
        {
          key: 'currency',
          title: 'Currency',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.investment?.currency?.code || '-'),
        },
        {
          key: 'bankAccountNumber',
          title: 'Bank Account Number',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.liquidFundInvestmentReport?.[0]?.bankAccountNumber || '-'),
        },
        {
          key: 'interestRate',
          title: 'Interest Rate',
          sortable: true,
          render: (record: any) => {
            const rate = record.liquidFundInvestmentReport?.[0]?.interestRate;
            return React.createElement('span', null, (rate !== null && rate !== undefined) ? `${rate.toFixed(2)}%` : '-');
          },
        },
        {
          key: 'maturityDate',
          title: 'Maturity Date',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatDateDisplay(record.liquidFundInvestmentReport?.[0]?.maturityDate)),
        },
        {
          key: 'acquisitionDate',
          title: 'Acquisition Date',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatDateDisplay(record.investment?.acquisitionDate)),
        },
        {
          key: 'investmentStatus',
          title: 'Investment Status',
          sortable: true,
          render: (record: any) => React.createElement('span', null, record.investment?.investmentStatus?.value || '-'),
        }
      );
      break;
        
    default:
      // Default columns for backward compatibility
      baseColumns.push(
        {
          key: 'totalInvestmentAmount',
          title: 'Total Investment Amount',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investment?.totalInvestmentAmount)),
        },
        {
          key: 'marketValue',
          title: 'Market Value',
          sortable: true,
          render: (record: any) => React.createElement('span', null, formatCurrency(record.investmentMarketValue)),
        }
      );
      break;
  }

  // Add Actions column as the last column
  if (accessToken) {
    baseColumns.push({
      key: 'actions',
      title: 'ACTIONS',
      width: '60px',
      render: (record: any) => React.createElement(
        'div',
        { className: 'gba:flex gba:justify-start gba:gap-2' },
        React.createElement(AppActionButton, {
          'data-testid': `investment-reports-update-button-${record.id}`,
          size: 'icon' as const,
          contextsArray: [FlowContextName.investmentEntity],
          externalContextData: { entityId: record.id },
          prefixDataTestId: 'investment-reports-update',
          accessToken: accessToken,
          emptyStateBehavior: 'enable' as const,
          deferMainContextRequestsUntilClick: true,
          onClick: (e: React.MouseEvent) => e.stopPropagation()
        })
      ),
    });
  }

  return baseColumns;
};