/**
 * Company Organizational Unit Card Component
 * Displays an organizational unit card for company organizational units
 */
import React from 'react'
import { Buildings } from '@phosphor-icons/react'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'

export interface CompanyOrganizationalUnitCardProps {
  unit: CompanyOrganizationalUnit
  isSelected?: boolean
}

export const CompanyOrganizationalUnitCard: React.FC<CompanyOrganizationalUnitCardProps> = ({
  unit,
  isSelected = false
}) => {
  return (
    <div
      className={`gba:relative gba:group gba:bg-card gba:rounded-lg gba:shadow-lg gba:border gba:h-auto gba:w-full gba:transition gba:overflow-hidden ${
        isSelected ? 'gba:border-info gba:border-2 gba:shadow-xl' : 'gba:border-border'
      }`}
      data-testid={`company-organizational-unit-card-${unit.id}`}
    >
      <div className="gba:flex gba:flex-col gba:p-4">
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:p-2 gba:rounded-lg gba:bg-muted gba:shrink-0">
            <Buildings className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
          </div>
          <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
            <div
              className="gba:font-semibold gba:truncate gba:w-full"
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                lineHeight: 1.2,
                maxWidth: '100%',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={unit.name}
            >
              {unit.name}
            </div>

            {unit.code && (
              <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs gba:text-muted-foreground">
                <span className="gba:truncate" title={unit.code}>
                  {unit.code}
                </span>
              </div>
            )}

            {unit.description && (
              <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground gba:line-clamp-2" title={unit.description}>
                {unit.description}
              </div>
            )}

            {(unit.type || unit.tag) && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
                {unit.type && (
                  <span className="gba:text-xs gba:px-2 gba:py-1 gba:rounded gba:bg-muted gba:text-muted-foreground">
                    {unit.type}
                  </span>
                )}
                {unit.tag && (
                  <span className="gba:text-xs gba:px-2 gba:py-1 gba:rounded gba:bg-muted gba:text-muted-foreground">
                    {unit.tag}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
