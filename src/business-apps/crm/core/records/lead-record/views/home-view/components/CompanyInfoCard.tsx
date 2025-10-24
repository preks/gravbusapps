import React from 'react'
import { Card, CardHeader, CardContent } from '@newwork/nw-design-system'
import { Building } from '@phosphor-icons/react'

interface CompanyInfoCardProps {
  companyName?: string
  industry?: string
  numberOfEmployees?: string
  annualRevenue?: string
  companyWebsite?: string
  addressLine?: string
  city?: string
  postalCode?: string
  state?: string
  country?: string
}

export const CompanyInfoCard: React.FC<CompanyInfoCardProps> = ({
  companyName,
  industry,
  numberOfEmployees,
  annualRevenue,
  companyWebsite,
  addressLine,
  city,
  postalCode,
  state,
  country
}) => {
  const hasData = companyName || industry || numberOfEmployees || annualRevenue || companyWebsite || addressLine

  return (
    <Card className="gba:h-full" data-testid="lead-company-info-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Building size={20} className="gba:text-muted-foreground" />
          <h3 className="gba:text-lg gba:font-semibold">Company Information</h3>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="gba:text-muted-foreground gba:text-sm">No company information available</div>
        ) : (
          <div className="gba:space-y-3">
            {companyName && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Company</span>
                <span className="gba:font-medium">{companyName}</span>
              </div>
            )}
            {industry && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Industry</span>
                <span>{industry}</span>
              </div>
            )}
            {numberOfEmployees && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Employees</span>
                <span>{numberOfEmployees}</span>
              </div>
            )}
            {annualRevenue && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Annual Revenue</span>
                <span>{annualRevenue}</span>
              </div>
            )}
            {companyWebsite && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Website</span>
                <a
                  href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gba:text-primary gba:hover:underline gba:break-all"
                >
                  {companyWebsite}
                </a>
              </div>
            )}
            {(addressLine || city || state || country) && (
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:text-xs gba:text-muted-foreground">Address</span>
                <div className="gba:text-sm">
                  {addressLine && <div>{addressLine}</div>}
                  {(city || postalCode || state) && (
                    <div>
                      {city && city}
                      {postalCode && `, ${postalCode}`}
                      {state && `, ${state}`}
                    </div>
                  )}
                  {country && <div>{country}</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
