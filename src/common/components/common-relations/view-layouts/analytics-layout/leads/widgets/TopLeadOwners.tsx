import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import { TrophyIcon } from '@phosphor-icons/react'

export interface TopLeadOwnerItem {
  employeeId: string
  employeeName: string
  leadCount: number
  conversionRate: number
}

export interface TopLeadOwnersProps {
  owners: TopLeadOwnerItem[]
  moduleColor?: string
}

export const TopLeadOwners: React.FC<TopLeadOwnersProps> = ({ owners }) => {
  return (
    <Card data-testid="top-lead-owners-section">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <TrophyIcon size={16} />
          Top Lead Owners
        </CardTitle>
      </CardHeader>
      <CardContent>
        {owners && owners.length > 0 ? (
          <div className="gba:space-y-3">
            {owners.map((owner, index) => (
              <div
                key={owner.employeeId}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                data-testid={`top-lead-owner-${index}`}
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <div className="gba:font-medium">{owner.employeeName}</div>
                    <div className="gba:text-sm gba:text-gray-600">{owner.leadCount} leads owned</div>
                  </div>
                </div>
                <div className="gba:text-right">
                  <div className="gba:font-bold">{owner.conversionRate}%</div>
                  <div className="gba:text-sm gba:text-gray-600">Conversion Rate</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">No lead owner data available</div>
        )}
      </CardContent>
    </Card>
  )
}

export default TopLeadOwners
