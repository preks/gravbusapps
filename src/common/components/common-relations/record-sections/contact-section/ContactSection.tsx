import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  IconAvatar,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { PiLinkedinLogo, PiShareNetwork, PiEnvelope, PiPhone } from 'react-icons/pi'
import { UserIcon } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getLinkedInChannel, getXingChannel } from '@/common/data/common/utils/communicationChannelHelpers'
import { getContactTypeLabel } from '@/common/data/relations/constants/contactConstants'
import { getContactTypeIcon, getContactTypeColor, getContactTypeIconColor } from '@/common/utils/contactTypeUtils'
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
    type: 'AppActionButton' as const,
    config: {
      contextsArray: actionButtonProps.contextsArray || [FlowContextName.customerContactEntity],
      externalContextData: {
        ...actionButtonProps.externalContextData,
        contactId: contactIdToUse // Override with current page contactId (must come after spread)
      },
      prefixDataTestId: actionButtonProps.prefixDataTestId || 'contact-section-action',
      emptyStateBehavior: 'enable' as const,
      deferMainContextRequestsUntilClick: true
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
  // Helper function to build full name
  const buildFullName = () => {
    const parts = []
    if (contact?.academicTitle?.value) parts.push(contact.academicTitle.value)
    if (contact?.firstName) parts.push(contact.firstName)
    if (contact?.lastName) parts.push(contact.lastName)
    return parts.length > 0 ? parts.join(' ') : '-'
  }

  // Helper function to build job info
  const buildJobInfo = () => {
    const parts = []
    if (contact?.jobPosition) parts.push(contact.jobPosition)
    if ((contact as any)?.department) {
      const department = (contact as any).department as string
      parts.push(department.charAt(0).toUpperCase() + department.slice(1))
    }
    return parts.length > 0 ? parts.join(' • ') : '-'
  }

  // Get contact type from extended contact object (passed from parent via accountContacts/opportunityContacts)
  const contactType = (contact as any)?.contactType
  const contactTypeLabel = contactType ? getContactTypeLabel(contactType) : null

  // Helper function to extract LinkedIn URL from communication channels
  const getLinkedInUrl = () => {
    const communicationChannels = (contact as any)?.communicationChannels
    if (!communicationChannels || !Array.isArray(communicationChannels)) {
      return (contact as any)?.linkedinUrl || null
    }
    return getLinkedInChannel(communicationChannels)?.value || null
  }

  // Helper function to extract XING URL from communication channels
  const getXingUrl = () => {
    const communicationChannels = (contact as any)?.communicationChannels
    if (!communicationChannels || !Array.isArray(communicationChannels)) {
      return (contact as any)?.xingUrl || null
    }
    return getXingChannel(communicationChannels)?.value || null
  }

  // Extract contact image URL - support both pictureThumbnail and URLs
  // Only use uploaded images or fallback to icon - no random/hardcoded images
  const contactImageUrl = contact?.pictureThumbnail
    ? `data:image/gif;base64,${contact.pictureThumbnail}`
    : contact?.pictureThumbnailUrl || contact?.pictureUrl

  // Get dynamic field values
  const fullName = buildFullName()
  const jobInfo = buildJobInfo()

  return (
    <div className="gba:w-full gba:relative gba:flex gba:flex-col gba:h-full">
      <div className="gba:space-y-2 gba:flex-1">
        {/* Contact Name and Avatar with Action Button */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:relative gba:shrink-0 gba:p-1">
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

            {contactTypeLabel && (
              <div className="gba:absolute gba:top-0 gba:left-0 gba:z-10">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={`gba:px-1 gba:py-0.5 gba:h-5 gba:w-5 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:shadow-md gba:cursor-help gba:border-0 ${getContactTypeColor(contactType)}`}
                        data-testid="contact-type-badge"
                      >
                        {(() => {
                          const IconComponent = getContactTypeIcon(contactType)
                          const iconColorClass = getContactTypeIconColor(contactType)
                          return IconComponent ? (
                            <IconComponent className={`gba:w-3 gba:h-3 ${iconColorClass}`} weight="fill" />
                          ) : null
                        })()}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>{contactTypeLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
            {/* Job Title and Department - directly under name */}
            <div className="gba:h-5 gba:flex gba:items-center gba:min-w-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="gba:text-xs gba:text-muted-foreground gba:truncate gba:min-w-0"
                      data-testid="contact-secondary-info"
                    >
                      {jobInfo || '-'}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="gba:max-w-xs gba:break-words">{jobInfo || '-'}</p>
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
            // Helper to get communication channel by type (lowercase: email, url, tel, text)
            const getChannel = (type: string) => {
              const channels = (contact as any)?.communicationChannels || []
              return channels.find((ch: any) => ch.communicationChannel?.type?.toLowerCase() === type.toLowerCase())
            }

            // Extract email, phone direkt aus communicationChannels (KEINE Fallbacks auf deprecated email/phone)
            const emailChannel = getChannel('email')
            const emailValue = emailChannel?.value

            const phoneChannel = getChannel('tel')
            const phoneValue = phoneChannel?.value

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
                      data-testid="contact-personal-info-email-link"
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
                      data-testid="contact-phone-link"
                    >
                      {value}
                    </a>
                  ) : null
              },
              {
                icon: PiLinkedinLogo,
                title: 'LinkedIn',
                value: getLinkedInUrl(),
                render: (value: string) =>
                  value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:text-sm gba:text-muted-foreground hover:gba:underline"
                      data-testid="contact-linkedin-link"
                      title="LinkedIn Profile"
                    >
                      {value}
                    </a>
                  ) : null
              },
              {
                icon: PiShareNetwork,
                title: 'XING',
                value: getXingUrl(),
                render: (value: string) =>
                  value ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gba:text-sm gba:text-muted-foreground hover:gba:underline"
                      data-testid="contact-xing-link"
                      title="XING Profile"
                    >
                      {value}
                    </a>
                  ) : null
              }
            ]

            return infoItems.map((item, index) => {
              const IconComponent = item.icon
              const content = item.render(item.value || '')

              return (
                <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded">
                  <IconComponent className="gba:text-sm gba:text-muted-foreground" title={item.title} />
                  {content ? (
                    <span className="gba:text-sm gba:text-muted-foreground">{content}</span>
                  ) : (
                    <span className="gba:text-sm gba:text-muted-foreground">-</span>
                  )}
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
