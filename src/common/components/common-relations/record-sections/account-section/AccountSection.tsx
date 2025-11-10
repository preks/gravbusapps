import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PiGlobe, PiPhone, PiUsers, PiMapPin, PiCaretLeft, PiCaretRight, PiEnvelope } from 'react-icons/pi'
import { BankIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getEmailChannel, getPhoneChannel } from '@/common/data/common/utils/communicationChannelHelpers'

interface AddressObject {
  addressLine?: {
    lines?: string[]
  }
  postalCode?: string
  locality?: string
  country?: string
  region?: string
}

interface AccountSectionProps extends Partial<BusinessAppContextProps> {
  accountId?: string
  account?: any // InvestmentAccount oder CustomerAccount - vollständiges Objekt
  accounts?: any[] // Array von Account-Objekten
  address?: AddressObject // Optional: explizite Adresse (falls nicht im Account)
  className?: string
  'data-testid'?: string
  // Optional configurable action props
  actionButtonProps?: {
    contextsArray?: FlowContextName[]
    externalContextData?: Record<string, any>
    prefixDataTestId?: string
  }
  recordUrl?: string
}

const AccountSection: React.FC<AccountSectionProps> = ({
  account,
  accounts,
  address,
  className = '',
  actionButtonProps,
  recordUrl,
  ...props
}) => {
  const accountList = useMemo(() => {
    const arr = Array.isArray(accounts) ? accounts.filter(Boolean) : []
    return arr
  }, [accounts])

  const hasMultiple = accountList.length > 1
  const initialSelected: any | null = account || (accountList.length > 0 ? accountList[0] : null)
  const [selectedAccount, setSelectedAccount] = useState<any | null>(initialSelected)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Update selected account when accountList changes
  useEffect(() => {
    if (accountList.length > 0 && !selectedAccount) {
      setSelectedAccount(accountList[0])
      setCurrentIndex(0)
    }
  }, [accountList, selectedAccount])

  // Carousel navigation
  const handlePrevious = () => {
    if (hasMultiple) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : accountList.length - 1
      setCurrentIndex(newIndex)
      setSelectedAccount(accountList[newIndex])
    }
  }

  const handleNext = () => {
    if (hasMultiple) {
      const newIndex = currentIndex < accountList.length - 1 ? currentIndex + 1 : 0
      setCurrentIndex(newIndex)
      setSelectedAccount(accountList[newIndex])
    }
  }

  // Navigation handler
  const handleTitleClick = () => {
    if (recordUrl) {
      navigateTo(recordUrl)
    }
  }

  // Conditional logic for clickable title
  const shouldShowClickableTitle = !!recordUrl

  // Use the correct account data source - direkt aus account/accounts
  const displayAccount = hasMultiple ? selectedAccount : account || initialSelected

  return (
    <div data-testid={props['data-testid'] || 'account-section'} className={`gba:w-full gba:h-full ${className}`}>
      <AccountCompanyInformation
        account={displayAccount}
        address={address}
        hasMultiple={hasMultiple}
        currentIndex={currentIndex}
        totalCount={accountList.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        className={className}
        actionButtonProps={actionButtonProps}
        onTitleClick={shouldShowClickableTitle ? handleTitleClick : undefined}
        accessToken={props.accessToken}
      />
    </div>
  )
}

// Static properties for SectionWrapper
;(AccountSection as any).sectionTitle = 'Account Information'
;(AccountSection as any).sectionActions = (props: AccountSectionProps) => {
  const { accessToken, actionButtonProps, account, accountId } = props

  if (!actionButtonProps) {
    return null
  }

  return (
    <AppActionButton
      data-testid="account-action-button"
      size="icon"
      contextsArray={actionButtonProps.contextsArray || [FlowContextName.customerAccountEntity]}
      externalContextData={{
        accountId: account?.id || accountId,
        ...actionButtonProps.externalContextData
      }}
      prefixDataTestId={actionButtonProps.prefixDataTestId || 'account-section-action'}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
    />
  )
}

export default AccountSection

// Inlined from '@/business-apps/crm/common/apps/account-record/components/CompanyInformation'
interface InlinedCompanyInformationProps {
  account?: any // InvestmentAccount oder CustomerAccount - vollständiges Objekt
  address?: AddressObject
  hasMultiple?: boolean
  currentIndex?: number
  totalCount?: number
  onPrevious?: () => void
  onNext?: () => void
  className?: string
  actionButtonProps?: {
    contextsArray?: FlowContextName[]
    externalContextData?: Record<string, any>
    prefixDataTestId?: string
  }
  onTitleClick?: () => void
  accessToken?: string
}

