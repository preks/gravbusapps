import React from 'react'
import { Card } from 'antd'
import { Lead } from '../types'

interface CompanyInformationProps {
  lead: Lead
  leadData: any
}

export const CompanyInformation: React.FC<CompanyInformationProps> = ({ leadData }) => {
  return (
    <Card title="Company Information" style={{ width: '100%', height: '100%' }}>
      <div>
        <div style={{ marginBottom: '24px' }}>
          {/* Company details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {/* Left Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Name
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{leadData?.companyName || '-'}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Legal Form
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {leadData?.legalForm?.value || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Country
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{leadData?.country?.value || '-'}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Industry
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {leadData?.industry?.value || '-'}
                </div>
              </div>

              <div>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Address
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{leadData?.addressLine || '-'}</div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Website
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {leadData?.companyWebsite ? (
                    <a
                      href={leadData.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:text-primary gba:no-underline"
                    >
                      {leadData.companyWebsite}
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  E-Mail
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {leadData?.companyEmail ? (
                    <a href={`mailto:${leadData.companyEmail}`} className="gba:text-primary gba:no-underline">
                      {leadData.companyEmail}
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Phone
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {leadData?.companyPhone ? (
                    <a href={`tel:${leadData.companyPhone}`} className="gba:text-primary gba:no-underline">
                      {leadData.companyPhone}
                    </a>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Employees
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {leadData?.numberOfEmployees?.value || '-'}
                </div>
              </div>

              <div>
                <div className="gba:text-sm gba:text-muted-foreground" style={{ marginBottom: '4px' }}>
                  Revenue
                </div>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">
                  {leadData?.annualRevenue?.value || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
