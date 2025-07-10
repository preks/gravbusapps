import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Building2 } from 'lucide-react';
import { Spin } from 'antd';
import { PrivateEquityInvestmentRecord } from '../types';
import { PrivateEquityInvestmentData } from '../hooks/usePrivateEquityRecordData';
import { formatCurrency } from '../utils/formatters';

interface CompanyInformationProps {
  data?: PrivateEquityInvestmentRecord;
  privateEquityData?: PrivateEquityInvestmentData;
  isLoading?: boolean;
}

const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

const CompanyInformation: React.FC<CompanyInformationProps> = ({ data, privateEquityData, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Building2 className="gba:h-5 gba:w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:py-8">
          <div className="gba:flex gba:justify-center gba:items-center">
            <Spin size="large" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const realInvestmentData = privateEquityData?.investment;
  const mockData = data;
  const currencyCode = realInvestmentData?.currency ? extractCurrencyCode(realInvestmentData.currency.code) : 'EUR';
  const companyName = realInvestmentData?.account?.name || mockData?.company_details?.name || '*N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Building2 className="gba:h-5 gba:w-5" />
          Company Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyName}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Website</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-all gba:overflow-hidden">
              {realInvestmentData 
                ? '*N/A' 
                : mockData?.company_details?.website}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Legal Form</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData ? '*Ltd' : 'Ltd'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">E-Mail</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-all gba:overflow-hidden">
              {realInvestmentData 
                ? '*N/A' 
                : mockData?.company_details?.email}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Country</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? '*N/A' 
                : mockData?.company_details?.address?.country}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Phone</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? '*N/A' 
                : mockData?.company_details?.phone}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Industry</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? '*N/A' 
                : mockData?.company_details?.industry}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Employees</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? '*N/A' 
                : mockData?.company_details?.employees}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Address</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? '*N/A' 
                : (mockData?.company_details?.address && (
                  <>
                    {mockData.company_details.address.street}<br />
                    {mockData.company_details.address.city}, {mockData.company_details.address.state}<br />
                    {mockData.company_details.address.postal_code}, {mockData.company_details.address.country}
                  </>
                ))}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Revenue</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {realInvestmentData 
                ? `*${new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(0)}` 
                : (mockData ? formatCurrency(mockData.company_details.revenue, mockData.investment.currency_ref) : '€0')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyInformation; 