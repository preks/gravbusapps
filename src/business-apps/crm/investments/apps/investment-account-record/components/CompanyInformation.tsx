import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert } from '@newwork/nw-design-system'
import { Account } from '../hooks/useAccountData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentAccount } from '@/common/data/investment/types'

interface CompanyInformationProps {
  account?: Account
  accountData?: InvestmentAccount | null
  accountId?: string
  context?: BusinessAppContextProps
}

export const CompanyInformation: React.FC<CompanyInformationProps> = ({
  account,
  accountData: providedAccountData,
  accountId,
  context
}) => {
  // Use provided data directly since we're using centralized investment data
  const accountData = providedAccountData

  return (
    <Card className="gba:w-full gba:h-full">
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: '24px' }}>
          {/* Company details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {/* Left Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Name</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.name || account?.name || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Legal Form</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.legalFormLabel || account?.legalForm || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Industry</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.industryClassLabel || account?.industry || '-'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Geographic Presence</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.geographicPresence || '-'}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Website</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {(() => {
                    const website = accountData?.website || account?.website
                    if (!website) return '-'

                    const fullUrl = website.includes('://') ? website : `https://${website}`
                    return (
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                      >
                        {website}
                      </a>
                    )
                  })()}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {(() => {
                    const email = accountData?.email || account?.email
                    if (!email) return '-'

                    return (
                      <a
                        href={`mailto:${email}`}
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                        data-testid="investment-account-email-link"
                      >
                        {email}
                      </a>
                    )
                  })()}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Company Size</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.companySizeLabel || account?.size || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Annual Revenue Band</div>
                <div
                  style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}
                  data-testid="investment-account-revenue-value"
                >
                  {accountData?.accountAnnualRevenueBandLabel || account?.revenue || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Foundation Date</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.foundationDate || account?.founded || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
