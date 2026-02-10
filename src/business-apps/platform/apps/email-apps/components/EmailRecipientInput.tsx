/**
 * EmailRecipientInput - Tag-based input with auto-suggest from company directory.
 * Shows chips for added recipients, dropdown suggestions as user types,
 * supports keyboard navigation, paste, and manual email entry.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { X, Users, Clock } from 'lucide-react'
import type { EmailContact, EmailAddress } from '../types'

interface EmailRecipientInputProps {
  recipients: EmailAddress[]
  onChange: (recipients: EmailAddress[]) => void
  searchContacts: (query: string) => EmailContact[]
  placeholder?: string
  'data-testid'?: string
}

function getInitials(name: string): string {
  return name
    .split(/[\s@.]/)
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export const EmailRecipientInput: React.FC<EmailRecipientInputProps> = ({
  recipients,
  onChange,
  searchContacts,
  placeholder = 'Type a name or email...',
  'data-testid': testId = 'recipient-input'
}) => {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<EmailContact[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Update suggestions as user types
  useEffect(() => {
    const results = searchContacts(inputValue)
    // Filter out already-added recipients
    const filtered = results.filter(r => !recipients.some(rec => rec.address.toLowerCase() === r.email.toLowerCase()))
    setSuggestions(filtered)
    setHighlightedIndex(-1)
  }, [inputValue, searchContacts, recipients])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addRecipient = useCallback(
    (contact: EmailContact | EmailAddress) => {
      const email = 'email' in contact ? contact.email : contact.address
      const name = 'email' in contact ? contact.name : contact.name
      if (recipients.some(r => r.address.toLowerCase() === email.toLowerCase())) return

      onChange([...recipients, { name: name || undefined, address: email }])
      setInputValue('')
      setShowDropdown(false)
      inputRef.current?.focus()
    },
    [recipients, onChange]
  )

  const removeRecipient = useCallback(
    (email: string) => {
      onChange(recipients.filter(r => r.address !== email))
    },
    [recipients, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
        setShowDropdown(true)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, -1))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          e.preventDefault()
          addRecipient(suggestions[highlightedIndex])
        } else if (inputValue.trim() && isValidEmail(inputValue.trim())) {
          e.preventDefault()
          addRecipient({ id: `manual_${inputValue}`, name: '', email: inputValue.trim(), source: 'manual' })
        } else if (e.key === 'Tab') {
          setShowDropdown(false)
          return // Let tab navigate normally
        }
      } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
        removeRecipient(recipients[recipients.length - 1].address)
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
      } else if (e.key === ',' || e.key === ';') {
        e.preventDefault()
        if (inputValue.trim() && isValidEmail(inputValue.trim())) {
          addRecipient({ id: `manual_${inputValue}`, name: '', email: inputValue.trim(), source: 'manual' })
        }
      }
    },
    [highlightedIndex, suggestions, inputValue, recipients, addRecipient, removeRecipient]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData('text')
      if (pasted.includes(',') || pasted.includes(';') || pasted.includes('\n')) {
        e.preventDefault()
        const emails = pasted
          .split(/[,;\n]+/)
          .map(s => s.trim())
          .filter(isValidEmail)

        const newRecipients = emails
          .filter(email => !recipients.some(r => r.address.toLowerCase() === email.toLowerCase()))
          .map(email => ({ address: email }))

        if (newRecipients.length > 0) {
          onChange([...recipients, ...newRecipients])
        }
      }
    },
    [recipients, onChange]
  )

  return (
    <div className="gba:relative gba:flex-1" ref={dropdownRef} data-testid={testId}>
      {/* Input area with chips */}
      <div
        className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:min-h-8 gba:px-2 gba:py-1 gba:border gba:rounded gba:bg-background gba:cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {recipients.map(r => (
          <Badge key={r.address} variant="secondary" className="gba:gap-1 gba:pr-1 gba:max-w-[200px]">
            <span className="gba:truncate gba:text-xs">{r.name || r.address}</span>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                removeRecipient(r.address)
              }}
              className="gba:rounded-full gba:hover:bg-muted gba:p-0.5 gba:flex-shrink-0"
              data-testid={`${testId}-remove-${r.address}`}
            >
              <X className="gba:w-3 gba:h-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={recipients.length === 0 ? placeholder : ''}
          className="gba:flex-1 gba:min-w-32 gba:h-6 gba:text-sm gba:bg-transparent gba:outline-none gba:border-0 gba:p-0"
          data-testid={`${testId}-input`}
        />
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="gba:absolute gba:z-50 gba:left-0 gba:right-0 gba:mt-1 gba:bg-popover gba:border gba:rounded-lg gba:max-h-60 gba:overflow-y-auto">
          {suggestions.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:text-left gba:transition-colors ${
                index === highlightedIndex ? 'gba:bg-accent' : 'hover:gba:bg-muted/50'
              }`}
              onClick={() => addRecipient(contact)}
              onMouseEnter={() => setHighlightedIndex(index)}
              data-testid={`${testId}-suggestion-${index}`}
            >
              <Avatar className="gba:w-7 gba:h-7 gba:flex-shrink-0">
                <AvatarFallback className="gba:text-[10px] gba:bg-primary/10 gba:text-primary">
                  {getInitials(contact.name || contact.email)}
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                    {contact.name || contact.email.split('@')[0]}
                  </span>
                  {contact.source === 'recent' && (
                    <Clock className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
                  )}
                  {contact.source === 'directory' && (
                    <Users className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
                  )}
                </div>
                <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:block">
                  {contact.email}
                  {contact.department && ` \u00B7 ${contact.department}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
