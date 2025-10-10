import React, { useState, useEffect, useRef } from 'react'
import { SelectOption } from '../types'

interface CustomSelectProps {
  name: string
  value?: string
  onChange: (e: { value: string; name: string }) => void
  data: SelectOption[]
  placeholder?: string
  showSearch?: boolean
  onSearch?: (searchTerm: string) => void
  debounce?: number
  loading?: boolean
  disabled?: boolean
  onPopupScrollEnd?: () => void
  hasMore?: boolean
  allowClear?: boolean
  style?: React.CSSProperties
  'data-testid'?: string
  onFocus?: () => void // For lazy loading trigger
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  name,
  value,
  onChange,
  data,
  placeholder = 'Please select...',
  showSearch = false,
  onSearch,
  debounce = 300,
  loading = false,
  disabled = false,
  onPopupScrollEnd,
  hasMore = false,
  allowClear = false,
  style = {},
  'data-testid': dataTestId,
  onFocus
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredData, setFilteredData] = useState<SelectOption[]>(data)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update filtered data when data prop changes
  useEffect(() => {
    setFilteredData(data)
    if (data.length > 0 && searchTerm) {
      // Filter data based on current search term
      const filtered = data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      setFilteredData(filtered)
    }
  }, [data, searchTerm])

  // Handle search with debouncing
  const handleSearch = (term: string) => {
    setSearchTerm(term)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(term)
      } else {
        // Local filtering if no onSearch provided
        const filtered = data.filter(item => item.name.toLowerCase().includes(term.toLowerCase()))
        setFilteredData(filtered)
      }
    }, debounce)
  }

  // Handle selection
  const handleSelect = (item: SelectOption) => {
    onChange({ value: item.value, name })
    setIsOpen(false)
    setSearchTerm('')
  }

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({ value: '', name })
    setSearchTerm('')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get selected item for display
  const selectedItem = data.find(item => item.value === value)

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }} data-testid={dataTestId}>
      {/* Main Select Box */}
      <div
        style={{
          minHeight: '32px',
          padding: 'var(--nw-spacing-1) var(--nw-spacing-3)',
          border: `1px solid var(--nw-color-border)`,
          borderRadius: 'var(--nw-radius-md)',
          backgroundColor: disabled ? 'var(--nw-color-muted)' : 'var(--nw-color-background)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        onClick={() => {
          if (!disabled) {
            // Trigger lazy loading when opening dropdown for the first time
            if (!isOpen && onFocus) {
              onFocus()
            }
            setIsOpen(!isOpen)
          }
        }}
      >
        <span
          style={{
            color: selectedItem ? 'var(--nw-color-foreground)' : 'var(--nw-color-muted-foreground)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {selectedItem ? selectedItem.name : placeholder}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nw-spacing-1)' }}>
          {loading && (
            <div
              style={{
                width: '14px',
                height: '14px',
                border: `2px solid var(--nw-color-muted)`,
                borderTop: `2px solid var(--nw-color-primary)`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
          )}

          {allowClear && selectedItem && !loading && (
            <span
              style={{
                cursor: 'pointer',
                color: 'var(--nw-color-muted-foreground)',
                fontSize: '12px',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={handleClear}
            >
              ✕
            </span>
          )}

          <span
            style={{
              color: 'var(--nw-color-muted-foreground)',
              fontSize: '0.75rem'
            }}
          >
            {isOpen ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'var(--nw-color-card)',
            border: `1px solid var(--nw-color-border)`,
            borderRadius: 'var(--nw-radius-md)',
            boxShadow: 'var(--nw-shadow-md)',
            maxHeight: '200px',
            overflow: 'auto'
          }}
        >
          {/* Search Input */}
          {showSearch && (
            <div style={{ padding: 'var(--nw-spacing-2)' }}>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search..."
                autoFocus
                style={{
                  width: '100%',
                  padding: 'var(--nw-spacing-1) var(--nw-spacing-2)',
                  border: `1px solid var(--nw-color-input)`,
                  borderRadius: 'var(--nw-radius-sm)',
                  outline: 'none',
                  backgroundColor: 'var(--nw-color-background)',
                  color: 'var(--nw-color-foreground)'
                }}
              />
            </div>
          )}

          {/* Options */}
          <div>
            {filteredData.length === 0 ? (
              <div
                style={{
                  padding: 'var(--nw-spacing-2) var(--nw-spacing-3)',
                  color: 'var(--nw-color-muted-foreground)',
                  textAlign: 'center'
                }}
              >
                {loading ? 'Loading...' : 'No data'}
              </div>
            ) : (
              filteredData.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: 'var(--nw-spacing-2) var(--nw-spacing-3)',
                    cursor: 'pointer',
                    backgroundColor: value === item.value ? 'var(--nw-color-accent)' : 'transparent',
                    borderLeft: value === item.value ? '3px solid var(--nw-color-primary)' : '3px solid transparent',
                    color: 'var(--nw-color-foreground)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--nw-color-muted)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor =
                      value === item.value ? 'var(--nw-color-accent)' : 'transparent'
                  }}
                  onClick={() => handleSelect(item)}
                >
                  {item.name}
                </div>
              ))
            )}
          </div>

          {/* Load More */}
          {onPopupScrollEnd && hasMore && !loading && (
            <div style={{ padding: 'var(--nw-spacing-2)', textAlign: 'center' }}>
              <button
                onClick={onPopupScrollEnd}
                style={{
                  background: 'none',
                  border: `1px solid var(--nw-color-border)`,
                  borderRadius: 'var(--nw-radius-sm)',
                  padding: 'var(--nw-spacing-1) var(--nw-spacing-2)',
                  cursor: 'pointer',
                  color: 'var(--nw-color-primary)',
                  backgroundColor: 'var(--nw-color-background)'
                }}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
