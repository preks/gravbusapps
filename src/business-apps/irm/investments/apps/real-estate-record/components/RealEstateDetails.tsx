import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Home } from 'lucide-react';
import { RealEstateInvestmentRecord } from '../types';
import { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';
import { formatCurrency } from '../../shared/utils/formatters';

interface RealEstateDetailsProps {
  data?: RealEstateInvestmentRecord; // Legacy mock data
  realEstateData?: RealEstateInvestmentData | null; // Real GraphQL data
  isLoading?: boolean;
}

const RealEstateDetails: React.FC<RealEstateDetailsProps> = ({ data, realEstateData, isLoading }) => {
  // Helper function to format currency with GraphQL data
  const formatCurrencyValue = (amount: number | null, currency?: { code: string } | null): string => {
    if (!amount && amount !== 0) return 'N/A';
    const currencyCode = currency?.code || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  // Helper function to build location string
  const buildLocationString = (): string => {
    if (realEstateData) {
      const parts = [
        realEstateData.addressLine,
        realEstateData.postalCode,
        realEstateData.city,
        realEstateData.country?.value,
        realEstateData.region?.value
      ].filter(Boolean);
      
      return parts.length > 0 ? parts.join(', ') : 'N/A';
    } else if (data) {
      return `*${data.real_estate_investment.property_location}`;
    }
    return '*N/A';
  };

  const getPropertyType = (): string => {
    if (realEstateData?.realEstateType?.value) {
      return realEstateData.realEstateType.value;
    }
    return '*Commercial Office';
  };

  const getPropertySize = (): string => {
    if (realEstateData?.size) {
      return `${realEstateData.size.toLocaleString()} sqm`;
    } else if (data) {
      return `*${data.real_estate_investment.property_size_sqm.toLocaleString()} sqm`;
    }
    return '*N/A';
  };

  const getPurchasePrice = (): string => {
    if (realEstateData?.investment?.initialInvestmentAmount) {
      return formatCurrencyValue(realEstateData.investment.initialInvestmentAmount, realEstateData.investment.currency);
    } else if (data) {
      return `*${formatCurrency(data.real_estate_investment.purchase_price, data.investment.currency_ref)}`;
    }
    return '*N/A';
  };

  const getCurrentMarketValue = (): string => {
    if (realEstateData?.investment?.marketValue) {
      return formatCurrencyValue(realEstateData.investment.marketValue, realEstateData.investment.currency);
    } else if (data) {
      return `*${formatCurrency(data.real_estate_investment.current_market_value, data.investment.currency_ref)}`;
    }
    return '*N/A';
  };

  const getAnnualRentalIncome = (): string => {
    // This field is not available in GraphQL schema yet
    if (data) {
      return `*${formatCurrency(data.real_estate_investment.rental_income_annual, data.investment.currency_ref)}`;
    }
    return '*N/A';
  };

  const getOccupancyRate = (): string => {
    if (realEstateData?.occupancyPercent !== null && realEstateData?.occupancyPercent !== undefined) {
      return `${realEstateData.occupancyPercent}%`;
    } else if (data) {
      return `*${data.real_estate_investment.occupancy_rate}%`;
    }
    return '*N/A';
  };

  const getRentalYield = (): string => {
    // This field is not available in GraphQL schema yet
    if (data) {
      return `*${data.real_estate_investment.rental_yield_percentage}%`;
    }
    return '*N/A';
  };

  const getLastValuationDate = (): string => {
    // This field is not available in GraphQL schema yet
    if (data) {
      return `*${formatDate(data.real_estate_investment.last_valuation_date)}`;
    }
    return '*N/A';
  };

  const getPropertyCondition = (): string => {
    // This field is not available in GraphQL schema yet
    return '*Excellent';
  };

  const getPropertyManagement = (): string => {
    // This field is not available in GraphQL schema yet
    if (data) {
      return `*${data.real_estate_investment.property_management_company}`;
    }
    return '*N/A';
  };

  const getBuildingYear = (): string => {
    if (realEstateData?.buildingYear) {
      return realEstateData.buildingYear;
    }
    return '*N/A';
  };

  const getNumberOfUnits = (): string => {
    if (realEstateData?.numberOfUnits) {
      return realEstateData.numberOfUnits.toString();
    }
    return '*N/A';
  };

  const getAnnualExpenses = (): string => {
    if (realEstateData?.annualExpenses) {
      return formatCurrencyValue(realEstateData.annualExpenses, realEstateData.investment.currency);
    }
    return '*N/A';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Home className="gba:h-5 gba:w-5" />
            Real Estate Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="gba:animate-pulse">
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-24 gba:mb-2"></div>
                <div className="gba:h-5 gba:bg-gray-200 gba:rounded gba:w-32"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Home className="gba:h-5 gba:w-5" />
          Real Estate Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Property Type</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getPropertyType()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Location</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {buildLocationString()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Property Size</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getPropertySize()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Purchase Price</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getPurchasePrice()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Current Market Value</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getCurrentMarketValue()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Annual Rental Income</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getAnnualRentalIncome()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Occupancy Rate</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getOccupancyRate()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Rental Yield</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getRentalYield()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Valuation Date</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getLastValuationDate()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Building Year</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getBuildingYear()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Number of Units</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getNumberOfUnits()}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Annual Expenses</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getAnnualExpenses()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealEstateDetails; 