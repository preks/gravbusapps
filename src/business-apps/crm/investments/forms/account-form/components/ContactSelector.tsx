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
  value: string[];
  onChange: (contactIds: string[]) => void;
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
  
  const {
    contacts,
    isLoading: contactsLoading,
    hasMore: contactsHasMore,
    error: contactsError,
    searchContacts,
    loadMoreContacts,
  } = useAccountFormContext();

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
  const handleContactSelect = (contactId: string) => {
    if (value.includes(contactId)) {
      // Remove contact if already selected (deselect)
      onChange([]);
    } else {
      // Select only this contact (single selection)
      onChange([contactId]);
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
        value={value.length > 0 ? value[0] : ""}
        onValueChange={(selectedValue) => {
          if (selectedValue && selectedValue !== value[0]) {
            onChange([selectedValue]);
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
            {contacts.map((contact) => (
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
