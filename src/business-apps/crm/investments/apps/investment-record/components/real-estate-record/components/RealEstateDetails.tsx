import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Home } from 'lucide-react';
import type { RealEstateInvestmentData } from '../types';

interface RealEstateDetailsProps {
  realEstateData?: RealEstateInvestmentData | null;
  isLoading?: boolean;
}

const RealEstateDetails: React.FC<RealEstateDetailsProps> = ({ realEstateData, isLoading }) => {
  const inv = realEstateData?.investment;
  const rei = realEstateData?.realEstateInvestment as unknown as Record<string, any> | undefined;

  const formatCurrencyValue = (amount: number | null | undefined, currency?: { code: string } | null): string => {
    if (amount === null) return '-';
    if (amount === undefined) return 'N/A';
    const currencyCode = currency?.code || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // no-op placeholder removed to avoid unused warnings

  const displayFromObj = (obj: any, key: string, formatter?: (v: any) => string): string => {
    if (!obj || !(key in obj)) return 'N/A';
    const val = obj[key];
    if (val === null || val === undefined || val === '') return '-';
    return formatter ? formatter(val) : String(val);
  };

  const buildLocationString = (): string => {
    if (!rei) return 'N/A';
    const hasAddress = 'addressLine' in rei;
    const hasLocality = 'locality' in rei;
    const hasCountry = 'country' in rei;
    if (!hasAddress && !hasLocality && !hasCountry) return 'N/A';
    const address = hasAddress ? rei.addressLine : null;
    const addressStr = address ? (typeof address === 'string' ? address : '') : null;
    const locality = hasLocality ? rei.locality : null;
    const countryVal = hasCountry ? rei.country?.value : null;
    const parts = [addressStr, locality, countryVal].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const getPropertyType = (): string => {
    if (rei && 'realEstateType' in rei) {
      const v = rei.realEstateType?.value;
      return v ?? '-';
    }
    return 'N/A';
  };

  const getPropertySize = (): string => {
    if (!rei) return 'N/A';
    if (!('size' in rei)) return 'N/A';
    const size = rei.size;
    if (size === null || size === undefined) return '-';
    return `${Number(size).toLocaleString()} sqm`;
  };

  const getPurchasePrice = (): string => {
    if (!inv) return 'N/A';
    if (!('initialInvestmentAmount' in inv)) return 'N/A';
    return formatCurrencyValue(inv.initialInvestmentAmount, inv.currency || undefined);
  };

  const getCurrentMarketValue = (): string => {
    if (!inv) return 'N/A';
    if (!('investmentMarketValue' in inv)) return 'N/A';
    return formatCurrencyValue(inv.investmentMarketValue, inv.currency || undefined);
  };

  const getAnnualRentalIncome = (): string => {
    // Map to annualNetColdRent
    if (!rei) return 'N/A';
    if (!('annualNetColdRent' in rei)) return 'N/A';
    return formatCurrencyValue(rei.annualNetColdRent, inv?.currency || undefined);
  };

  const getOccupancyRate = (): string => {
    if (!rei) return 'N/A';
    if (!('occupancyPercent' in rei)) return 'N/A';
    const v = rei.occupancyPercent;
    if (v === null || v === undefined) return '-';
    return `${v}%`;
  };

  const getRentalYield = (): string => 'N/A';
  const getLastValuationDate = (): string => 'N/A';

  const getBuildingYear = (): string => displayFromObj(rei, 'buildingYear');

  const getNumberOfUnits = (): string => displayFromObj(rei, 'numberOfUnits');

  const getAnnualExpenses = (): string => {
    if (!rei) return 'N/A';
    if (!('actualAnnualExpenses' in rei)) return 'N/A';
    return formatCurrencyValue(rei.actualAnnualExpenses, inv?.currency || undefined);
  };

  const getFunding = (): string => {
    if (!rei) return 'N/A';
    if (!('funding' in rei)) return 'N/A';
    return formatCurrencyValue(rei.funding, inv?.currency || undefined);
  };

  const getCountry = (): string => {
    if (!rei) return 'N/A';
    if (!('country' in rei)) return 'N/A';
    const v = rei.country?.value;
    return v === null || v === undefined || v === '' ? '-' : String(v);
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
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Country</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getCountry()}
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
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Stake Percentage</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {inv && 'stakePercentage' in (inv as any)
                ? ((inv as any).stakePercentage ?? '-')
                : 'N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Funding</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {getFunding()}
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