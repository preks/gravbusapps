import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import type { TaskAssignment, AssignmentTarget, AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { useOrgDirectory } from '@/common/network/org-directory'
import { RESOURCE_TYPES, type ResourceTypeKey, type TargetField } from './assignmentResourceTypes'

export interface AssignmentSelectorProps {
  value?: TaskAssignment
  onChange: (assignment: TaskAssignment) => void
  assignmentMode: AssignmentMode
  accessToken: string
  /** Restrict to specific resource types. Defaults to all types. */
  allowedTypes?: ResourceTypeKey[]
  'data-testid'?: string
}

export const AssignmentSelector: React.FC<AssignmentSelectorProps> = ({
  value,
  onChange,
  assignmentMode,
  accessToken,
  allowedTypes,
  'data-testid': testId = 'assignment-selector'
}) => {
  const visibleTypes = useMemo(
    () =>
      allowedTypes ? RESOURCE_TYPES.filter(rt => allowedTypes.includes(rt.key as ResourceTypeKey)) : RESOURCE_TYPES,
    [allowedTypes]
  )
  const [activeType, setActiveType] = useState(visibleTypes[0] || RESOURCE_TYPES[0])
  const [query, setQuery] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  const [dataRequested, setDataRequested] = useState(false)
  const [nameCache, setNameCache] = useState<Record<string, string>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: orgData, loading: orgLoading } = useOrgDirectory(dataRequested ? accessToken : '')

  const getItems = useCallback(
    (dataKey: string): Array<{ id: string; name: string }> => {
      if (!orgData) return []
      const data = (orgData as Record<string, unknown>)[dataKey]
      if (!Array.isArray(data)) return []
      return data
        .map((d: { id?: string; name?: string }) => ({
          id: String(d.id || ''),
          name: String(d.name || '').trim()
        }))
        .filter(d => d.id && d.name)
    },
    [orgData]
  )

  const assignment = value || { targets: null, assignmentMode, allowReassignment: true }
  const currentTarget: AssignmentTarget = assignment.targets || ({} as AssignmentTarget)

  const filtered = useMemo(() => {
    const items = getItems(activeType.dataKey)
    const q = query.toLowerCase().trim()
    const source = q ? items.filter(i => i.name.toLowerCase().includes(q)) : items
    return source.slice(0, 20)
  }, [getItems, activeType.dataKey, query])

  const selectedIds = useMemo(() => new Set(currentTarget[activeType.field] || []), [currentTarget, activeType.field])

  const handleSelect = useCallback(
    (field: TargetField, id: string, name: string) => {
      setNameCache(prev => ({ ...prev, [id]: name }))
      const target = assignment.targets || ({} as AssignmentTarget)
      const current = target[field] || []
      if (current.includes(id)) return
      onChange({ ...assignment, targets: { ...target, [field]: [...current, id] } })
      setQuery('')
      setResultsOpen(false)
    },
    [assignment, onChange]
  )

  const handleRemove = useCallback(
    (field: TargetField, id: string) => {
      const target = assignment.targets || ({} as AssignmentTarget)
      const newValues = (target[field] || []).filter((v: string) => v !== id)
      const newTarget: AssignmentTarget = { ...target, [field]: newValues.length > 0 ? newValues : undefined }
      const hasAny = Object.values(newTarget).some(v => Array.isArray(v) && v.length > 0)
      onChange({ ...assignment, targets: hasAny ? newTarget : null })
    },
    [assignment, onChange]
  )

  const allSelections = useMemo(() => {
    const result: Array<{ field: TargetField; id: string; name: string; icon: React.ReactNode }> = []
    for (const rt of visibleTypes) {
      for (const id of currentTarget[rt.field] || []) {
        result.push({ field: rt.field, id, name: nameCache[id] || id, icon: rt.icon })
      }
    }
    return result
  }, [currentTarget, nameCache, visibleTypes])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResultsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      {/* Composite search field with type prefix */}
      <div ref={containerRef} className="gba:relative">
        {/* Single bordered container for input + dropdown with unified focus ring */}
        <div
          className={`${resultsOpen ? 'gba:absolute gba:inset-x-0 gba:top-0 gba:z-50' : ''} gba:rounded-md gba:border gba:border-border gba:bg-background gba:focus-within:ring-1 gba:focus-within:ring-ring`}
        >
          {/* Input row */}
          <div className="gba:flex gba:items-center">
            {/* Type prefix */}
            <div className="gba:relative">
              {visibleTypes.length === 1 ? (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:border-r gba:border-border gba:text-sm gba:font-medium gba:text-foreground gba:shrink-0">
                  {activeType.icon}
                  <span>{activeType.label}</span>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:border-r gba:border-border gba:text-sm gba:font-medium gba:text-foreground gba:hover:bg-accent gba:transition-colors gba:shrink-0"
                      data-testid={`${testId}-type-trigger`}
                    >
                      {activeType.icon}
                      <span>{activeType.label}</span>
                      <ChevronDown className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="gba:w-56 gba:max-h-60 gba:overflow-y-auto"
                    data-testid={`${testId}-type-menu`}
                  >
                    {visibleTypes.map(rt => (
                      <DropdownMenuItem
                        key={rt.key}
                        onClick={() => {
                          setActiveType(rt)
                          setQuery('')
                          inputRef.current?.focus()
                        }}
                        className={rt.key === activeType.key ? 'gba:bg-accent gba:text-accent-foreground' : undefined}
                        data-testid={`${testId}-type-${rt.key}`}
                      >
                        <span className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:shrink-0 gba:text-muted-foreground">{rt.icon}</span>
                          <span>{rt.label}</span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Search input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setResultsOpen(true)
              }}
              onFocus={() => {
                setResultsOpen(true)
                if (!dataRequested) setDataRequested(true)
              }}
              placeholder={activeType.placeholder}
              className="gba:flex-1 gba:px-3 gba:py-2 gba:text-sm gba:bg-transparent gba:outline-none gba:min-w-0"
              data-testid={`${testId}-input`}
            />
          </div>

          {/* Results list - inside the same bordered container */}
          {resultsOpen && (
            <div className="gba:border-t gba:border-border gba:max-h-60 gba:overflow-y-auto">
              {dataRequested && orgLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:p-3 gba:gap-2 gba:text-sm gba:text-muted-foreground">
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="gba:p-3 gba:text-center gba:text-sm gba:text-muted-foreground">No results found</div>
              ) : (
                filtered.map(item => {
                  const isSelected = selectedIds.has(item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleSelect(activeType.field, item.id, item.name)}
                      className={`gba:w-full gba:flex gba:items-center gba:gap-2 gba:text-left gba:px-3 gba:py-2 gba:text-sm gba:transition-colors ${
                        isSelected ? 'gba:text-muted-foreground gba:bg-muted' : 'gba:hover:bg-accent gba:cursor-pointer'
                      }`}
                      data-testid={`${testId}-option-${item.id}`}
                    >
                      <span className="gba:shrink-0 gba:text-muted-foreground">{activeType.icon}</span>
                      <span className="gba:truncate">{item.name}</span>
                      {isSelected && (
                        <span className="gba:ml-auto gba:shrink-0 gba:text-xs gba:text-muted-foreground">
                          (selected)
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Invisible spacer to maintain layout height when container becomes absolute */}
        {resultsOpen && (
          <div
            className="gba:invisible gba:flex gba:items-center gba:border gba:border-transparent gba:px-3 gba:py-2 gba:text-sm"
            aria-hidden="true"
          >
            &nbsp;
          </div>
        )}
      </div>

      {/* Selected badges */}
      {allSelections.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-1.5" data-testid={`${testId}-selections`}>
          {allSelections.map(({ field, id, name, icon }) => (
            <Badge key={`${field}-${id}`} variant="secondary" className="gba:flex gba:items-center gba:gap-1 gba:pr-1">
              <span className="gba:shrink-0 gba:text-muted-foreground">{icon}</span>
              <span className="gba:text-xs">{name}</span>
              <button
                type="button"
                onClick={() => handleRemove(field, id)}
                className="gba:ml-0.5 gba:rounded-full gba:p-0.5 gba:hover:bg-muted gba:transition-colors"
                data-testid={`${testId}-remove-${id}`}
              >
                <X className="gba:w-3 gba:h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
