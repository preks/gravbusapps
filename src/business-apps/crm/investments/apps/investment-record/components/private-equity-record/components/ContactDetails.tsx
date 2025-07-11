import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { User } from 'lucide-react';
import { PrivateEquityInvestmentRecord } from '../types';

interface ContactDetailsProps {
  data: PrivateEquityInvestmentRecord;
  isLoading?: boolean;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ data, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <User className="gba:h-5 gba:w-5" />
          Contact
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">First Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *James
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Last Name</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *Richardson
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Email</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-blue-600 gba:break-all gba:overflow-hidden">
              *james.richardson@capitalpartners-europe.com
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Phone Number</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *{data.company_details.phone}
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Position</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *Chief Executive Officer
            </p>
          </div>
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Created At</h4>
            <p className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:break-words gba:overflow-hidden">
              *Jul 7, 2025, 10:23 PM
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactDetails; 