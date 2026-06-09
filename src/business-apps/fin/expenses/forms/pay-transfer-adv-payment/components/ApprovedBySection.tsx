import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'

interface ApprovedBySectionProps {
  approver?: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: {
        name?: string
      }
      organizationalUnit?: {
        name?: string
      }
    }
  }
  prefixDataTestId?: string
}

const ApprovedBySection: React.FC<ApprovedBySectionProps> = ({
  approver,
  prefixDataTestId = 'pay-transfer-adv-payment-v2'
}) => {
  const { t } = useTranslation(translations)

  if (!approver) {
    return null
  }

  const displayName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || 'Unknown'

  return (
    <Card data-testid={`${prefixDataTestId}-approved-by-section`}>
      <CardHeader>
        <CardTitle data-testid={`${prefixDataTestId}-approved-by-title`}>{t('label-approved-by')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:items-center gba:gap-3" data-testid={`${prefixDataTestId}-approved-by-details`}>
          <Avatar className="gba:w-12 gba:h-12" data-testid={`${prefixDataTestId}-approver-avatar`}>
            {approver.pictureThumbnail ? (
              <AvatarImage src={`data:image/jpeg;base64,${approver.pictureThumbnail}`} alt={displayName} />
            ) : (
              <AvatarFallback>
                {approver.firstName?.[0]}
                {approver.lastName?.[0]}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <div
              className="gba:text-sm gba:font-semibold gba:text-foreground"
              data-testid={`${prefixDataTestId}-approver-name`}
            >
              {displayName}
            </div>
            {approver.employeePosition?.jobPosition?.name && (
              <div className="gba:text-xs gba:text-muted-foreground" data-testid={`${prefixDataTestId}-approver-role`}>
                {approver.employeePosition.jobPosition.name}
              </div>
            )}
            {approver.employeePosition?.organizationalUnit?.name && (
              <div className="gba:text-xs gba:text-muted-foreground" data-testid={`${prefixDataTestId}-approver-unit`}>
                {approver.employeePosition.organizationalUnit.name}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ApprovedBySection
