import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  EmptyState
} from '@newwork/nw-design-system'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PiGlobe, PiUsers, PiMapPin } from 'react-icons/pi'
import { BankIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'
import { renderCommunicationChannels } from '@/common/utils/communicationChannelRenderer'
import { createGetPages } from '../utils'
import { ContactTypeBadge } from '../shared/ContactTypeBadge'

interface AddressObject {
  addressLine?: {
    lines?: string[]
  }
  postalCode?: string
  locality?: string
  country?: string
  region?: string
}

// Helper component to render address lines with reduced nesting
const AddressLines: React.FC<{ value: string }> = ({ value }) => {
  const lines = value.split('\n')
  const firstLine = lines[0] || ''
  const postalCodeCityLine = lines[1] || ''

  return (
    <>
      {[firstLine, postalCodeCityLine]
        .filter(line => line.trim())
        .map((line, index) => (
          <div key={`address-line-${index}`} className="gba:text-sm gba:leading-snug">
            {line}
          </div>
        ))}
    </>
  )
}

// Helper component to render full address in tooltip
const FullAddressTooltip: React.FC<{ value: string }> = ({ value }) => (
  <>
    {value.split('\n').map((line, index) => (
      <div key={`tooltip-line-${index}`} className="gba:text-sm gba:leading-snug">
        {line}
      </div>
    ))}
  </>
)

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

const createTitleClickHandler = (recordUrl?: string) => {
  if (!recordUrl) {
    return undefined
  }
  return () => navigateTo(recordUrl)
}

const AccountSection: React.FC<AccountSectionProps> = ({
  account,
  accounts,
  address,
  className = '',
  recordUrl,
  ...props
}) => {
  // If used directly (not via SectionWrapper), render first account
  const accountList = Array.isArray(accounts) ? accounts.filter(Boolean) : []
  const displayAccount = account || (accountList.length > 0 ? accountList[0] : null)

  return (
    <div data-testid={props['data-testid'] || 'account-section'} className={`gba:w-full gba:h-full ${className}`}>
      <AccountCompanyInformation
        account={displayAccount}
        address={address}
        className={className}
        onTitleClick={createTitleClickHandler(recordUrl)}
      />
    </div>
  )
}

// Static properties for SectionWrapper
;(AccountSection as any).sectionTitle = 'Account Information'
;(AccountSection as any).getPages = createGetPages<any, AccountSectionProps>(
  (props: AccountSectionProps) => props.accounts,
  (props: AccountSectionProps) => props.account
)
;(AccountSection as any).renderPage = (pageData: any, _pageIndex: number, props: AccountSectionProps) => {
  const { address, className = '', recordUrl } = props

  return (
    <AccountCompanyInformation
      account={pageData}
      address={address}
      className={className}
      onTitleClick={createTitleClickHandler(recordUrl)}
    />
  )
}
;(AccountSection as any).getActionButtonConfig = (pageData: any, _pageIndex: number, props: AccountSectionProps) => {
  const { accessToken, actionButtonProps, account, accountId } = props

  if (!actionButtonProps || !accessToken) {
    return null
  }

  // Use pageData if available (carousel), otherwise fallback to account/accountId from props
  const accountIdToUse = pageData?.id || account?.id || accountId

  if (!accountIdToUse) {
    return null
  }

  const config = {
    type: 'AppAction' as const,
    config: {
      variant: 'header' as const,
      contextsArray: actionButtonProps.contextsArray || [FlowContextName.customerAccountEntity],
      externalContextData: {
        ...actionButtonProps.externalContextData,
        accountId: accountIdToUse // Override with current page accountId (must come after spread)
      },
      prefixDataTestId: actionButtonProps.prefixDataTestId || 'account-section-action',
      emptyStateBehavior: 'enable' as const
    }
  }

  return config
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
  className = '',
  onTitleClick
}) => {
  const cardClassName = `gba:w-full ${className}`.trim()

  // Empty state - when no account data is available
  if (!account) {
    return (
      <div className={`${cardClassName} gba:relative gba:flex gba:flex-col gba:h-full`}>
        <EmptyState
          type="no-data"
          title="No Account Data"
          description="No account data is available for this object. Update its details to see the information here."
          data-testid="account-section-empty-state"
        />
      </div>
    )
  }

  // Extract logo URL - support both pictureThumbnail and URLs
  // Only use uploaded images or fallback to icon - no random/hardcoded images
  const logoUrl = account?.pictureThumbnail
    ? `data:image/gif;base64,${account.pictureThumbnail}`
    : account?.pictureUrl || account?.pictureThumbnailUrl

  // Get contact type from extended account object (passed from parent via accountContacts in Contact Records)
  const contactType = account?.contactType

  // Get account type from extended account object (passed from parent via junction tables in Opportunity/Investment Records)
  // Can be from investmentAccountType (for investments) or accountType (for opportunities)
  const accountType = account?.investmentAccountType || account?.accountType

  return (
    <div className={`${cardClassName} gba:relative gba:flex gba:flex-col gba:h-full`}>
      <div className="gba:space-y-1 gba:flex-1">
        {/* Company Name and Icon with Action Button */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:relative gba:shrink-0">
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
          </div>
          <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0 gba:flex-1">
            <div className="gba:h-5 gba:flex gba:items-center gba:gap-2 gba:min-w-0">
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
              {contactType && (
                <div className="gba:shrink-0">
                  <ContactTypeBadge contactType={contactType} />
                </div>
              )}
            </div>
            {/* Legal Form and Account Type - directly under name */}
            <div className="gba:h-5 gba:flex gba:items-center gba:min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="gba:text-xs gba:text-muted-foreground gba:truncate gba:min-w-0"
                      data-testid="account-secondary-info"
                    >
                      {(() => {
                        // Extract legal form
                        const legalForm = account?.legalForm?.value || account?.legalForm

                        // Extract account type (from junction tables for Opportunity/Investment Records)
                        const accountTypeValue =
                          accountType && typeof accountType === 'object'
                            ? accountType.value || accountType.code
                            : accountType

                        const items = [legalForm, accountTypeValue].filter(Boolean)

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
                        const accountTypeValue =
                          accountType && typeof accountType === 'object'
                            ? accountType.value || accountType.code
                            : accountType
                        const items = [legalForm, accountTypeValue].filter(Boolean)

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
          {/* Action Button removed - handled by SectionWrapper */}
        </div>

        {/* Separator */}
        <div className="gba:border-t"></div>

        {/* Contact Information */}
        <div>
          {(() => {
            // Get ALL communication channels dynamically
            const communicationChannelItems = renderCommunicationChannels(account?.communicationChannels, 'account')

            // Website ist ein normales Feld, NICHT aus communicationChannels
            const websiteValue = account?.website

            // Extract employees - nur Common Field companySize verwenden (KEINE Fallbacks)
            const employeesValue = account?.companySize?.value

            // Extract revenue - nur Common Field accountAnnualRevenueBand verwenden (KEINE Fallbacks)
            const revenueValue = account?.accountAnnualRevenueBand?.value

            // Extract industry - moved from secondary info to detailed info section
            const industryValue =
              account?.industryClass?.value || account?.industryClass || account?.industry?.value || account?.industry

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

            // Static fields (not from communication channels)
            const staticInfoItems = [
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
                icon: BankIcon,
                title: 'Industry',
                value: industryValue,
                render: (value: string) => value,
                testId: 'account-industry-value'
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
                            <AddressLines value={value} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            <FullAddressTooltip value={value} />
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null
              }
            ]

            // Combine dynamic communication channels with static fields
            const allItems = [...communicationChannelItems, ...staticInfoItems]

            // Filter to only show items with actual values
            const itemsWithValues = allItems.filter(item => item.value)

            // If no items, show placeholder
            if (itemsWithValues.length === 0) {
              return (
                <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded">
                  <span className="gba:text-sm gba:text-muted-foreground">No information available</span>
                </div>
              )
            }

            return itemsWithValues.map((item, index) => {
              const IconComponent = item.icon
              const content = item.render(item.value)

              return (
                <div
                  key={index}
                  className={`gba:flex gba:gap-2 gba:px-2 gba:py-1 gba:rounded ${item.title === 'Address' ? 'gba:items-start' : 'gba:items-center'}`}
                >
                  <IconComponent className="gba:text-sm gba:text-muted-foreground" title={item.title} />
                  <span className="gba:text-sm gba:text-muted-foreground" data-testid={item.testId}>
                    {content}
                  </span>
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* Carousel Navigation removed - handled by SectionWrapper */}
    </div>
  )
}
