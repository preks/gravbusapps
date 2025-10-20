import React, { useState, useEffect } from 'react'
import { Combobox, Label, Alert, AlertDescription, Badge } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  extraInfo?: {
    email?: string
    jobPosition?: string
    organizationalUnit?: string
  }
}

interface ContactSelectProps {
  value: Array<string | { id: string; name: string }>
  onChange: (contactIds: Array<string | { id: string; name: string }>) => void
  dataTestId?: string
  error?: string | null

  // Contact data passed as props
  contacts: SelectOption[]
  contactsLoading: boolean
  contactsError: string | null
  searchContacts: (search: string) => void
}

const ContactSelect: React.FC<ContactSelectProps> = ({
  value,
  onChange,
  dataTestId,
  error,
  contacts,
  contactsLoading,
  contactsError,
  searchContacts
}) => {
  const [mergedContacts, setMergedContacts] = useState<SelectOption[]>([])

  // Merge pre-selected contacts with loaded contacts
  useEffect(() => {
    const preSelectedContacts: SelectOption[] = []

    // Add pre-selected contacts that aren't already in the loaded list
    if (value.length > 0) {
      value.forEach(val => {
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

    // Merge: pre-selected contacts first, then loaded contacts
    setMergedContacts([...preSelectedContacts, ...contacts])
  }, [value, contacts])

  // Helper function to extract ID from value (string or object)
  const getContactId = (contactValue: string | { id: string; name: string }): string => {
    return typeof contactValue === 'object' ? contactValue.id : contactValue
  }

  // Helper to get contact name for display
  const getContactName = (contactValue: string | { id: string; name: string }): string => {
    if (typeof contactValue === 'object' && contactValue.name) {
      return contactValue.name
    }

    // Try to find in the merged contacts list
    const contact = mergedContacts.find(c => c.id === contactValue)
    return contact?.label || 'Unknown Contact'
  }

  // Handle add contact (appends to array)
  const handleAddContact = (contactId: string) => {
    if (!contactId) return

    const selectedContact = mergedContacts.find(c => c.id === contactId)
    if (!selectedContact) return

    // Add to existing contacts array
    onChange([...value, { id: contactId, name: selectedContact.label }])
  }

  // Handle remove contact (filters out)
  const handleRemoveContact = (contactId: string) => {
    onChange(value.filter(c => getContactId(c) !== contactId))
  }

  // Filter out already selected contacts from available options
  const selectedContactIds = new Set(value.map(c => getContactId(c)))
  const availableContactOptions = mergedContacts
    .filter(c => !selectedContactIds.has(c.id as string))
    .map(c => ({ value: c.id as string, label: c.label }))

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Related Contacts</Label>

      {/* Combobox for adding contacts */}
      <Combobox
        value=""
        onValueChange={handleAddContact}
        options={availableContactOptions}
        placeholder="Add contact..."
        searchPlaceholder="Search contacts..."
        emptyText={contactsLoading ? 'Loading...' : 'No contacts found'}
        disabled={contactsLoading}
        loading={contactsLoading}
        onSearch={searchContacts}
        data-testid={dataTestId || 'contact-selector'}
      />

      {/* Selected contacts displayed as badges */}
      {value.length > 0 && (
        <div
          className="gba:space-y-2 gba:mt-3"
          data-testid={formatDataTestId(dataTestId || 'contact-selector', 'selected-list')}
        >
          {value.map((contact, index) => {
            const contactId = getContactId(contact)
            const contactName = getContactName(contact)
            return (
              <div
                key={contactId}
                className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:border gba:rounded gba:bg-card"
                data-testid={formatDataTestId(dataTestId || 'contact-selector', `selected-contact-${index}`)}
              >
                <Badge variant="secondary" className="gba:flex-1">
                  {contactName}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleRemoveContact(contactId)}
                  className="gba:flex-shrink-0 gba:text-destructive hover:gba:text-destructive/80"
                  data-testid={formatDataTestId(dataTestId || 'contact-selector', `remove-contact-${index}`)}
                  aria-label={`Remove ${contactName}`}
                >
                  <X className="gba:h-4 gba:w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

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
