import React, { useState } from 'react'
import {
  Combobox,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  useTranslation
} from '@newwork/nw-design-system'
import { XIcon, PencilIcon, PlusIcon } from '@phosphor-icons/react'
import { Building2, Briefcase } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ContactType, getContactTypeLabel } from '@/common/data/relations/constants/contactConstants'
import translations from './_i18n'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  pictureThumbnail?: string
  extraInfo?: {
    email?: string
    phone?: string
    jobPosition?: string
    department?: string
    organizationalUnit?: string
  }
}

interface ContactValue {
  id: string
  name: string
  contactType?: ContactType | string
  pictureThumbnail?: string
  jobPosition?: string
  department?: string
  /** Marker added when this contact is an in-memory (not yet persisted) draft created via inline-create. */
  __isDraft?: boolean
  /** Stable client-side identifier for the draft entry. */
  __draftId?: string
  /**
   * Full nested contact payload, present only when `__isDraft` is true. Carries every field the
   * user filled in the inline-create dialog (firstName, lastName, fullName, jobPosition, department,
   * pictureThumbnail, communicationChannels, ownerEmployee, salesCampaignId, userId, …).
   *
   * Native-rendered by `getContactData()` so draft rows are visually identical to saved-contact rows.
   */
  contact?: Record<string, any>
}

interface ContactSelectProps {
  value: Array<string | ContactValue> | ContactValue | string | null
  onChange: (contactIds: Array<string | ContactValue> | string | ContactValue | null) => void
  dataTestId?: string
  error?: string | null

  // Contact data passed as props
  contacts: SelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  searchContacts: (search: string) => void
  hasMore?: boolean
  onLoadMore?: () => void

  // Full account contacts with full contact data (for email/phone extraction)
  accountContacts?: any[]

  /** When false, hides per-row contact-type catalog (e.g. activity “related contact” picker) */
  showContactType?: boolean

  /** Disables search combobox (e.g. no linked contacts) */
  disabled?: boolean

  /** When provided, renders a "+" button beside the combobox that invokes this callback
   * to open an inline-create dialog. */
  onCreateNew?: () => void

  /** When provided, draft rows render an Edit pencil that invokes this callback with the
   * draft's index in the value array. */
  onEditDraft?: (index: number) => void
}

const isDraftContactValue = (value: string | ContactValue): value is ContactValue =>
  typeof value === 'object' && value !== null && value.__isDraft === true

/**
 * Build a SelectOption for a draft contact directly from its embedded `contact` payload.
 *
 * Drafts carry the full inline-create dialog state, so we can render them with the exact same
 * row layout (avatar, name + sub-line, email/phone) as saved contacts — only the visual
 * differentiators (badge / accent stripe / Edit pencil) live in the render block and key off
 * `__isDraft`.
 */
