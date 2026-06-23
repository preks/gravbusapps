import React, { useCallback } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { BuildingsIcon, HandshakeIcon, UserIcon } from '@phosphor-icons/react'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'
import type { InvestmentCompanyStakeholder } from '@/common/data/investment/types/investmentCompanyAssociationTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import translations from '../../_i18n'

interface StakeholderDetailsSectionProps {
  investmentCompany: InvestmentCompany
}

const EMPTY_VALUE = '-'

const getStakeholderName = (stakeholder: InvestmentCompanyStakeholder): string =>
  stakeholder.investmentContact?.fullName ||
  stakeholder.investmentAccount?.name ||
  stakeholder.name ||
  stakeholder.investmentContactId ||
  stakeholder.investmentAccountId ||
  EMPTY_VALUE

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'NA'

const getAvatarSource = (picture?: unknown, pictureThumbnail?: string | null): string | undefined => {
  const value = pictureThumbnail || (typeof picture === 'string' ? picture : undefined)
  if (!value) return undefined
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) return value
  return `data:image/jpeg;base64,${value}`
}

const getStakeholderEntityType = (stakeholder: InvestmentCompanyStakeholder): 'contact' | 'account' | 'external' => {
  if (stakeholder.investmentContact || stakeholder.investmentContactId) return 'contact'
  if (stakeholder.investmentAccount || stakeholder.investmentAccountId) return 'account'
  return 'external'
}

const getFallbackTypeLabel = (stakeholderTypeRef?: string): string => {
  if (!stakeholderTypeRef) return EMPTY_VALUE
  const code = stakeholderTypeRef.split(':').pop() || stakeholderTypeRef
  return code
    .toLowerCase()
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const getStakeholderTypeLabel = (stakeholder: InvestmentCompanyStakeholder): string => {
  const stakeholderTypeLabel =
    stakeholder.investmentCompanyStakeholderType?.value || stakeholder.investmentCompanyStakeholderType?.code
  if (stakeholderTypeLabel) return stakeholderTypeLabel

  const stakeholderTypeRef = stakeholder.investmentCompanyStakeholderTypeRef
  if (!stakeholderTypeRef) return EMPTY_VALUE
  return getFallbackTypeLabel(stakeholderTypeRef)
}

const getStakeholderRecordTarget = (
  stakeholder: InvestmentCompanyStakeholder
): { url: string; testId: string } | null => {
  const investmentContactId = stakeholder.investmentContact?.id || stakeholder.investmentContactId
  if (investmentContactId) {
    return {
      url: buildPlatformUrl('/platform/irm/contact-record', {
        contactId: investmentContactId
      }),
      testId: 'investment-company-stakeholder-contact-link'
    }
  }

  const investmentAccountId = stakeholder.investmentAccount?.id || stakeholder.investmentAccountId
  if (investmentAccountId) {
    return {
      url: buildPlatformUrl('/platform/irm/account-record', {
        accountId: investmentAccountId
      }),
      testId: 'investment-company-stakeholder-account-link'
    }
  }

  return null
}

const StakeholderAvatar: React.FC<{ stakeholder: InvestmentCompanyStakeholder; name: string }> = ({
  stakeholder,
  name
}) => {
  const entityType = getStakeholderEntityType(stakeholder)
  const avatarSrc =
    getAvatarSource(stakeholder.investmentContact?.picture, stakeholder.investmentContact?.pictureThumbnail) ||
    getAvatarSource(stakeholder.investmentAccount?.picture, stakeholder.investmentAccount?.pictureThumbnail)

  return (
    <Avatar className="gba:h-10 gba:w-10 gba:shrink-0">
      {avatarSrc && <AvatarImage src={avatarSrc} alt={name} />}
      <AvatarFallback className="gba:text-xs">
        {entityType === 'external' ? (
          <HandshakeIcon className="gba:h-4 gba:w-4" />
        ) : entityType === 'account' ? (
          <BuildingsIcon className="gba:h-4 gba:w-4" />
        ) : (
          getInitials(name) || <UserIcon className="gba:h-4 gba:w-4" />
        )}
      </AvatarFallback>
    </Avatar>
  )
}

export const StakeholderDetailsSection: React.FC<StakeholderDetailsSectionProps> = ({ investmentCompany }) => {
  const { t } = useTranslation(translations)
  const stakeholders = investmentCompany.stakeholders || []

  const handleOpenRecord = useCallback((url: string) => {
    navigateTo(url)
  }, [])

  return (
    <Card className="gba:col-span-4" data-testid="investment-company-stakeholders-card">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <HandshakeIcon className="gba:h-5 gba:w-5" />
          {t('stakeholders-title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stakeholders.length > 0 ? (
          <div className="gba:space-y-3">
            {stakeholders.map(stakeholder => {
              const recordTarget = getStakeholderRecordTarget(stakeholder)
              const stakeholderName = getStakeholderName(stakeholder)
              const entityType = getStakeholderEntityType(stakeholder)

              return (
                <div
                  key={stakeholder.id}
                  className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3"
                  data-testid={`investment-company-stakeholder-${stakeholder.id}`}
                >
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-3">
                      <StakeholderAvatar stakeholder={stakeholder} name={stakeholderName} />
                      <div className="gba:min-w-0">
                        {recordTarget ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRecord(recordTarget.url)}
                            className="gba:block gba:max-w-full gba:truncate gba:text-left gba:text-sm gba:font-medium gba:text-primary gba:hover:underline"
                            data-testid={`${recordTarget.testId}-${stakeholder.id}`}
                          >
                            {stakeholderName}
                          </button>
                        ) : (
                          <p
                            className="gba:truncate gba:text-sm gba:font-medium"
                            data-testid={`investment-company-stakeholder-name-${stakeholder.id}`}
                          >
                            {stakeholderName}
                          </p>
                        )}
                        <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                          {t(`stakeholder-entity-${entityType}`)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" data-testid={`investment-company-stakeholder-type-${stakeholder.id}`}>
                      {getStakeholderTypeLabel(stakeholder)}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/30 gba:p-4"
            data-testid="investment-company-stakeholders-empty"
          >
            <p className="gba:text-sm gba:font-medium">{t('no-stakeholders-title')}</p>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('no-stakeholders-description')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
