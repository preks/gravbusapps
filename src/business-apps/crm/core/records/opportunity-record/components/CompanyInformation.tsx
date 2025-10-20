import React from 'react'
import { Card } from 'antd'
import { Opportunity } from '../types'
import { formatCurrency } from '@/business-apps/crm/common/utils/currencyUtils'

interface CompanyInformationProps {
  opportunity: Opportunity
  opportunityData: any
}

export const CompanyInformation: React.FC<CompanyInformationProps> = ({ opportunity, opportunityData }) => {
  const account = opportunity.account || opportunityData?.account

  return (
    <Card title="Company Information" style={{ width: '100%', height: '100%' }} data-testid="company-information-card">
      <div>
        <div style={{ marginBottom: '24px' }}>
          {/* Company details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {/* Left Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Company Name</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{account?.name || '-'}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Industry</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {account?.industry?.value || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Address</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {account?.addressLine || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Foundation Date</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {account?.foundationDate ? new Date(account.foundationDate).toLocaleDateString() : '-'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Employees</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {account?.numberOfEmployees?.value || '-'}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Website</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {account?.website ? (
                    <a
                      href={account.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      {account.website}
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Annual Revenue</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {account?.annualRevenue?.value || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Account Owner</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {account?.ownerEmployee
                    ? `${account.ownerEmployee.firstName} ${account.ownerEmployee.lastName}`
                    : '-'}
                </div>
              </div>

              {opportunity.value > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Opportunity Value</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                    {formatCurrency(opportunity.value, opportunity.currency?.id || 'Currency:v1:EUR')}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{opportunity.status || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