const resolveDraftContactDisplay = (value: ContactValue): SelectOption => {
  const c = value.contact || {}
  const displayName = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || value.name || 'New Contact'

  const emailChannel = c.communicationChannels?.find(
    (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
  )
  const phoneChannel = c.communicationChannels?.find(
    (ch: any) => ch.communicationChannel?.code === 'PHONE' || ch.communicationChannelRef?.includes(':PHONE')
  )

  const draftId = value.__draftId || value.id
  return {
    id: draftId,
    value: draftId,
    label: displayName,
    name: displayName,
    pictureThumbnail: c.pictureThumbnail || value.pictureThumbnail,
    extraInfo: {
      email: emailChannel?.value,
      phone: phoneChannel?.value,
      jobPosition: c.jobPosition || value.jobPosition,
      department: c.department || value.department
    }
  }
}

const ContactSelect: React.FC<ContactSelectProps> = ({
  value,
  onChange,
  dataTestId,
  error,
  contacts,
  contactsLoading,
  contactsError,
  searchContacts,
  hasMore,
  onLoadMore,
  accountContacts = [],
  showContactType = true,
  disabled = false,
  onCreateNew,
  onEditDraft
}) => {
  const { t } = useTranslation(translations)

  // Helper function to extract ID from value (string or object)
  const getContactId = (contactValue: string | ContactValue): string => {
    return typeof contactValue === 'object' ? contactValue.id : contactValue
  }

  // Derive multiple mode from value type (array = multiple, single value = single)
  const multiple = React.useMemo(() => {
    return Array.isArray(value)
  }, [value])

  // Normalize value to always work with arrays internally for consistent handling
  const normalizedValue: Array<string | ContactValue> = React.useMemo(() => {
    if (Array.isArray(value)) return value
    if (value === null || value === '') return []
    return [value]
  }, [value])

  // Internal state to preserve contact names when adding new contacts
  // This ensures that newly added contacts keep their names even if accountContacts doesn't have full data yet
  const [internalValue, setInternalValue] = useState<Array<string | ContactValue>>(normalizedValue)
  const [mergedContacts, setMergedContacts] = useState<SelectOption[]>([])

  // Sync internal value with prop value
  // Strategy:
  // 1. If internalValue has complete data for a contact (jobPosition/department/pictureThumbnail) -> keep it (newly added)
  // 2. Otherwise -> use data from value (from accountContacts with full data from backend)
  React.useEffect(() => {
    const currentIds = new Set(internalValue.map(v => getContactId(v)))
    const newIds = new Set(normalizedValue.map(v => getContactId(v)))

    // Only update if IDs actually changed (contact added/removed)
    const idsChanged =
      currentIds.size !== newIds.size ||
      [...currentIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !currentIds.has(id))

    if (idsChanged) {
      const merged = normalizedValue.map(newContact => {
        const newId = getContactId(newContact)
        const newContactObj =
          typeof newContact === 'object' ? newContact : { id: newContact, name: '', contactType: undefined }
        const existingContact = internalValue.find(c => getContactId(c) === newId)

        // Drafts: parent form state is the single source of truth. Never preserve a stale
        // internalValue entry — the inline-create dialog can mutate every field of `contact`
        // (jobPosition, department, comm channels, …) without changing the stable __draftId.
        if (typeof newContactObj === 'object' && newContactObj.__isDraft) {
          return newContactObj
        }

        // If existing contact has complete data (jobPosition, department, or pictureThumbnail), keep it
        // This preserves data for newly added contacts that haven't been saved yet
        if (existingContact && typeof existingContact === 'object' && existingContact.name) {
          const hasCompleteData = Boolean(
            existingContact.jobPosition || existingContact.department || existingContact.pictureThumbnail
          )

          if (hasCompleteData) {
            // Keep existing data, but update contactType if present in newContact
            return {
              ...existingContact,
              ...(newContactObj.contactType && { contactType: newContactObj.contactType })
            }
          }
        }

        // Otherwise use the new contact (from accountContacts with full data from backend)
        // This ensures existing contacts get their full data (jobPosition, department, pictureThumbnail)
        return newContactObj
      })
      setInternalValue(merged)
    } else {
      // IDs haven't changed, but data might have been updated
      // Merge: update contactType from value if it changed, but keep other data from internalValue if it exists
      const merged = normalizedValue.map(newContact => {
        const newId = getContactId(newContact)
        const newContactObj =
          typeof newContact === 'object' ? newContact : { id: newContact, name: '', contactType: undefined }
        const existingContact = internalValue.find(c => getContactId(c) === newId)

        // Drafts: see the comment in the `idsChanged` branch above. The dialog can rewrite
        // any field of the embedded `contact` payload while the __draftId stays the same, so
        // returning `existingContact` here would leave the row stuck on stale data (e.g.
        // jobPosition typed in the edit dialog never appearing in the row).
        if (typeof newContactObj === 'object' && newContactObj.__isDraft) {
          return newContactObj
        }

        if (existingContact && typeof existingContact === 'object' && existingContact.name) {
          // Keep existing data, but update contactType if it changed
          if (newContactObj.contactType !== existingContact.contactType) {
            return {
              ...existingContact,
              contactType: newContactObj.contactType
            }
          }
          return existingContact
        }

        return newContactObj
      })
      setInternalValue(merged)
    }
  }, [normalizedValue])

  // Merge existing pre-selected contacts with loaded contacts.
  // Drafts are intentionally excluded from the option source: they should render as selected
  // rows only, never as selectable combobox options.
  React.useEffect(() => {
    const preSelectedContacts: SelectOption[] = []

    // Add existing pre-selected contacts that aren't already in the loaded list
    if (internalValue.length > 0) {
      internalValue.forEach(val => {
        if (isDraftContactValue(val)) {
          return
        }

        if (typeof val === 'object' && val.id && val.name) {
          const existsInLoadedContacts = contacts.some(c => c.id === val.id)
          if (!existsInLoadedContacts) {
            preSelectedContacts.push({
              id: val.id,
              value: val.id,
              label: val.name,
              name: val.name
            })
          }
        }
      })
    }

    // If loading and we have existing contacts, keep them and merge with new ones
    // Otherwise, use the new contacts directly
    if (contactsLoading && mergedContacts.length > 0) {
      // During loading: merge existing contacts with new ones (avoid duplicates)
      const existingIds = new Set(mergedContacts.map(c => c.id))
      const newContacts = contacts.filter(c => !existingIds.has(c.id))
      setMergedContacts([...preSelectedContacts, ...mergedContacts, ...newContacts])
    } else {
      // Not loading or no existing contacts: use new contacts
      setMergedContacts([...preSelectedContacts, ...contacts])
    }
  }, [internalValue, contacts, contactsLoading])

  // Helper to get contact data for display
  // Priority: 0. inline-create draft (full embedded payload), 1. contactValue (if has complete data),
  //           2. accountContacts, 3. mergedContacts, 4. fallback
  const getContactData = (contactValue: string | ContactValue): SelectOption | null => {
    // Priority 0: draft entry — render straight from the embedded contact payload so drafts
    // are visually first-class (same avatar / name / metadata row as saved contacts).
    if (typeof contactValue === 'object' && contactValue.__isDraft) {
      return resolveDraftContactDisplay(contactValue)
    }

    const contactId = getContactId(contactValue)

    // Extract data from contactValue
    const nameFromValue = typeof contactValue === 'object' && contactValue.name ? contactValue.name : null
    const jobPositionFromValue = typeof contactValue === 'object' ? contactValue.jobPosition : undefined
    const departmentFromValue = typeof contactValue === 'object' ? contactValue.department : undefined
    const pictureThumbnailFromValue = typeof contactValue === 'object' ? contactValue.pictureThumbnail : undefined

    // Priority 1: If contactValue has complete data (jobPosition/department/pictureThumbnail), use it
    // This preserves data for newly added contacts
    if (
      typeof contactValue === 'object' &&
      contactValue.name &&
      (jobPositionFromValue || departmentFromValue || pictureThumbnailFromValue)
    ) {
      // Try to get email/phone from accountContacts if available
      const accountContact = accountContacts.find(
        (ac: any) => (ac.contact?.id || ac.contactId || ac.contact) === contactId
      )

      const emailChannel = accountContact?.contact?.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const phoneChannel = accountContact?.contact?.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'PHONE' || ch.communicationChannelRef?.includes(':PHONE')
      )

      return {
        id: contactId,
        value: contactId,
        label: contactValue.name,
        name: contactValue.name,
        pictureThumbnail: pictureThumbnailFromValue,
        extraInfo: {
          email: emailChannel?.value || undefined,
          phone: phoneChannel?.value || undefined,
          jobPosition: jobPositionFromValue,
          department: departmentFromValue
        }
      }
    }

    // Priority 2: Try to find full contact data in accountContacts (for existing contacts with full data)
    const accountContact = accountContacts.find(
      (ac: any) => (ac.contact?.id || ac.contactId || ac.contact) === contactId
    )

    if (accountContact?.contact) {
      const contact = accountContact.contact
      const displayName =
        nameFromValue ||
        contact.displayName ||
        contact.fullName ||
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
        'Unknown Contact'

      // Extract email and phone from communicationChannels
      const emailChannel = contact.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const phoneChannel = contact.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'PHONE' || ch.communicationChannelRef?.includes(':PHONE')
      )

      return {
        id: contactId,
        value: contactId,
        label: displayName,
        name: displayName,
        pictureThumbnail: contact.pictureThumbnail || undefined,
        extraInfo: {
          email: emailChannel?.value || undefined,
          phone: phoneChannel?.value || undefined,
          jobPosition: contact.jobPosition || undefined,
          department: contact.department || undefined
        }
      }
    }

    // Priority 3: Try mergedContacts for additional data (from search results)
    const contactFromMerged = mergedContacts.find(c => c.id === contactId)
    if (contactFromMerged) {
      return {
        ...contactFromMerged,
        label: nameFromValue || contactFromMerged.label || contactFromMerged.name,
        name: nameFromValue || contactFromMerged.name,
        pictureThumbnail: contactFromMerged.pictureThumbnail,
        extraInfo: contactFromMerged.extraInfo
      }
    }

    // Priority 4: Fallback - use name from value if available
    if (nameFromValue) {
      return {
        id: contactId,
        value: contactId,
        label: nameFromValue,
        name: nameFromValue
      }
    }

    return null
  }

  /**
   * Creates a ContactValue object from contact data
   */
  const createContactValue = (contactId: string, contactData: SelectOption): ContactValue => {
    return {
      id: contactId,
      name: contactData.label || contactData.name,
      contactType: undefined,
      pictureThumbnail: contactData.pictureThumbnail,
      jobPosition: contactData.extraInfo?.jobPosition,
      department: contactData.extraInfo?.department
    }
  }

  /**
   * Handles adding a contact in multiple mode (appends to array)
   */
  const handleAddContactMultiple = (newContact: ContactValue) => {
    const newValue = [...internalValue, newContact]
    setInternalValue(newValue)
    onChange(newValue)
  }

  /**
   * Handles adding a contact in single mode (replaces current value)
   */
  const handleAddContactSingle = (newContact: ContactValue) => {
    const newValue = [newContact]
    setInternalValue(newValue)
    onChange(newContact)
  }

  // Handle add contact (appends to array or replaces in single mode)
  const handleAddContact = (contactId: string) => {
    if (!contactId) return

    const selectedContact = mergedContacts.find(c => c.id === contactId)
    if (!selectedContact) {
      // Fallback: try to find in contacts list
      const contactFromList = contacts.find(c => c.id === contactId)
      if (contactFromList) {
        const newContact = createContactValue(contactId, contactFromList)
        if (multiple) {
          handleAddContactMultiple(newContact)
        } else {
          handleAddContactSingle(newContact)
        }
      }
      return
    }

    // Add to existing contacts array with FULL contact data (preserve all fields)
    const newContact = createContactValue(contactId, selectedContact)
    if (multiple) {
      handleAddContactMultiple(newContact)
    } else {
      handleAddContactSingle(newContact)
    }
  }

  // Handle contact type change - uses index instead of ID to avoid closure issues
  const handleContactTypeChange = (index: number, contactType: ContactType | string) => {
    const newValue = internalValue.map((contact, idx) => {
      if (idx === index) {
        return typeof contact === 'object' ? { ...contact, contactType } : { id: contact, name: '', contactType }
      }
      return contact
    })
    setInternalValue(newValue)
    onChange(newValue)
  }

  /**
   * Handles removing a contact in multiple mode (filters out from array)
   */
  const handleRemoveContactMultiple = (contactId: string) => {
    const newValue = internalValue.filter(c => getContactId(c) !== contactId)
    setInternalValue(newValue)
    onChange(newValue)
  }

  /**
   * Handles removing a contact in single mode (clears value)
   */
  const handleRemoveContactSingle = () => {
    setInternalValue([])
    onChange(null)
  }

  // Handle remove contact (filters out or clears in single mode)
  const handleRemoveContact = (contactId: string) => {
    if (multiple) {
      handleRemoveContactMultiple(contactId)
    } else {
      handleRemoveContactSingle()
    }
  }

  // Filter out already selected contacts from available options.
  // Drafts are excluded — their ids are synthetic `__draftId`s that never collide with
  // backend contact ids, and we never want a draft to mask a real contact in the search list.
  const selectedContactIds = new Set(internalValue.filter(c => !isDraftContactValue(c)).map(c => getContactId(c)))
  const availableContactOptions = React.useMemo(() => {
    return mergedContacts
      .filter(c => !selectedContactIds.has(c.id))
      .map((c: SelectOption) => {
        // Combobox only supports string labels, so we build a simple text representation
        const jobPosText = c.extraInfo?.jobPosition ? ` - ${c.extraInfo.jobPosition}` : ''
        const deptText = c.extraInfo?.department ? ` (${c.extraInfo.department})` : ''
        const label = `${c.label || c.name}${jobPosText}${deptText}`

        return {
          value: c.id,
          label
        } as any
      })
  }, [mergedContacts, selectedContactIds])

  // Determine empty text
  const getEmptyText = () => {
    if (contactsLoading) {
      return 'Loading...'
    }
    return 'No contacts found'
  }

  return (
    <div className="gba:space-y-4 gba:w-full gba:min-w-0" data-testid={dataTestId || 'contact-list'}>
      {/* Contact Cards List */}
      {internalValue.length > 0 && (
        <div
          className="gba:space-y-2 gba:w-full gba:min-w-0"
          data-testid={formatDataTestId(dataTestId || 'contact-list', 'cards-list')}
        >
          {internalValue.map((contactValue, index) => {
            const contactId = getContactId(contactValue)
            const contactData = getContactData(contactValue)
            const isDraft = isDraftContactValue(contactValue)

            // Fallback: if contactData is null, try to use the name from contactValue directly
            const displayName =
              contactData?.label ||
              contactData?.name ||
              (typeof contactValue === 'object' ? contactValue.name : null) ||
              'Unknown Contact'
            const jobPosition = contactData?.extraInfo?.jobPosition || ''
            const department = contactData?.extraInfo?.department || ''
            const pictureThumbnail = contactData?.pictureThumbnail || undefined
            const contactType = typeof contactValue === 'object' ? contactValue.contactType : undefined

            if (!contactData && typeof contactValue !== 'object') return null

            const initials = displayName
              .split(' ')
              .map((p: string) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            const draftKey = isDraft ? contactValue.__draftId : undefined
            const rowKey = draftKey || contactId || `contact-${index}`

            // Draft differentiation: name renders in cyan, plus a "Draft" tooltip on hover.
            const nameNode = (
              <h4
                className={`gba:text-sm gba:font-semibold gba:truncate ${isDraft ? 'gba:text-cyan-600' : ''}`}
                title={displayName}
                data-testid={formatDataTestId(dataTestId || 'contact-list', `contact-name-${index}`)}
              >
                {displayName}
              </h4>
            )

            return (
              <div
                key={rowKey}
                className="gba:flex gba:items-center gba:gap-3 gba:py-2 gba:w-full gba:min-w-0 gba:overflow-hidden"
                data-draft={isDraft || undefined}
                data-testid={formatDataTestId(dataTestId || 'contact-list', `contact-card-${index}`)}
              >
                {/* Avatar */}
                <Avatar className="gba:flex-shrink-0" size="sm">
                  {pictureThumbnail ? (
                    <AvatarImage src={`data:image/gif;base64,${pictureThumbnail}`} alt={displayName} />
                  ) : (
                    <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
                  )}
                </Avatar>

                {/* Name, Job Position, Department - flex-1 min-w-0 so name truncates within available width */}
                <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                    {isDraft ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{nameNode}</TooltipTrigger>
                        <TooltipContent
                          data-testid={formatDataTestId(dataTestId || 'contact-list', `draft-tooltip-${index}`)}
                        >
                          {t('draft-tooltip')}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      nameNode
                    )}
                  </div>
                  {(jobPosition || department) && (
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:mt-1 gba:text-xs gba:min-w-0 gba:overflow-hidden">
                      {jobPosition && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Briefcase className="gba:w-3 gba:h-3" />
                          {jobPosition}
                        </span>
                      )}
                      {jobPosition && department && <span>·</span>}
                      {department && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Building2 className="gba:w-3 gba:h-3" />
                          {department}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact Type Select - fixed width, never shrink */}
                {showContactType ? (
                  <div className="gba:w-36 gba:flex-shrink-0 gba:min-w-0">
                    <Select
                      value={contactType || ''}
                      onValueChange={value => handleContactTypeChange(index, value)}
                      data-testid={formatDataTestId(dataTestId || 'contact-list', `contact-type-${index}`)}
                    >
                      <SelectTrigger className="gba:w-full gba:min-w-0 gba:text-sm">
                        <SelectValue placeholder="Select type..." className="gba:truncate">
                          {contactType ? getContactTypeLabel(contactType, { compact: true }) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ContactType.PRIMARY_CONTACT}>
                          {getContactTypeLabel(ContactType.PRIMARY_CONTACT)}
                        </SelectItem>
                        <SelectItem value={ContactType.SECONDARY_CONTACT}>
                          {getContactTypeLabel(ContactType.SECONDARY_CONTACT)}
                        </SelectItem>
                        <SelectItem value={ContactType.FOUNDER_CONTACT}>
                          {getContactTypeLabel(ContactType.FOUNDER_CONTACT)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {/* Edit Draft Button - slot is reserved so type selects align across rows */}
                <div className="gba:w-10 gba:flex-shrink-0 gba:flex gba:justify-center">
                  {isDraft && onEditDraft && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditDraft(index)}
                      data-testid={formatDataTestId(dataTestId || 'contact-list', `edit-draft-${index}`)}
                      aria-label={`Edit ${displayName}`}
                    >
                      <PencilIcon className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveContact(contactId)}
                  className="gba:flex-shrink-0 gba:text-destructive hover:gba:text-destructive/80"
                  data-testid={formatDataTestId(dataTestId || 'contact-list', `remove-contact-${index}`)}
                  aria-label={`Remove ${displayName}`}
                >
                  <XIcon className="gba:w-4 gba:h-4 gba:text-destructive gba:stroke-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Combobox for adding contacts (with optional inline-create "+" button) - always visible */}
      <div className="gba:flex gba:items-stretch gba:gap-2">
        <div className="gba:flex-1 gba:min-w-0">
          <Combobox
            value=""
            onValueChange={handleAddContact}
            options={availableContactOptions}
            placeholder="Search and select contact..."
            searchPlaceholder="Type to search..."
            emptyText={getEmptyText()}
            disabled={Boolean(disabled) || contactsLoading}
            loading={contactsLoading}
            onSearch={searchContacts}
            searchDebounce={300}
            hasMore={Boolean(hasMore)}
            onLoadMore={onLoadMore}
            data-testid={formatDataTestId(dataTestId || 'contact-list', 'add-contact-combobox')}
          />
        </div>
        {onCreateNew && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={onCreateNew}
            disabled={Boolean(disabled)}
            aria-label="Create new contact"
            data-testid={formatDataTestId(dataTestId || 'contact-list', 'create-new-contact')}
          >
            <PlusIcon className="gba:w-4 gba:h-4" />
          </Button>
        )}
      </div>

      {/* Error Display */}
      {(error || contactsError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || contactsError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ContactSelect