const AccountCompanyInformation: React.FC<InlinedCompanyInformationProps> = ({
  account,
  address,
  hasMultiple,
  currentIndex = 0,
  totalCount = 1,
  onPrevious,
  onNext,
  className = '',
  onTitleClick,
  accessToken,
  actionButtonProps
}) => {
  const cardClassName = `gba:w-full ${className}`.trim()

  // Get current account ID - prioritize account prop as it contains the selected carousel item
  const currentAccountId = account?.id

  // Extract logo URL - support both picture and pictureThumbnail
  const logoUrl = account?.pictureThumbnail
    ? `data:image/gif;base64,${account.pictureThumbnail}`
    : account?.picture || account?.pictureUrl || account?.pictureThumbnailUrl

  return (
    <div className={`${cardClassName} gba:relative gba:flex gba:flex-col gba:h-full`}>
      <div className="gba:space-y-2 gba:flex-1">
        {/* Company Name and Icon with Action Button */}
        <div className="gba:flex gba:items-center gba:gap-3">
          {logoUrl ? (
            <Avatar className="gba:h-12 gba:w-12">
              <AvatarImage src={logoUrl} alt="Company logo" />
              <AvatarFallback>
                <BankIcon />
              </AvatarFallback>
            </Avatar>
          ) : (
            <IconAvatar icon={BankIcon} variant="default" size="lg" title="Company" />
          )}
          <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0 gba:flex-1">
            <div className="gba:h-5 gba:flex gba:items-center gba:min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {onTitleClick ? (
                      <button
                        onClick={onTitleClick}
                        className="gba:text-sm gba:font-semibold gba:text-card-foreground gba:truncate gba:min-w-0 gba:cursor-pointer gba:hover:underline gba:text-left gba:bg-transparent gba:border-none gba:p-0"
                        data-testid="account-name-clickable"
                        title="Click to view account record"
                      >
                        {account?.name || '-'}
                      </button>
                    ) : (
                      <h3
                        className="gba:text-sm gba:font-semibold gba:text-card-foreground gba:truncate gba:min-w-0"
                        data-testid="account-name"
                      >
                        {account?.name || '-'}
                      </h3>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="gba:max-w-xs gba:break-words">{account?.name || '-'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Company Type and Industry - directly under name */}
            <div className="gba:h-5 gba:flex gba:items-center gba:min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="gba:text-xs gba:text-muted-foreground gba:truncate gba:min-w-0"
                      data-testid="account-secondary-info"
                    >
                      {(() => {
                        // Direkt aus Account-Objekt extrahieren (wie in View Layouts)
                        const legalForm = account?.legalForm?.value || account?.legalForm
                        // industryClass für IRM, industry für CRM - beide unterstützen
                        const industry =
                          account?.industryClass?.value ||
                          account?.industryClass ||
                          account?.industry?.value ||
                          account?.industry
                        const items = [legalForm, industry].filter(Boolean)

                        if (items.length > 0) {
                          return items.join(' • ')
                        }

                        // Show dash when no data is available
                        return '-'
                      })()}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="gba:max-w-xs gba:break-words">
                      {(() => {
                        const legalForm = account?.legalForm?.value || account?.legalForm
                        const industry =
                          account?.industryClass?.value ||
                          account?.industryClass ||
                          account?.industry?.value ||
                          account?.industry
                        const items = [legalForm, industry].filter(Boolean)

                        if (items.length > 0) {
                          return items.join(' • ')
                        }

                        return '-'
                      })()}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {/* Action Button for this account */}
          {accessToken && currentAccountId && (
            <div className="gba:flex gba:items-start">
              <AppActionButton
                key={`account-action-${currentAccountId}`}
                data-testid={`account-carousel-action-button-${currentAccountId}`}
                size="icon"
                contextsArray={actionButtonProps?.contextsArray || [FlowContextName.customerAccountEntity]}
                externalContextData={{
                  ...actionButtonProps?.externalContextData,
                  accountId: currentAccountId
                }}
                prefixDataTestId={actionButtonProps?.prefixDataTestId || `account-item-action-${currentAccountId}`}
                accessToken={accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="gba:border-t"></div>

        {/* Contact Information */}
        <div>
          {(() => {
            // Extract email, phone direkt aus communicationChannels (KEINE Fallbacks auf deprecated email/phone)
            const emailChannel = getEmailChannel(account?.communicationChannels)
            const emailValue = emailChannel?.value

            const phoneChannel = getPhoneChannel(account?.communicationChannels)
            const phoneValue = phoneChannel?.value

            // Website ist ein normales Feld, NICHT aus communicationChannels
            const websiteValue = account?.website

            // Extract employees - nur Common Field companySize verwenden (KEINE Fallbacks)
            const employeesValue = account?.companySize?.value

            // Extract revenue - nur Common Field accountAnnualRevenueBand verwenden (KEINE Fallbacks)
            const revenueValue = account?.accountAnnualRevenueBand?.value

            // Extract address from account.addresses if not provided explicitly
            const accountAddress =
              address ||
              (() => {
                const addresses = account?.addresses || []
                const primaryAddress = addresses.find((addr: any) => addr.addressType === 'PRIMARY_ADDRESS')
                const addr = primaryAddress || addresses[0]
                if (!addr) return undefined

                return {
                  addressLine: addr.addressLine,
                  postalCode: addr.postalCode,
                  locality: addr.locality || addr.city, // CRM uses 'city', IRM uses 'locality'
                  country: typeof addr.country === 'string' ? addr.country : addr.country?.value,
                  region: typeof addr.region === 'string' ? addr.region : addr.region?.value
                }
              })()

            const infoItems = [
              {
                icon: PiEnvelope,
                title: 'Email',
                value: emailValue,
                render: (value: string) =>
                  value ? (
                    <a
                      href={`mailto:${value}`}
                      className="gba:text-sm gba:text-muted-foreground gba:no-underline gba:hover:underline"
                      data-testid="account-email-link"
                    >
                      {value}
                    </a>
                  ) : null
              },
              {
                icon: PiPhone,
                title: 'Phone',
                value: phoneValue,
                render: (value: string) =>
                  value ? (
                    <a
                      href={`tel:${value}`}
                      className="gba:text-sm gba:text-muted-foreground gba:no-underline gba:hover:underline"
                      data-testid="account-phone-link"
                    >
                      {value}
                    </a>
                  ) : null
              },
              {
                icon: PiUsers,
                title: 'Employees',
                value: employeesValue,
                render: (value: string) => value
              },
              {
                icon: ChartLineUpIcon,
                title: 'Revenue',
                value: revenueValue,
                render: (value: string) => value,
                testId: 'account-revenue-value'
              },
              {
                icon: PiGlobe,
                title: 'Website',
                value: websiteValue,
                render: (value: string) =>
                  value
                    ? (() => {
                        const fullUrl = value.includes('://') ? value : `https://${value}`
                        return (
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gba:text-sm gba:text-muted-foreground gba:hover:underline"
                            data-testid="account-website-link"
                          >
                            {value}
                          </a>
                        )
                      })()
                    : null
              },
              {
                icon: PiMapPin,
                title: 'Address',
                value: accountAddress
                  ? formatAddress({
                      addressLine: accountAddress.addressLine?.lines
                        ? { lines: accountAddress.addressLine.lines }
                        : accountAddress.addressLine,
                      locality: String(accountAddress.locality || ''),
                      postalCode: String(accountAddress.postalCode || ''),
                      region: String(accountAddress.region || ''),
                      country: String(accountAddress.country || '')
                    })
                  : undefined,
                render: (value: string) =>
                  value ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="gba:flex gba:flex-col gba:cursor-help">
                            {(() => {
                              const lines = value.split('\n')
                              const firstLine = lines[0] || ''
                              const postalCodeCityLine = lines[1] || ''
                              return [firstLine, postalCodeCityLine]
                                .filter(line => line.trim())
                                .map((line, index) => (
                                  <div key={index} className="gba:text-sm gba:leading-snug">
                                    {line}
                                  </div>
                                ))
                            })()}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            {value.split('\n').map((line, index) => (
                              <div key={index} className="gba:text-sm gba:leading-snug">
                                {line}
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null
              }
            ]

            return infoItems.map((item, index) => {
              const IconComponent = item.icon
              const content = item.render(item.value || '')

              return (
                <div
                  key={index}
                  className={`gba:flex gba:gap-2 gba:px-2 gba:py-1 gba:rounded ${item.title === 'Address' ? 'gba:items-start' : 'gba:items-center'}`}
                >
                  <IconComponent className="gba:text-sm gba:text-muted-foreground" title={item.title} />
                  {content ? (
                    <span className="gba:text-sm gba:text-muted-foreground" data-testid={item.testId}>
                      {content}
                    </span>
                  ) : (
                    <span className="gba:text-sm gba:text-muted-foreground">-</span>
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Carousel Navigation - Bottom Right */}
      {hasMultiple && (
        <div className="gba:absolute gba:bottom-2 gba:right-2 gba:z-10">
          <div className="gba:flex gba:items-center gba:gap-1 gba:rounded gba:border gba:bg-muted gba:px-2 gba:py-1 gba:shadow-sm gba:border-border">
            <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
              {currentIndex + 1}/{totalCount}
            </span>
            <button
              onClick={onPrevious}
              data-testid="accounts-carousel-prev"
              className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
            >
              <PiCaretLeft className="gba:text-[10px]" />
            </button>
            <button
              onClick={onNext}
              data-testid="accounts-carousel-next"
              className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground gba:hover:bg-muted-foreground/10"
            >
              <PiCaretRight className="gba:text-[10px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
