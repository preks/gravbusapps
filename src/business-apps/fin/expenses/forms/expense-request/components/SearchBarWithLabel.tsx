import React, { useState, useRef, useEffect } from 'react'
import { XCircleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

interface SearchBarWithLabelProps {
  onSearch: (value: string) => void
  placeholder?: string
  label?: string
  /** When true, the search input is always visible with placeholder (no click to expand) */
  alwaysExpanded?: boolean
}

/**
 * SearchBar component with label that disappears when expanded
 */
const SearchBarWithLabel: React.FC<SearchBarWithLabelProps> = ({
  onSearch,
  placeholder = 'Search...',
  label,
  alwaysExpanded = false
}) => {
  const [expanded, setExpanded] = useState(alwaysExpanded)
  const effectiveExpanded = alwaysExpanded || expanded
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(inputValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, onSearch])

  useEffect(() => {
    if (effectiveExpanded && inputRef.current && !alwaysExpanded) {
      inputRef.current.focus()
    }
  }, [effectiveExpanded, alwaysExpanded])
  useEffect(() => {
    if (alwaysExpanded) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (expanded && !inputValue) {
          setExpanded(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [alwaysExpanded, expanded, inputValue])

  const handleClick = () => {
    if (!alwaysExpanded) setExpanded(true)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInputValue('')
    onSearch('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (!effectiveExpanded && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      handleClick()
    }
  }

  const handleClearKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      handleClear(e as any)
    }
  }

  return (
    <div className="gba:flex gba:items-center" style={{ gap: '12px' }} data-testid="search-bar-with-label-container">
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: '40px',
          padding: '4px 8px',
          transition: 'width 0.3s, padding 0.3s, background-color 0.3s',
          cursor: 'pointer',
          width: effectiveExpanded ? '300px' : '44px',
          border: '2px solid border',
          background: effectiveExpanded ? 'muted' : 'border',
          position: 'relative',
          overflow: 'hidden',
          height: '32px',
          justifyContent: effectiveExpanded ? 'flex-start' : 'center'
        }}
        onClick={handleClick}
        onKeyDown={handleContainerKeyDown}
        role="button"
        tabIndex={effectiveExpanded ? -1 : 0}
        aria-label={effectiveExpanded ? undefined : 'Expand search'}
        ref={containerRef}
        data-testid="plan-search-bar"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={placeholder}
          style={{
            border: 'none',
            outline: 'none',
            width: effectiveExpanded ? '100%' : '0',
            opacity: effectiveExpanded ? '1' : '0',
            transition: 'opacity 0.3s, width 0.3s',
            backgroundColor: 'transparent',
            paddingLeft: '30px',
            color: 'foreground'
          }}
          data-testid="plan-search-input"
        />
        {inputValue && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: '1'
            }}
            onClick={handleClear}
            onKeyDown={handleClearKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Clear search"
            data-testid="plan-search-clear"
          >
            <XCircleIcon data-testid="plan-search-clear-icon" />
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            position: 'absolute',
            right: effectiveExpanded ? 'auto' : '12px',
            left: effectiveExpanded ? '10px' : 'auto',
            transition: 'right 0.3s, left 0.3s'
          }}
          data-testid="plan-search-icon-container"
        >
          <MagnifyingGlassIcon data-testid="plan-search-icon" />
        </div>
      </div>
      {!effectiveExpanded && label ? (
        <div
          style={{ fontSize: '14px', fontWeight: 'bold', color: 'foreground', whiteSpace: 'nowrap' }}
          data-testid="plan-count-text"
        >
          {label}
        </div>
      ) : null}
    </div>
  )
}

export default SearchBarWithLabel
