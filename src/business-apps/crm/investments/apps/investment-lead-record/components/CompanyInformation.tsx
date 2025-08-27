import React from 'react';
import { Card } from 'antd';
import { Lead } from '../types';

interface CompanyInformationProps {
  lead: Lead;
  leadData: any;
}

export const CompanyInformation: React.FC<CompanyInformationProps> = ({ lead, leadData }) => {
  return (
    <Card
      title="Company Information"
      style={{ width: '100%', height: '100%' }}
    >
      <div>
        <div style={{ marginBottom: '24px' }}>
          {/* Company details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {/* Left Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Name</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {leadData?.companyName || '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Legal Form</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {lead.legalForm?.value || '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Country</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {lead.country?.value || '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Industry</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {lead.industryClass?.value || '-'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Address</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {lead.addressLine || '-'}
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Website</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {lead.companyWebsite ? (
                    <a 
                      href={lead.companyWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      {lead.companyWebsite}
                    </a>
                  ) : '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>E-Mail</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {lead.companyEmail ? (
                    <a 
                      href={`mailto:${lead.companyEmail}`}
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      {lead.companyEmail}
                    </a>
                  ) : '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Phone</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {lead.companyPhone ? (
                    <a 
                      href={`tel:${lead.companyPhone}`}
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      {lead.companyPhone}
                    </a>
                  ) : '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Employees</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {leadData?.numberOfEmployees?.value || '-'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Revenue</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {leadData?.annualRevenue?.value || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}; 