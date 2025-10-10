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
import { PiGlobe, PiPhone, PiUsers, PiMapPin, PiCaretLeft, PiCaretRight } from 'react-icons/pi'
import { BankIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'

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
  accountData?: any
  account?: any
  accounts?: any[]
  address?: AddressObject
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
  accountId,
  accountData,
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

  // Use the correct account data source
  const displayAccount = hasMultiple ? selectedAccount : accountData || account || initialSelected

  return (
    <div data-testid={props['data-testid'] || 'account-section'} className={`gba:w-full gba:h-full ${className}`}>
      <AccountCompanyInformation
        account={displayAccount}
        accountData={accountData}
        address={address}
        hasMultiple={hasMultiple}
        currentIndex={currentIndex}
        totalCount={accountList.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        className={className}
        actionButtonProps={actionButtonProps}
        onTitleClick={shouldShowClickableTitle ? handleTitleClick : undefined}
      />
    </div>
  )
}

// Static properties for SectionWrapper
;(AccountSection as any).sectionTitle = 'Account Information'
;(AccountSection as any).sectionActions = (props: AccountSectionProps) => {
  const { accessToken, actionButtonProps, accountData, account, accountId } = props

  if (!actionButtonProps) {
    return null
  }

  return (
    <AppActionButton
      data-testid="account-action-button"
      size="icon"
      contextsArray={actionButtonProps.contextsArray || [FlowContextName.customerAccountEntity]}
      externalContextData={{
        accountId: accountData?.id || account?.id || accountId,
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
  account?: any
  accountData?: any
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
}

const AccountCompanyInformation: React.FC<InlinedCompanyInformationProps> = ({
  account,
  accountData,
  address,
  hasMultiple,
  currentIndex = 0,
  totalCount = 1,
  onPrevious,
  onNext,
  className = '',
  onTitleClick
}) => {
  const cardClassName = `gba:w-full ${className}`.trim()

  return (
    <div className={`${cardClassName} gba:relative gba:flex gba:flex-col gba:h-full`}>
      <div className="gba:space-y-2 gba:flex-1">
        {/* Company Name and Icon */}
        <div className="gba:flex gba:items-center gba:gap-3">
          {accountData?.logoUrl || account?.logoUrl ? (
            <Avatar className="gba:h-12 gba:w-12">
              <AvatarImage src={accountData?.logoUrl || account?.logoUrl} alt="Company logo" />
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
                        {accountData?.name || account?.name || '-'}
                      </button>
                    ) : (
                      <h3
                        className="gba:text-sm gba:font-semibold gba:text-card-foreground gba:truncate gba:min-w-0"
                        data-testid="account-name"
                      >
                        {accountData?.name || account?.name || '-'}
                      </h3>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="gba:max-w-xs gba:break-words">{accountData?.name || account?.name || '-'}</p>
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
                        const legalForm = accountData?.legalForm?.value || account?.legalForm
                        const industry = accountData?.industry?.value || account?.industry
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
                        const legalForm = accountData?.legalForm?.value || account?.legalForm
                        const industry = accountData?.industry?.value || account?.industry
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
        </div>

        {/* Separator */}
        <div className="gba:border-t"></div>

        {/* Contact Information */}
        <div>
          {(() => {
            const infoItems = [
              {
                icon: PiPhone,
                title: 'Phone',
                value: accountData?.phone || account?.phone,
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
                value: accountData?.numberOfEmployees?.value || account?.numberOfEmployees?.value || account?.size,
                render: (value: string) => value
              },
              {
                icon: ChartLineUpIcon,
                title: 'Revenue',
                value: accountData?.annualRevenue?.value || account?.annualRevenue?.value || account?.revenue,
                render: (value: string) => value,
                testId: 'account-revenue-value'
              },
              {
                icon: PiGlobe,
                title: 'Website',
                value: accountData?.website || account?.website,
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
                value: (() => {
                  if (address) {
                    return formatAddress({
                      addressLine: address.addressLine?.lines ? { lines: address.addressLine.lines } : null,
                      locality: String(address.locality || ''),
                      postalCode: String(address.postalCode || ''),
                      region: String(address.region || ''),
                      country: String(address.country || '')
                    })
                  }
                  // Fallback to old logic for backward compatibility
                  return formatAddress({
                    addressLine: accountData?.addressLine,
                    locality: String(accountData?.locality || account?.locality || ''),
                    postalCode: String(accountData?.postalCode || account?.postalCode || ''),
                    region: String(
                      accountData?.region?.value ||
                        account?.region?.value ||
                        accountData?.region ||
                        account?.region ||
                        ''
                    ),
                    country: String(
                      accountData?.country?.value ||
                        account?.country?.value ||
                        accountData?.country ||
                        account?.country ||
                        ''
                    )
                  })
                })(),
                render: (value: string) =>
                  value ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="gba:flex gba:flex-col gba:cursor-help">
                            {address
                              ? // Show first address line + postal code + locality for content
                                (() => {
                                  const contentLines = []
                                  // Add first address line if it exists
                                  if (address.addressLine?.lines?.[0]) {
                                    contentLines.push(address.addressLine.lines[0])
                                  }
                                  // Add postal code + locality
                                  const postalCodeLocality = [address.postalCode, address.locality]
                                    .filter(Boolean)
                                    .join(', ')
                                  if (postalCodeLocality) {
                                    contentLines.push(postalCodeLocality)
                                  }
                                  return contentLines.map((line, index) => (
                                    <div key={index} className="gba:text-sm gba:leading-snug">
                                      {line}
                                    </div>
                                  ))
                                })()
                              : // Fallback to formatted address lines
                                (() => {
                                  const lines = value.split('\n')
                                  const firstLine = lines[0] || ''
                                  // Get postalCode and city from the formatted address (line 2)
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
                            {address
                              ? // Show complete formatted address for tooltip
                                (() => {
                                  const tooltipAddress = formatAddress({
                                    addressLine: address.addressLine?.lines
                                      ? { lines: address.addressLine.lines }
                                      : null,
                                    locality: String(address.locality || ''),
                                    postalCode: String(address.postalCode || ''),
                                    region: String(address.region || ''),
                                    country: String(address.country || '')
                                  })
                                  return tooltipAddress.split('\n').map((line, index) => (
                                    <div key={index} className="gba:text-sm gba:leading-snug">
                                      {line}
                                    </div>
                                  ))
                                })()
                              : // Fallback to formatted address lines
                                value.split('\n').map((line, index) => (
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
