import React, { useCallback } from 'react'
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Combobox,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { User } from 'lucide-react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { ContactTypeLabels } from '@/common/data/relations/constants/contactConstants'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface ContactSegmentOption {
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
  }
}

interface ContactSegmentProps {
  // Field array name in form (e.g., "opportunityContacts")
  fieldArrayName: string

  // Contact ID field name in junction table (e.g., "contactId")
  contactIdFieldName: string

  // Contact type field name in junction table (e.g., "contactType")
  contactTypeFieldName: string

  // Contact search results
  contacts: ContactSegmentOption[]
  contactsLoading: boolean
  contactsError: string | null
  searchContacts: (search: string) => void

  // Contact relations with full data (for display)
  contactRelations?: any[]

  // Test ID prefix
  dataTestId?: string

  // Disabled state
  disabled?: boolean

  // Error message
  error?: string | null
}

// Separate component for each contact item
const ContactItem: React.FC<{
  fieldArrayName: string
  contactIdFieldName: string
  contactTypeFieldName: string
  contactIndex: number
  contactRelations: any[]
  contacts: ContactSegmentOption[]
  onRemove: () => void
  dataTestId?: string
  disabled?: boolean
}> = ({
  fieldArrayName,
  contactIdFieldName,
  contactTypeFieldName,
  contactIndex,
  contactRelations,
  contacts,
  onRemove,
  dataTestId,
  disabled
}) => {
  const form = useFormContext<any>()

  // Watch the contact ID to get display data
  const contactId = form.watch(`${fieldArrayName}.${contactIndex}.${contactIdFieldName}`)

  // Get contact display data from contactRelations (junction table records) or contacts (search results)
  const contactData = React.useMemo(() => {
    // First, try to find in contactRelations (junction table with nested data)
    const contactRelation = contactRelations.find((cr: any) => {
      const id = cr.contact?.id || cr.contactId
      return id === contactId
    })

    // Extract contact object
    const contact = contactRelation?.contact

    if (contact) {
      const displayName =
        contact.displayName ||
        contact.fullName ||
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
        'Unknown Contact'

      return {
        name: displayName,
        pictureThumbnail: contact.pictureThumbnail,
        jobPosition: contact.jobPosition,
        department: contact.department,
        email: contact.email,
        phone: contact.phone
      }
    }

    // Fallback: search in contacts array (from search results)
    const searchContact = contacts.find(c => c.id === contactId)
    if (searchContact) {
      return {
        name: searchContact.name || searchContact.label,
        pictureThumbnail: searchContact.pictureThumbnail,
        jobPosition: searchContact.extraInfo?.jobPosition,
        department: searchContact.extraInfo?.department,
        email: searchContact.extraInfo?.email,
        phone: searchContact.extraInfo?.phone
      }
    }

    return {
      name: 'Unknown Contact',
      pictureThumbnail: undefined,
      jobPosition: undefined,
      department: undefined,
      email: undefined,
      phone: undefined
    }
  }, [contactId, contactRelations, contacts])

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:py-2">
      {/* Avatar */}
      <Avatar className="gba:flex-shrink-0" size="sm">
        {contactData.pictureThumbnail ? (
          <AvatarImage src={`data:image/gif;base64,${contactData.pictureThumbnail}`} alt={contactData.name} />
        ) : (
          <AvatarFallback>
            <User className="gba:h-4 gba:w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      {/* Contact Info */}
      <div className="gba:flex-1 gba:min-w-0">
        <h4 className="gba:text-sm gba:font-semibold gba:truncate">{contactData.name}</h4>
        {(contactData.jobPosition || contactData.department) && (
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
            {[contactData.jobPosition, contactData.department].filter(Boolean).join(' • ')}
          </div>
        )}
      </div>

      {/* Contact Type Select */}
      <div className="gba:w-48">
        <FormField
          control={form.control}
          name={`${fieldArrayName}.${contactIndex}.${contactTypeFieldName}`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select value={field.value || ''} onValueChange={v => field.onChange(v || '')} disabled={disabled}>
                  <SelectTrigger
                    data-testid={formatDataTestId(dataTestId || 'contact-segment', `contact-type-${contactIndex}`)}
                  >
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ContactTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="gba:flex-shrink-0 gba:text-destructive hover:gba:text-destructive/80"
        data-testid={formatDataTestId(dataTestId || 'contact-segment', `remove-contact-${contactIndex}`)}
        aria-label={`Remove ${contactData.name}`}
        disabled={disabled}
      >
        <XIcon className="gba:w-4 gba:h-4" />
      </Button>
    </div>
  )
}

const ContactSegment: React.FC<ContactSegmentProps> = ({
  fieldArrayName,
  contactIdFieldName,
  contactTypeFieldName,
  contacts,
  contactsLoading,
  contactsError,
  searchContacts,
  contactRelations = [],
  dataTestId = 'contact-segment',
  disabled = false,
  error
}) => {
  const form = useFormContext<any>()

  // Use field array for multiple contacts
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: fieldArrayName
  })

  // Get list of selected contact IDs
  const selectedContactIds = React.useMemo(() => {
    return new Set(fields.map((field: any) => field[contactIdFieldName]))
  }, [fields, contactIdFieldName])

  // Filter out already selected contacts
  const availableContacts = React.useMemo(() => {
    return contacts
      .filter(contact => !selectedContactIds.has(contact.id))
      .map(contact => ({
        value: contact.id,
        label: contact.extraInfo?.jobPosition ? `${contact.label} - ${contact.extraInfo.jobPosition}` : contact.label
      }))
  }, [contacts, selectedContactIds])

  // Handle add contact
  const handleAddContact = useCallback(
    (contactId: string) => {
      if (!contactId) return

      const selectedContact = contacts.find(c => c.id === contactId)
      if (!selectedContact) return

      // Create new contact association - only store IDs, not nested objects
      // Display data comes from contactRelations prop (from GraphQL) or contacts search results
      const newContact: any = {
        [contactIdFieldName]: contactId,
        [contactTypeFieldName]: null
      }

      append(newContact)
    },
    [contacts, contactIdFieldName, contactTypeFieldName, append]
  )

  // Get empty text for combobox
  const getEmptyText = () => {
    if (contactsLoading) return 'Loading...'
    if (contactsError) return 'Error loading contacts'
    return 'No contacts found'
  }

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      {/* Selected Contacts List */}
      {fields.length > 0 && (
        <div className="gba:space-y-0" data-testid={formatDataTestId(dataTestId, 'selected-list')}>
          {fields.map((field, index) => (
            <ContactItem
              key={field.id}
              fieldArrayName={fieldArrayName}
              contactIdFieldName={contactIdFieldName}
              contactTypeFieldName={contactTypeFieldName}
              contactIndex={index}
              contactRelations={contactRelations}
              contacts={contacts}
              onRemove={() => remove(index)}
              dataTestId={dataTestId}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Combobox for adding contacts */}
      <Combobox
        value=""
        onValueChange={handleAddContact}
        options={availableContacts}
        placeholder="Search and select contact..."
        searchPlaceholder="Type to search..."
        emptyText={getEmptyText()}
        disabled={disabled || contactsLoading}
        loading={contactsLoading}
        onSearch={searchContacts}
        data-testid={formatDataTestId(dataTestId, 'add-contact-combobox')}
      />

      {/* Error Display */}
      {(error || contactsError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || contactsError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ContactSegment
