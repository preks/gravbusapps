import React from 'react'
import { Card } from 'antd'
import { Opportunity } from '../types'
import { formatCurrency } from '@/common/utils/numberFormatter'

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
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Company Name
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{account?.name || '-'}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Industry
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{account?.industry?.value || '-'}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Address
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{account?.addressLine || '-'}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Foundation Date
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {account?.foundationDate ? new Date(account.foundationDate).toLocaleDateString() : '-'}
                </div>
              </div>

              <div>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Employees
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {account?.numberOfEmployees?.value || '-'}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Website
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {account?.website ? (
                    <a
                      href={account.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:text-primary gba:no-underline"
                    >
                      {account.website}
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Annual Revenue
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {account?.annualRevenue?.value || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Account Owner
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {account?.ownerEmployee
                    ? `${account.ownerEmployee.firstName} ${account.ownerEmployee.lastName}`
                    : '-'}
                </div>
              </div>

              {opportunity.value > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                    Opportunity Value
                  </div>
                  <div className="gba:text-sm gba:font-medium gba:text-foreground">
                    {formatCurrency(opportunity.value, opportunity.currency?.id || 'Currency:v1:EUR')}
                  </div>
                </div>
              )}

              <div>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Status
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{opportunity.status || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
