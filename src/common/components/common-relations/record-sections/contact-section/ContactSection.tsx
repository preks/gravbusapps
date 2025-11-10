import React, { useMemo, useState, useEffect } from 'react'
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
import type { CustomerContact } from '@/common/data/customer/types'
import { PiLinkedinLogo, PiShareNetwork, PiEnvelope, PiPhone, PiCaretLeft, PiCaretRight } from 'react-icons/pi'
import { UserIcon } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getLinkedInChannel, getXingChannel } from '@/common/data/common/utils/communicationChannelHelpers'

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

const ContactSection: React.FC<ContactSectionProps> = ({
  contact,
  contacts,
  className = '',
  actionButtonProps,
  recordUrl,
  ...props
}) => {
  const contactList: CustomerContact[] = useMemo(() => {
    const arr = Array.isArray(contacts) ? (contacts as CustomerContact[]).filter(Boolean) : []
    return arr
  }, [contacts])

  const hasMultiple = contactList.length > 1
  const initialSelected: CustomerContact | null = contact || (contactList.length > 0 ? contactList[0] : null)
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(initialSelected)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Update selected contact when contactList changes
  useEffect(() => {
    if (contactList.length > 0 && !selectedContact) {
      setSelectedContact(contactList[0])
      setCurrentIndex(0)
    }
  }, [contactList, selectedContact])

  // Carousel navigation
  const handlePrevious = () => {
    if (hasMultiple) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : contactList.length - 1
      setCurrentIndex(newIndex)
      setSelectedContact(contactList[newIndex])
    }
  }

  const handleNext = () => {
    if (hasMultiple) {
      const newIndex = currentIndex < contactList.length - 1 ? currentIndex + 1 : 0
      setCurrentIndex(newIndex)
      setSelectedContact(contactList[newIndex])
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

  // Use the correct contact data source
  const displayContact = hasMultiple ? selectedContact : contact || initialSelected

  return (
    <div data-testid={props['data-testid'] || 'contact-section'} className={`gba:w-full gba:h-full ${className}`}>
      <ContactPersonalInfo
        contact={displayContact as CustomerContact}
        hasMultiple={hasMultiple}
        currentIndex={currentIndex}
        totalCount={contactList.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        accessToken={props.accessToken}
        actionButtonProps={actionButtonProps}
        onTitleClick={shouldShowClickableTitle ? handleTitleClick : undefined}
      />
    </div>
  )
}

// Static properties for SectionWrapper
;(ContactSection as any).sectionTitle = 'Contact Information'
// Action button is rendered within component content and updates with carousel state

export default ContactSection

interface ContactPersonalInfoProps {
  contact: CustomerContact
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

const ContactPersonalInfo: React.FC<ContactPersonalInfoProps> = ({
  contact,
  hasMultiple,
  currentIndex = 0,
  totalCount = 1,
  onPrevious,
  onNext,
  onTitleClick,
  accessToken,
  actionButtonProps
}) => {
  // Get current contact ID
  const currentContactId = contact?.id

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

  // Check if contact has image/avatar
  const hasContactImage =
    (contact as any)?.pictureThumbnailUrl || (contact as any)?.pictureThumbnail || (contact as any)?.avatar

  // Get dynamic field values
  const fullName = buildFullName()
  const jobInfo = buildJobInfo()

  return (
    <div className="gba:w-full gba:relative gba:flex gba:flex-col gba:h-full">
      <div className="gba:space-y-2 gba:flex-1">
        {/* Contact Name and Avatar with Action Button */}
        <div className="gba:flex gba:items-center gba:gap-3">
          {hasContactImage ? (
            <Avatar className="gba:h-12 gba:w-12">
              <AvatarImage
                src={
                  (contact as any)?.pictureThumbnailUrl ||
                  (contact as any)?.pictureThumbnail ||
                  (contact as any)?.avatar
                }
                alt={fullName}
              />
              <AvatarFallback>
                <UserIcon />
              </AvatarFallback>
            </Avatar>
          ) : (
            <IconAvatar icon={UserIcon} variant="default" size="lg" title="Contact" />
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
          {/* Action Button for this contact */}
          {accessToken && currentContactId && (
            <div className="gba:flex gba:items-start">
              <AppActionButton
                key={`contact-action-${currentContactId}`}
                data-testid={`contact-carousel-action-button-${currentContactId}`}
                size="icon"
                contextsArray={actionButtonProps?.contextsArray || [FlowContextName.customerAccountEntity]}
                externalContextData={{
                  ...actionButtonProps?.externalContextData,
                  contactId: currentContactId
                }}
                prefixDataTestId={actionButtonProps?.prefixDataTestId || `contact-item-action-${currentContactId}`}
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

      {/* Carousel Navigation - Bottom Right */}
      {hasMultiple && (
        <div className="gba:absolute gba:bottom-2 gba:right-2 gba:z-10">
          <div className="gba:flex gba:items-center gba:gap-1 gba:rounded gba:border gba:bg-muted gba:px-2 gba:py-1 gba:shadow-sm gba:border-border">
            <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
              {currentIndex + 1}/{totalCount}
            </span>
            <button
              onClick={onPrevious}
              data-testid="contacts-carousel-prev"
              className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground hover:gba:bg-muted-foreground/10"
            >
              <PiCaretLeft className="gba:text-[10px]" />
            </button>
            <button
              onClick={onNext}
              data-testid="contacts-carousel-next"
              className="gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:rounded gba:transition-colors gba:p-1 gba:text-muted-foreground hover:gba:bg-muted-foreground/10"
            >
              <PiCaretRight className="gba:text-[10px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
