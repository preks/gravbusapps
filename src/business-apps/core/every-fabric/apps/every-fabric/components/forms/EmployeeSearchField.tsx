import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, CaretDownIcon, CheckCircleIcon } from '@phosphor-icons/react'

interface EmployeeSearchFieldProps {
  readonly value?: string
  readonly onChange: (userId: string, employee: EmployeeLiteOption) => void
  readonly placeholder?: string
  readonly required?: boolean
  readonly accessToken?: string
  /**
   * When true, renders the currently selected employee as a non-interactive
   * summary (no "Change" affordance, no search input). Used when the
   * surrounding structured-input form is locked after submission.
   */
  readonly readOnly?: boolean
}

export function EmployeeSearchField({
  value,
  onChange,
  placeholder = 'Search and select employee...',
  required,
  accessToken,
  readOnly = false
}: EmployeeSearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLiteOption | null>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { employees, loading, error, search, hydrateById } = useEmployeeSearch(accessToken)

  // Calculate dropdown position using Portal pattern
  useLayoutEffect(() => {
    if (!isOpen || !wrapperRef.current) {
      setDropPos(null)
      return
    }
    const rect = wrapperRef.current.getBoundingClientRect()
    setDropPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 300)
    })
  }, [isOpen, employees])

  // Initial load on mount
  useEffect(() => {
    if (accessToken) {
      search('')
    }
  }, [accessToken]) // Only on mount or when accessToken changes

  // Load selected employee details if value provided
  useEffect(() => {
    if (value && !selectedEmployee) {
      // First try to find in employees list by userId
      const found = employees.find(emp => emp.userId === value)
      if (found) {
        setSelectedEmployee(found)
      } else {
        // Try to hydrate by id (if value is an id)
        hydrateById(value).then(employee => {
          if (employee) {
            setSelectedEmployee(employee)
          }
        })
      }
    }
  }, [value, selectedEmployee, employees, hydrateById])

  // Debounced search
  useEffect(() => {
    if (!searchQuery) return // Don't search on empty after initial load

    const timer = setTimeout(() => {
      search(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, search])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Use mousedown instead of click for better timing
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (employee: EmployeeLiteOption) => {
    setSelectedEmployee(employee)
    onChange(employee.userId || employee.id, employee)
    setSearchQuery('')
    setIsOpen(false)
  }

  // Convert base64 thumbnail to data URL
  const normalizeAvatarUrl = (pictureThumbnail?: string): string | undefined => {
    if (!pictureThumbnail) return undefined
    const trimmed = pictureThumbnail.trim()
    if (trimmed.startsWith('data:') || trimmed.startsWith('http')) return trimmed
    return `data:image/png;base64,${trimmed}`
  }

  return (
    <div ref={wrapperRef} className="gba:relative gba:w-full">
      {selectedEmployee ? (
        <button
          type="button"
          onClick={() => {
            if (readOnly) return
            setSelectedEmployee(null)
            setSearchQuery('')
            setIsOpen(true)
          }}
          disabled={readOnly}
          className={`gba:w-full gba:px-3 gba:py-2.5 gba:flex gba:items-center gba:gap-3 gba:border gba:border-input gba:rounded-lg gba:bg-background gba:text-left gba:transition-colors ${
            readOnly ? 'gba:cursor-default gba:opacity-95' : 'gba:hover:bg-muted/50'
          }`}
        >
          {selectedEmployee.pictureThumbnail ? (
            <img
              src={normalizeAvatarUrl(selectedEmployee.pictureThumbnail)}
              alt={selectedEmployee.displayName}
              className="gba:h-8 gba:w-8 gba:rounded-full gba:object-cover gba:shrink-0"
              onError={e => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="gba:h-8 gba:w-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
              <span className="gba:text-sm gba:font-medium gba:text-primary">
                {selectedEmployee.displayName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:font-medium gba:text-foreground gba:truncate">{selectedEmployee.displayName}</div>
            {(selectedEmployee.jobPositionName || selectedEmployee.organizationalUnitName) && (
              <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                {selectedEmployee.jobPositionName}
                {selectedEmployee.jobPositionName && selectedEmployee.organizationalUnitName && ' • '}
                {selectedEmployee.organizationalUnitName}
              </div>
            )}
          </div>
          {!readOnly && <span className="gba:text-xs gba:text-muted-foreground">Change</span>}
        </button>
      ) : (
        <div className="gba:relative">
          <Input
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => {
              if (readOnly) return
              setIsOpen(true)
            }}
            placeholder={placeholder}
            required={required}
            disabled={readOnly}
            className="gba:pr-8"
          />
          <div className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:pointer-events-none gba:flex gba:items-center gba:gap-1">
            {loading && <MagnifyingGlassIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:animate-pulse" />}
            <CaretDownIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          </div>
        </div>
      )}

      {isOpen &&
        dropPos &&
        createPortal(
          <div
            role="listbox"
            className="gba:fixed gba:z-9999 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-xl gba:max-h-[400px] gba:overflow-y-auto"
            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
            onMouseDown={e => {
              e.stopPropagation()
            }}
          >
            {!accessToken && (
              <div className="gba:px-4 gba:py-3 gba:text-sm gba:text-destructive">
                Authentication required to search employees
              </div>
            )}

            {error && <div className="gba:px-4 gba:py-3 gba:text-sm gba:text-destructive">Error: {error}</div>}

            {loading && !error && (
              <div className="gba:px-4 gba:py-3 gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                <MagnifyingGlassIcon className="gba:h-4 gba:w-4 gba:animate-pulse" />
                Searching employees...
              </div>
            )}

            {!loading && !error && employees.length === 0 && (
              <div className="gba:px-4 gba:py-3 gba:text-sm gba:text-muted-foreground">
                {searchQuery ? 'No employees found matching your search' : 'Start typing to search employees'}
              </div>
            )}

            {!loading && employees.length > 0 && (
              <div className="gba:py-1">
                {employees.map(emp => (
                  <button
                    key={emp.userId || emp.id}
                    type="button"
                    onMouseDown={e => {
                      // Prevent triggering click outside handler
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={() => handleSelect(emp)}
                    className="gba:w-full gba:px-4 gba:py-3 gba:flex gba:items-center gba:gap-3 gba:hover:bg-accent gba:hover:text-accent-foreground gba:transition-colors gba:text-left gba:border-0 gba:bg-transparent gba:cursor-pointer"
                  >
                    {emp.pictureThumbnail ? (
                      <img
                        src={normalizeAvatarUrl(emp.pictureThumbnail)}
                        alt={emp.displayName}
                        className="gba:h-10 gba:w-10 gba:rounded-full gba:object-cover gba:shrink-0"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
                        <span className="gba:text-sm gba:font-medium gba:text-primary">
                          {emp.displayName?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:font-medium gba:text-foreground gba:truncate">{emp.displayName}</div>
                      {(emp.jobPositionName || emp.organizationalUnitName) && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                          {emp.jobPositionName}
                          {emp.jobPositionName && emp.organizationalUnitName && ' • '}
                          {emp.organizationalUnitName}
                        </div>
                      )}
                    </div>
                    {value === (emp.userId || emp.id) && (
                      <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-primary gba:shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
