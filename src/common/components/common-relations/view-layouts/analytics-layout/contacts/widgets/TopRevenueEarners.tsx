import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import { TrophyOutlined } from '@ant-design/icons'

export interface TopRevenueContact {
  id: string
  firstName: string
  lastName: string
  email: string
  accountName: string
  totalRevenue: number
  wonOpportunities: number
}

interface TopRevenueEarnersProps {
  contacts: TopRevenueContact[]
  isLoading?: boolean
}

export const TopRevenueEarners: React.FC<TopRevenueEarnersProps> = ({ contacts, isLoading }) => {
  return (
    <Card data-testid="top-revenue-earners-section">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <TrophyOutlined />
          Top Revenue Earners
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">Loading revenue data...</div>
        ) : contacts.length > 0 ? (
          <div className="gba:space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={contact.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                data-testid={`top-revenue-contact-${index}`}
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <div className="gba:font-medium">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="gba:text-sm gba:text-muted-foreground">
                      {contact.accountName} • {contact.wonOpportunities} won opportunities
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground">{contact.email}</div>
                  </div>
                </div>
                <div className="gba:text-right">
                  <div className="gba:font-bold">${contact.totalRevenue.toLocaleString()}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">Revenue</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">No contacts with revenue available</div>
        )}
      </CardContent>
    </Card>
  )
}

export default TopRevenueEarners
