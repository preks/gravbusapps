import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { User } from 'lucide-react';

interface ContactDetailsProps {
  data?: any; // For now, we'll use any since this component handles contact info differently
  isLoading?: boolean;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <User className="gba:h-5 gba:w-5" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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

  // Determine contact information based on investment type
  const isEquityInvestment = data?.investment?.investment_type_ref?.includes('STOCKS') || 
                            data?.equity_investment;
  const isLiquidFundInvestment = data?.investment?.investment_type_ref?.includes('MONEY_MARKET') || 
                                data?.liquid_fund_investment;
  
  // Default contact information based on investment type
  let contactName, contactLastName, contactEmail, contactPhone;
  
  if (isLiquidFundInvestment) {
    contactName = "*Michael";
    contactLastName = "*Weber";
    contactEmail = "*michael.weber@global-asset-management.de";
    contactPhone = "*+49 69 1234 5678";
  } else if (isEquityInvestment) {
    contactName = "*Sarah";
    contactLastName = "*Johnson";
    contactEmail = "*sarah.johnson@techcorp-solutions.com";
    contactPhone = "*+1 415 555 0124";
  } else {
    // Default for real estate and other investments
    contactName = "*Klaus";
    contactLastName = "*Mueller";
    contactEmail = "*klaus.mueller@berlin-property-mgmt.de";
    contactPhone = "*+49 30 2025 4801";
  }
  
  const contactPosition = "*Chief Executive Officer";
  const createdAt = "*Jul 7, 2025, 10:23 PM";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <User className="gba:h-5 gba:w-5" />
          Contact
          <span className="gba:ml-2 gba:px-2 gba:py-1 gba:bg-orange-100 gba:text-orange-800 gba:text-xs gba:rounded">
            Mock Data
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">First Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {contactName}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {contactLastName}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Email</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-blue-600 gba:break-all gba:overflow-hidden">
              {contactEmail}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Phone Number</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {contactPhone}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Position</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {contactPosition}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Created At</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              {createdAt}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactDetails; 