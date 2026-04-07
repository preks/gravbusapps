import { useEffect, useRef, type ReactNode } from 'react'

interface AssetEmployeeFilterProps {
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  searchText: string
  setSearchText: (value: string) => void
  showDropdown: boolean
  setShowDropdown: (value: boolean) => void
  employeeOptions: Array<{ id: string; label: string }>
  isLoading: boolean
  searchPlaceholder: string
  emptyLabel: string
  loadingLabel: string
}

export function AssetEmployeeFilter({
  selectedIds,
  onSelectedIdsChange,
  searchText,
  setSearchText,
  showDropdown,
  setShowDropdown,
  employeeOptions,
  isLoading,
  searchPlaceholder,
  emptyLabel,
  loadingLabel
}: Readonly<AssetEmployeeFilterProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showDropdown) {
      return
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [setShowDropdown, showDropdown])

  const handleEmployeeClick = (employeeId: string) => {
    const nextIds = selectedIds.includes(employeeId)
      ? selectedIds.filter(value => value !== employeeId)
      : [...selectedIds, employeeId]

    onSelectedIdsChange(nextIds)
  }

  return (
    <div ref={containerRef} className="gba:relative gba:p-2">
      <input
        type="text"
        value={searchText}
        onChange={event => {
          setSearchText(event.target.value)
          setShowDropdown(true)
        }}
        onFocus={() => setShowDropdown(true)}
        className="gba:h-8 gba:w-full gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
        placeholder={searchPlaceholder}
        data-testid="asset-employee-filter-search-input"
      />
      {showDropdown && searchText.trim() !== '' ? (
        <div className="gba:absolute gba:left-0 gba:right-0 gba:top-full gba:z-10 gba:max-h-40 gba:overflow-y-auto gba:rounded gba:border gba:border-input gba:bg-background">
          {isLoading ? (
            <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">{loadingLabel}</div>
          ) : employeeOptions.length === 0 ? (
            <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">{emptyLabel}</div>
          ) : (
            employeeOptions.map(option => (
              <button
                key={option.id}
                type="button"
                className={`gba:w-full gba:p-2 gba:text-left gba:text-sm gba:transition-colors hover:gba:bg-muted ${
                  selectedIds.includes(option.id) ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-foreground'
                }`}
                onClick={() => handleEmployeeClick(option.id)}
                data-testid={`asset-employee-filter-option-${option.id}`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export const ASSET_EMPLOYEE_FILTER_GROUP_ID = 'employee-group'
export const ASSET_EMPLOYEE_FILTER_VALUE_KEY = 'employeeIds'

export const buildAssetEmployeeCustomGroup = (
  render: (props: { selectedIds: string[]; onSelectedIdsChange: (ids: string[]) => void }) => ReactNode
) => ({
  groupId: ASSET_EMPLOYEE_FILTER_GROUP_ID,
  valueKey: ASSET_EMPLOYEE_FILTER_VALUE_KEY,
  render
})
