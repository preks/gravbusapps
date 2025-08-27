import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert } from 'antd';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface ContactInformationProps {
  leadData?: any;
  leadId?: string;
  context?: BusinessAppContextProps;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({
  leadData,
  leadId,
  context
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set loading to false since we're not fetching additional data
    setLoading(false);
  }, []);

  const getContactField = (field: string): string => {
    if (!leadData) {
      return '-';
    }

    switch (field) {
      case 'email':
        return leadData?.email || '-';
      case 'phone':
      case 'phoneNumber':
        return leadData?.phoneNumber || leadData?.companyPhone || '-';
      case 'firstName':
        return leadData?.firstName || '-';
      case 'lastName':
        return leadData?.lastName || '-';
      case 'position':
      case 'jobTitle':
        return leadData?.position || '-';
      case 'companyName':
        return leadData?.companyName || '-';
      case 'companyEmail':
        return leadData?.companyEmail || '-';
      case 'companyPhone':
        return leadData?.companyPhone || '-';
      case 'companyWebsite':
        return leadData?.companyWebsite || '-';
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <Card title="Contact Information" className="gba:mb-4">
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Contact Information" className="gba:mb-4">
        <Alert
          message="Error Loading Contact Information"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card title="Contact Information" className="gba:mb-4">
      <div className="gba:grid gba:grid-cols-1 gba:gap-4">
        {/* Personal Contact Information */}
        <div className="gba:space-y-3">
          <h4 className="gba:text-lg gba:font-medium gba:text-gray-900">Personal Information</h4>
          
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">First Name</label>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-900">{getContactField('firstName')}</p>
            </div>
            
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">Last Name</label>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-900">{getContactField('lastName')}</p>
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">Email</label>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-900">{getContactField('email')}</p>
            </div>
            
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">Phone</label>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-900">{getContactField('phone')}</p>
            </div>
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">Position</label>
            <p className="gba:mt-1 gba:text-sm gba:text-gray-900">{getContactField('position')}</p>
          </div>
        </div>


      </div>
    </Card>
  );
}; 