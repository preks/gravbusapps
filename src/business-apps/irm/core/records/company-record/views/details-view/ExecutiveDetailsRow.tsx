import React, { useCallback, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import { useInvestmentContact } from '@/common/data/investment/hooks/useInvestmentContact'
import { useEmployeeById } from '@/common/data/employee/hooks/useEmployeeById'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { DetailsViewProps } from '../../types'

const EMPTY_VALUE = '-'

type ExecutiveRow = NonNullable<DetailsViewProps['investmentCompany']['executives']>[number]

const getAvatarSource = (picture?: string | null, pictureThumbnail?: string | null): string | undefined => {
  const value = pictureThumbnail || picture
  if (!value) return undefined
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) return value
  return `data:image/jpeg;base64,${value}`
}

const getInitials = (name: string): string => {
  const words = name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .filter(Boolean)
  const initials = (words[0] || '') + (words[1] || '')
  return initials || 'NA'
}

const formatCatalogValue = (value?: { value?: string; code?: string } | null): string => {
  return value?.value || value?.code || EMPTY_VALUE
}

const formatName = (executive: ExecutiveRow, fallbackContactName?: string): string => {
  if (executive.employee) {
    return (
      executive.employee.displayName ||
      executive.employee.fullName ||
      `${executive.employee.firstName || ''} ${executive.employee.lastName || ''}`.trim() ||
      EMPTY_VALUE
    )
  }
  if (executive.investmentContact) {
    return (
      executive.investmentContact.fullName ||
      `${executive.investmentContact.firstName || ''} ${executive.investmentContact.lastName || ''}`.trim() ||
      EMPTY_VALUE
    )
  }
  return fallbackContactName || EMPTY_VALUE
}

const getExecutiveRecordTarget = (executive: ExecutiveRow): { url: string; testId: string } | null => {
  const employeeId = executive.employee?.id || executive.employeeId
  if (employeeId) {
    return {
      url: buildPlatformUrl('/platform/employee-record', { employeeId }),
      testId: 'investment-company-executive-employee-link'
    }
  }

  const contactId = executive.investmentContact?.id || executive.investmentContactId
  if (contactId) {
    return {
      url: buildPlatformUrl('/platform/irm/contact-record', { contactId }),
      testId: 'investment-company-executive-contact-link'
    }
  }

  return null
}

interface ExecutiveDetailsRowProps {
  executive: ExecutiveRow
  accessToken?: string
  t: (key: string) => string
}

export const ExecutiveDetailsRow: React.FC<ExecutiveDetailsRowProps> = ({ executive, accessToken, t }) => {
  const { contact } = useInvestmentContact(accessToken || '', executive.investmentContactId)
  const { employee: employeePositionData } = useEmployeeById({
    accessToken: accessToken || '',
    employeeId: executive.employeeId
  })

  const handleOpenRecord = useCallback((url: string) => {
    navigateTo(url)
  }, [])

  const displayData = useMemo(() => {
    const resolvedName = formatName(
      executive,
      contact?.fullName || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() || undefined
    )

    const avatarSrc =
      getAvatarSource(executive.employee?.picture, executive.employee?.pictureThumbnail) ||
      getAvatarSource(employeePositionData?.employee?.picture, employeePositionData?.employee?.pictureThumbnail) ||
      getAvatarSource(executive.investmentContact?.picture, executive.investmentContact?.pictureThumbnail) ||
      getAvatarSource(contact?.picture, contact?.pictureThumbnail)

    const jobTitle =
      executive.employee?.employeePosition?.jobPosition?.name ||
      employeePositionData?.jobPosition?.name ||
      executive.investmentContact?.jobPosition ||
      contact?.jobPosition ||
      EMPTY_VALUE

    const department =
      executive.employee?.employeePosition?.organizationalUnit?.name ||
      employeePositionData?.organizationalUnit?.name ||
      executive.investmentContact?.department ||
      contact?.department ||
      executive.investmentContact?.ownerEmployee?.displayName ||
      contact?.ownerEmployee?.displayName ||
      EMPTY_VALUE

    return { resolvedName, avatarSrc, jobTitle, department }
  }, [contact, employeePositionData, executive])

  const recordTarget = getExecutiveRecordTarget(executive)

  return (
    <div className="gba:space-y-3">
      <div className="gba:flex gba:items-center gba:gap-3">
        <Avatar className="gba:h-10 gba:w-10">
          {displayData.avatarSrc && <AvatarImage src={displayData.avatarSrc} alt={displayData.resolvedName} />}
          <AvatarFallback>{getInitials(displayData.resolvedName)}</AvatarFallback>
        </Avatar>
        <div className="gba:min-w-0">
          {recordTarget ? (
            <button
              type="button"
              onClick={() => handleOpenRecord(recordTarget.url)}
              className="gba:block gba:max-w-full gba:truncate gba:bg-transparent gba:p-0 gba:text-left gba:text-sm gba:font-semibold gba:text-primary gba:hover:underline"
              data-testid={`${recordTarget.testId}-${executive.id}`}
            >
              {displayData.resolvedName}
            </button>
          ) : (
            <div className="gba:truncate gba:text-sm gba:font-semibold">{displayData.resolvedName}</div>
          )}
          <div className="gba:text-xs gba:text-muted-foreground">
            {executive.employeeId ? t('source-employee') : t('source-investment-contact')}
          </div>
        </div>
      </div>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <span className="gba:text-sm gba:text-muted-foreground">{t('executive-type-label')}</span>
        <span className="gba:text-sm gba:font-medium">{formatCatalogValue(executive.executiveType)}</span>
      </div>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <span className="gba:text-sm gba:text-muted-foreground">{t('job-title-label')}</span>
        <span className="gba:text-sm gba:font-medium">{displayData.jobTitle}</span>
      </div>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <span className="gba:text-sm gba:text-muted-foreground">{t('department-label')}</span>
        <span className="gba:text-sm gba:font-medium">{displayData.department}</span>
      </div>
    </div>
  )
}
