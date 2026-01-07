import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, IconAvatar, Badge } from '@newwork/nw-design-system'
import { Trophy as TrophyIcon, User, Building, Briefcase, Calendar } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface RecentRecordItem {
  id: string
  type: string // 'opportunity' | 'lead' | 'contact' | ...
  name: string
  createdAt: string | number | Date
}

export interface RecordSummaryProps {
  records: RecentRecordItem[]
  moduleColor?: string
  source?: 'investments' | 'customer-relations'
}

export const RecordSummary: React.FC<RecordSummaryProps> = ({
  records,
  moduleColor = 'default',
  source = 'investments'
}) => {
  // Helper function to get entity icon and color
  const getEntityInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'opportunity':
        return {
          icon: Briefcase,
          color: '#16a34a', // Enhanced green for better contrast
          bgColor: 'var(--nw-color-success-100)',
          label: getTranslationFromI18nKeyAndLabel('dashboard.entity.opportunity', 'Opportunity')
        }
      case 'lead':
        return {
          icon: User,
          color: '#2563eb', // Enhanced blue for better contrast
          bgColor: 'var(--nw-color-primary-100)',
          label: getTranslationFromI18nKeyAndLabel('dashboard.entity.lead', 'Lead')
        }
      case 'contact':
        return {
          icon: User,
          color: '#ea580c', // Enhanced orange for better contrast
          bgColor: 'var(--nw-color-warning-100)',
          label: getTranslationFromI18nKeyAndLabel('dashboard.entity.contact', 'Contact')
        }
      case 'account':
        return {
          icon: Building,
          color: '#0284c7', // Enhanced cyan for better contrast
          bgColor: 'var(--nw-color-info-100)',
          label: getTranslationFromI18nKeyAndLabel('dashboard.entity.account', 'Account')
        }
      default:
        return {
          icon: Calendar,
          color: '#6b7280', // Enhanced gray for better contrast
          bgColor: 'var(--nw-color-surface-secondary)',
          label: type.charAt(0).toUpperCase() + type.slice(1)
        }
    }
  }

  // Navigation handler
  const handleRecordClick = useCallback(
    (record: RecentRecordItem) => {
      const { type, id } = record
      const isInvestmentSource = source === 'investments'

      let url: string
      switch (type.toLowerCase()) {
        case 'opportunity':
          url = buildPlatformUrl(
            isInvestmentSource ? '/platform/irm/opportunity-record' : '/platform/crm/opportunity-record',
            {
              opportunityId: id,
              source: source,
              fromView: 'dashboard'
            }
          )
          break
        case 'lead':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/lead-record' : '/platform/crm/lead-record', {
            leadId: id,
            source: source,
            fromView: 'dashboard'
          })
          break
        case 'contact':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/contact-record' : '/platform/crm/contact-record', {
            contactId: id,
            source: source,
            fromView: 'dashboard'
          })
          break
        case 'account':
          url = buildPlatformUrl(isInvestmentSource ? '/platform/irm/account-record' : '/platform/crm/account-record', {
            accountId: id,
            source: source,
            fromView: 'dashboard'
          })
          break
        default:
          console.warn(
            getTranslationFromI18nKeyAndLabel(
              'dashboard.navigation.unknownRecordType',
              'Unknown record type for navigation:'
            ),
            type
          )
          return
      }

      navigateTo(url)
    },
    [source]
  )

  return (
    <Card className="gba:h-full">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrophyIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>{getTranslationFromI18nKeyAndLabel('dashboard.recentRecords.title', 'Recent Records')}</CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel('dashboard.recentRecords.subtitle', 'Latest activity')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {records.slice(0, 4).map(record => {
            const entityInfo = getEntityInfo(record.type)
            const EntityIcon = entityInfo.icon

            return (
              <Card
                key={record.id}
                data-testid={`recent-record-item-${record.id}`}
                className="gba:transition-all gba:duration-200 gba:hover:shadow-md gba:hover:bg-accent gba:cursor-pointer gba:border-l-4 gba:relative"
                style={{ borderLeftColor: entityInfo.color }}
                onClick={() => handleRecordClick(record)}
              >
                {/* Badge positioned at very top right of card */}
                <Badge
                  variant="secondary"
                  className={`gba:absolute gba:-top-2 gba:right-2 gba:text-xs gba:font-medium gba:px-1.5 gba:py-0.5 gba:rounded-full gba:leading-none gba:z-10 gba:border-none`}
                  style={{
                    backgroundColor: entityInfo.color,
                    color: 'var(--nw-color-background)',
                    boxShadow: `0 1px 3px ${entityInfo.color}40`
                  }}
                >
                  {entityInfo.label.toUpperCase()}
                </Badge>
                <CardHeader className="gba:p-3">
                  <div className="gba:flex gba:items-start gba:gap-2.5">
                    <div
                      className="gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:mt-0.5"
                      style={{
                        backgroundColor: entityInfo.bgColor,
                        color: entityInfo.color
                      }}
                    >
                      <EntityIcon className="gba:w-4 gba:h-4" />
                    </div>
                    <div className="gba:flex-1 gba:min-w-0">
                      <CardTitle className="gba:text-sm gba:font-semibold gba:truncate gba:leading-tight gba:mb-1">
                        {record.name}
                      </CardTitle>
                      <CardDescription className="gba:text-xs gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground gba:leading-none">
                        <Calendar className="gba:w-3 gba:h-3" />
                        {new Date(record.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default RecordSummary
