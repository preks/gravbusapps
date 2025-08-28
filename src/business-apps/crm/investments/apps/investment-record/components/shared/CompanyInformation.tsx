import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system';
import { Building2, ExternalLink } from 'lucide-react';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';

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
  investmentData?: {
    investment: {
      investmentAccount?: {
        id: string;
        name: string;
        email?: string | null;
        website?: string | null;
        industryClass?: { value?: string | null } | null;
        foundationDate?: string | null;
        geographicPresence?: string | null;
        companySize?: { value?: string | null } | null;
        accountAnnualRevenueBand?: { value?: string | null } | null;
      } | null;
      currency?: {
        code: string;
      } | null;
    };
  } | null; // Real GraphQL data
  isLoading?: boolean;
}

const CompanyInformation: React.FC<CompanyInformationProps> = ({ data, investmentData, isLoading }) => {
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
  const hasRealAccountData = investmentData?.investment?.investmentAccount?.name || data?.investment?.account_name;
  const companyName = hasRealAccountData 
    ? (investmentData?.investment?.investmentAccount?.name || data?.investment?.account_name || 'N/A')
    : (data ? `*${data.company_details.name}` : '*N/A');
  
  // Legacy mock structures no longer used

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Building2 className="gba:h-5 gba:w-5" />
            Company Information
          </CardTitle>
          {investmentData?.investment?.investmentAccount?.id && (
            <Button
              variant="ghost"
              size="sm"
              className="gba:flex gba:items-center gba:gap-1"
              onClick={() => {
                const url = buildPlatformUrl('/platform/irm/account-record', {
                  accountId: investmentData.investment.investmentAccount!.id,
                });
                navigateTo(url);
              }}
              data-testid="company-info-account-link"
              aria-label="Open account record"
            >
              <ExternalLink className="gba:h-4 gba:w-4" />
              Open Account
            </Button>
          )}
        </div>
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
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentData?.investment?.investmentAccount?.website || '-'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Legal Form</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">N/A</p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">E-Mail</h4>
            {investmentData?.investment?.investmentAccount?.email ? (
              <a
                href={`mailto:${investmentData.investment.investmentAccount.email}`}
                className="gba:text-sm gba:font-semibold gba:text-blue-600 gba:break-all gba:overflow-hidden hover:gba:underline"
              >
                {investmentData.investment.investmentAccount.email}
              </a>
            ) : (
              <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-all gba:overflow-hidden">-</p>
            )}
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Country</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">N/A</p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Phone</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">N/A</p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Industry</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentData?.investment?.investmentAccount?.industryClass?.value || '-'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Company Size</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentData?.investment?.investmentAccount?.companySize?.value || '-'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Revenue Band</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentData?.investment?.investmentAccount?.accountAnnualRevenueBand?.value || '-'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Geographic Presence</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentData?.investment?.investmentAccount?.geographicPresence || '-'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Founded</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {investmentData?.investment?.investmentAccount?.foundationDate ? new Date(investmentData.investment.investmentAccount.foundationDate).toLocaleDateString('de-DE') : '-'}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Employees</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">N/A</p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Address</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">N/A</p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Revenue</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">N/A</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyInformation; 