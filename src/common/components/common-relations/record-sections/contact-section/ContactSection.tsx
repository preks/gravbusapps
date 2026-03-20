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
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { UserIcon, BriefcaseIcon } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { renderCommunicationChannels } from '@/common/utils/communicationChannelRenderer'
import { createGetPages } from '../utils'

interface ContactSectionProps extends Partial<BusinessAppContextProps> {
  contactId?: string
  contact?: any
  contacts?: any[]
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

const ContactSection: React.FC<ContactSectionProps> = ({ contact, contacts, className = '', recordUrl, ...props }) => {
  // If used directly (not via SectionWrapper), render first contact
  const contactList = Array.isArray(contacts) ? (contacts as Contact[]).filter(Boolean) : []
  const displayContact = contact || (contactList.length > 0 ? contactList[0] : null)

  return (
    <div data-testid={props['data-testid'] || 'contact-section'} className={`gba:w-full gba:h-full ${className}`}>
      <ContactPersonalInfo contact={displayContact as Contact} onTitleClick={createTitleClickHandler(recordUrl)} />
    </div>
  )
}

// Static properties for SectionWrapper
;(ContactSection as any).sectionTitle = 'Contact Information'
;(ContactSection as any).getPages = createGetPages<any, ContactSectionProps>(
  (props: ContactSectionProps) => props.contacts,
  (props: ContactSectionProps) => props.contact
)
;(ContactSection as any).renderPage = (pageData: any, _pageIndex: number, props: ContactSectionProps) => {
  const { recordUrl } = props

  return <ContactPersonalInfo contact={pageData} onTitleClick={createTitleClickHandler(recordUrl)} />
}
;(ContactSection as any).getActionButtonConfig = (pageData: any, _pageIndex: number, props: ContactSectionProps) => {
  const { accessToken, actionButtonProps, contact, contactId } = props

  if (!actionButtonProps || !accessToken) {
    return null
  }

  // Use pageData if available (carousel), otherwise fallback to contact/contactId from props
  const contactIdToUse = pageData?.id || contact?.id || contactId

  if (!contactIdToUse) {
    return null
  }

  const config = {
    type: 'AppAction' as const,
    config: {
      variant: 'header' as const,
      contextsArray: actionButtonProps.contextsArray || [FlowContextName.customerContactEntity],
      externalContextData: {
        ...actionButtonProps.externalContextData,
        contactId: contactIdToUse // Override with current page contactId (must come after spread)
      },
      prefixDataTestId: actionButtonProps.prefixDataTestId || 'contact-section-action',
      emptyStateBehavior: 'enable' as const
    }
  }

  return config
}

export default ContactSection

interface ContactPersonalInfoProps {
  contact: Contact
  hasMultiple?: boolean
  currentIndex?: number
  totalCount?: number
  onPrevious?: () => void
  onNext?: () => void
  accessToken?: string
  actionButtonProps?: {
    contextsArray?: FlowContextName[]
    externalContextData?: Record<string, any>
    prefixDataTestId?: string
  }
  onTitleClick?: () => void
}

const ContactPersonalInfo: React.FC<ContactPersonalInfoProps> = ({ contact, onTitleClick }) => {
  // Empty state - when no contact data is available
  if (!contact) {
    return (
      <div className="gba:w-full gba:relative gba:flex gba:flex-col gba:h-full">
        <EmptyState
          type="no-data"
          title="No Contact Data"
          description="No contact data is available for this object. Update its details to see the information here."
          data-testid="contact-section-empty-state"
        />
      </div>
    )
  }

  // Helper function to build full name
  const buildFullName = () => {
    const parts = []
    if (contact?.academicTitle?.value) parts.push(contact.academicTitle.value)
    if (contact?.firstName) parts.push(contact.firstName)
    if (contact?.lastName) parts.push(contact.lastName)
    return parts.length > 0 ? parts.join(' ') : '-'
  }

  // Helper function to build secondary info (e.g. job position)
  const buildSecondaryInfo = () => {
    const parts = []
    if (contact?.jobPosition) parts.push(contact.jobPosition)
    return parts.length > 0 ? parts.join(' • ') : null
  }

  // Extract contact image URL - support both pictureThumbnail and URLs
  // Only use uploaded images or fallback to icon - no random/hardcoded images
  const contactImageUrl = contact?.pictureThumbnail
    ? `data:image/gif;base64,${contact.pictureThumbnail}`
    : contact?.pictureThumbnailUrl || contact?.pictureUrl

  // Get dynamic field values
  const fullName = buildFullName()
  const secondaryInfo = buildSecondaryInfo()

  return (
    <div className="gba:w-full gba:relative gba:flex gba:flex-col gba:h-full">
      <div className="gba:space-y-1 gba:flex-1">
        {/* Contact Name and Avatar with Action Button */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:relative gba:shrink-0">
            {contactImageUrl ? (
              <Avatar className="gba:h-12 gba:w-12">
                <AvatarImage src={contactImageUrl} alt={fullName} />
                <AvatarFallback>
                  <UserIcon />
                </AvatarFallback>
              </Avatar>
            ) : (
              <IconAvatar icon={UserIcon} variant="default" size="lg" title="Contact" />
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
                        data-testid="contact-name-clickable"
                        title="Click to view contact record"
                      >
                        {fullName || '-'}
                      </button>
                    ) : (
                      <h3
                        className="gba:text-sm gba:font-semibold gba:text-card-foreground gba:truncate gba:min-w-0"
                        data-testid="contact-name"
                      >
                        {fullName || '-'}
                      </h3>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="gba:max-w-xs gba:break-words">{fullName || '-'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Position and Department - directly under name */}
            {secondaryInfo && (
              <div className="gba:h-5 gba:flex gba:items-center gba:min-w-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="gba:text-xs gba:text-muted-foreground gba:truncate gba:min-w-0"
                        data-testid="contact-secondary-info"
                      >
                        {secondaryInfo}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:max-w-xs gba:break-words">{secondaryInfo}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          {/* Action Button removed - handled by SectionWrapper */}
        </div>

        {/* Separator */}
        <div className="gba:border-t"></div>

        {/* Contact Information */}
        <div>
          {(() => {
            // Dynamically render ALL communication channels that have values
            const communicationChannelItems = renderCommunicationChannels(contact?.communicationChannels, 'contact')

            // Add department as a static field if it exists
            const departmentValue = (contact as any)?.department
            const departmentItem = departmentValue
              ? {
                  icon: BriefcaseIcon,
                  title: 'Department',
                  value: departmentValue,
                  render: (value: string) => (
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </span>
                  )
                }
              : null

            // Combine communication channels with department field
            const allItems = departmentItem ? [departmentItem, ...communicationChannelItems] : communicationChannelItems

            // Filter out items without values
            const itemsWithValues = allItems.filter(item => item.value)

            // If no items, show a placeholder
            if (itemsWithValues.length === 0) {
              return (
                <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded">
                  <span className="gba:text-sm gba:text-muted-foreground">No contact information available</span>
                </div>
              )
            }

            return itemsWithValues.map((item, index) => {
              const IconComponent = item.icon
              const content = item.render(item.value)

              return (
                <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded">
                  <IconComponent className="gba:text-sm gba:text-muted-foreground" title={item.title} />
                  {content}
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
