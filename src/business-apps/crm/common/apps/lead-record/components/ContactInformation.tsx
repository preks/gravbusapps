import React from 'react';
import { Card } from 'antd';
import dayjs from 'dayjs';

interface ContactInformationProps {
  leadData: any;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ leadData }) => {
  return (
    <Card
      title="Contact"
      style={{ width: '100%', height: '100%' }}
    >
      <div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{leadData?.firstName || '-'}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{leadData?.lastName || '-'}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {leadData?.email ? (
              <a 
                href={`mailto:${leadData.email}`}
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                {leadData.email}
              </a>
            ) : '-'}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {leadData?.phoneNumber ? (
              <a 
                href={`tel:${leadData.phoneNumber}`}
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                {leadData.phoneNumber}
              </a>
            ) : '-'}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Position</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{leadData?.position || '-'}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {leadData?.createdAt ? dayjs(leadData.createdAt).format('MMM D, YYYY, h:mm A') : '-'}
          </div>
        </div>
      </div>
    </Card>
  );
}; 