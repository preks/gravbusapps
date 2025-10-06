import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Button,
  Alert,
  AlertDescription,
} from '@newwork/nw-design-system';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { SelectOption } from '../types';
import { useAccountFormContext } from '../context/AccountFormContext';

interface ContactSelectorProps {
  value: Array<string | { id: string; name: string }>;
  onChange: (contactIds: Array<string | { id: string; name: string }>) => void;
  dataTestId?: string;
  error?: string | null;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({
  value,
  onChange,
  dataTestId,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mergedContacts, setMergedContacts] = useState<SelectOption[]>([]);
  
  const {
    contacts,
    isLoading: contactsLoading,
    hasMore: contactsHasMore,
    error: contactsError,
    searchContacts,
    loadMoreContacts,
  } = useAccountFormContext();

  // Merge pre-selected contacts with loaded contacts
  useEffect(() => {
    const preSelectedContacts: SelectOption[] = [];
    
    // Add pre-selected contact if it has name and isn't already in the list
    if (value.length > 0) {
      const firstValue = value[0];
      if (typeof firstValue === 'object' && firstValue.id && firstValue.name) {
        const existsInLoadedContacts = contacts.some(c => c.id === firstValue.id);
        if (!existsInLoadedContacts) {
          preSelectedContacts.push({
            id: firstValue.id,
            value: firstValue.id,
            label: firstValue.name,
            name: firstValue.name,
          });
        }
      }
    }
    
    // Merge: pre-selected contacts first, then loaded contacts
    setMergedContacts([...preSelectedContacts, ...contacts]);
  }, [value, contacts]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchContacts(term);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (contactsHasMore && !contactsLoading) {
      loadMoreContacts();
    }
  };

  // Handle contact selection
  // Helper function to extract ID from value (string or object)
  const getContactId = (contactValue: string | { id: string; name: string }): string => {
    return typeof contactValue === 'object' ? contactValue.id : contactValue;
  };

  // Get current contact ID
  const currentContactId = value.length > 0 ? getContactId(value[0]) : '';

  // Helper to get contact name for display
  const getContactLabel = (): string | undefined => {
    if (value.length === 0) return undefined;
    
    const firstValue = value[0];
    if (typeof firstValue === 'object' && firstValue.name) {
      return firstValue.name;
    }
    
    // Try to find in the merged contacts list
    const contact = mergedContacts.find(c => c.id === currentContactId);
    return contact?.label;
  };

  const handleContactSelect = (contactId: string) => {
    if (currentContactId === contactId) {
      // Remove contact if already selected (deselect)
      onChange([]);
    } else {
      // Select only this contact (single selection)
      // Find the full contact object to store
      const selectedContact = mergedContacts.find(c => c.id === contactId);
      if (selectedContact) {
        onChange([{ id: contactId, name: selectedContact.label }]);
      } else {
        onChange([contactId]);
      }
    }
  };

  // Handle remove contact
  const handleRemoveContact = (contactId: string) => {
    // For single selection, just clear the selection
    onChange([]);
  };

  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
        Related Contact
      </Label>
      
      <Select
        value={currentContactId}
        onValueChange={(selectedValue) => {
          if (selectedValue && selectedValue !== currentContactId) {
            const selectedContact = mergedContacts.find(c => c.id === selectedValue);
            if (selectedContact) {
              onChange([{ id: selectedValue, name: selectedContact.label }]);
            } else {
              onChange([selectedValue]);
            }
          }
        }}
        open={isOpen}
        onOpenChange={setIsOpen}
        data-testid={dataTestId || 'contact-selector'}
      >
        <SelectTrigger className="gba:border-gray-300 gba:bg-white">
          <SelectValue placeholder="Search and select contact..." />
        </SelectTrigger>
        <SelectContent className="gba:border-gray-300 gba:bg-white">
          {/* Search Input */}
          <div
            className="gba:p-2 gba:border-b gba:border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gba:relative">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                <PiMagnifyingGlass className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="gba:w-full gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
                style={{ paddingLeft: "28px" }}
                data-testid={formatDataTestId(dataTestId || 'contact-selector', 'search-input')}
                autoFocus
              />
            </div>
          </div>

          {/* Contact Options */}
          <div className="gba:max-h-48 gba:overflow-y-auto">
            {mergedContacts.map((contact) => (
              <SelectItem
                key={contact.id}
                value={contact.value}
                data-testid={formatDataTestId(dataTestId || 'contact-selector', `contact-option-${contact.value}`)}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                  <span className="gba:truncate">{contact.label}</span>
                </div>
              </SelectItem>
            ))}
          </div>

          {/* Load More Button */}
          {contactsHasMore && (
            <div className="gba:px-3 gba:py-2 gba:border-t gba:border-gray-200">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                className="gba:w-full gba:text-blue-600 gba:hover:bg-blue-50"
                data-testid={formatDataTestId(dataTestId || 'contact-selector', 'load-more-button')}
              >
                Load more
              </Button>
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Error Display */}
      {(error || contactsError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error || contactsError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ContactSelector;
