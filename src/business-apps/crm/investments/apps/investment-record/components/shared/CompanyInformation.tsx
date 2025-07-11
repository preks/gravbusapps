import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Building2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface CompanyInformationProps {
  data?: {
    company_details: {
      name: string;
      address: {
        street: string;
        city: string;
        state: string;
        country: string;
        postal_code: string;
      };
      revenue: number;
      employees: number;
      industry: string;
      website: string;
      phone: string;
      email: string;
      founded_year: number;
      ceo: string;
      description: string;
    };
    investment: {
      currency_ref: string;
      account_name?: string; // Real GraphQL data
    };
  }; // Legacy mock data
  equityData?: {
    investment: {
      account?: {
        id: string;
        name: string;
      } | null;
      currency?: {
        code: string;
      } | null;
    };
  } | null; // Real GraphQL data
  isLoading?: boolean;
}

const CompanyInformation: React.FC<CompanyInformationProps> = ({ data, equityData, isLoading }) => {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Building2 className="gba:h-5 gba:w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-24 gba:mb-2"></div>
                <div className="gba:h-5 gba:bg-gray-200 gba:rounded gba:w-32"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const hasRealAccountData = equityData?.investment?.account?.name || data?.investment?.account_name;
  const companyName = hasRealAccountData 
    ? (equityData?.investment?.account?.name || data?.investment?.account_name || 'N/A')
    : (data ? `*${data.company_details.name}` : '*N/A');
  
  const companyDetails = data?.company_details;
  const investment = data?.investment;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <Building2 className="gba:h-5 gba:w-5" />
          Company Information
          {hasRealAccountData && (
            <span className="gba:ml-2 gba:px-2 gba:py-1 gba:bg-green-100 gba:text-green-800 gba:text-xs gba:rounded">
              Partial Real Data
            </span>
          )}
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
            {companyDetails ? (
              <a 
                href={companyDetails.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="gba:text-sm gba:font-semibold gba:text-blue-600 gba:hover:underline gba:break-all gba:overflow-hidden gba:block"
              >
                *{companyDetails.website}
              </a>
            ) : (
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
                *N/A
              </p>
            )}
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Legal Form</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *Ltd
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">E-Mail</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-all gba:overflow-hidden">
              {companyDetails ? `*${companyDetails.email}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Country</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyDetails ? `*${companyDetails.address.country}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Phone</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyDetails ? `*${companyDetails.phone}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Industry</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyDetails ? `*${companyDetails.industry}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Employees</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyDetails ? `*${companyDetails.employees}` : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Address</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyDetails ? (
                <>
                  *{companyDetails.address.street}<br />
                  {companyDetails.address.city}, {companyDetails.address.state}<br />
                  {companyDetails.address.postal_code}, {companyDetails.address.country}
                </>
              ) : '*N/A'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Revenue</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {companyDetails && investment ? `*${formatCurrency(companyDetails.revenue, investment.currency_ref)}` : '*N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyInformation; 