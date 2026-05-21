/**
 * Employee search + list for email AI quick-task assignees (controlled selection).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Button, Label } from '@newwork/nw-design-system'
import { Search, X } from 'lucide-react'
import { useEmployeeSearch, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { assigneeIdFromEmployee, toAvatarSrc } from '../utils/emailSuggestionQuickTaskHelpers'

export type EmailSuggestionAssigneePendingHintStatus = 'resolving' | 'unmatched' | 'ambiguous'

export interface EmailSuggestionAssigneePendingHint {
  status: EmailSuggestionAssigneePendingHintStatus
  raw: string
}

export interface EmailSuggestionQuickTaskAssigneePickerLabels {
  assigneeLabel: string
  searchPlaceholder: string
  loading: string
  empty: string
  loadMore: string
  removeAria: string
  assigneePendingResolving: string
  assigneePendingUnmatched: string
  assigneePendingAmbiguous: string
}

export interface EmailSuggestionQuickTaskAssigneePickerProps {
  readonly accessToken: string
  readonly selectedEmployees: EmployeeLiteOption[]
  onSelectedEmployeesChange: (next: EmployeeLiteOption[]) => void
  readonly testIdPrefix: string
  readonly labels: EmailSuggestionQuickTaskAssigneePickerLabels
  readonly initialSearchTerm?: string
  readonly pendingHint?: EmailSuggestionAssigneePendingHint
}

function pendingHintLabel(
  pendingHint: EmailSuggestionAssigneePendingHint,
  labels: EmailSuggestionQuickTaskAssigneePickerLabels
): string {
  if (pendingHint.status === 'resolving') return labels.assigneePendingResolving
  if (pendingHint.status === 'ambiguous') return labels.assigneePendingAmbiguous
  return labels.assigneePendingUnmatched
}

export function EmailSuggestionQuickTaskAssigneePicker({
  accessToken,
  selectedEmployees,
  onSelectedEmployeesChange,
  testIdPrefix,
  labels,
  initialSearchTerm,
  pendingHint
}: Readonly<EmailSuggestionQuickTaskAssigneePickerProps>): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm ?? '')
  const appliedInitialSearchTermRef = useRef<string | undefined>(initialSearchTerm)
  const { employees, loading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)

  useEffect(() => {
    const nextInitialSearchTerm = initialSearchTerm?.trim()
    if (!nextInitialSearchTerm || appliedInitialSearchTermRef.current === nextInitialSearchTerm || searchTerm.trim()) {
      return
    }
    appliedInitialSearchTermRef.current = nextInitialSearchTerm
    setSearchTerm(nextInitialSearchTerm)
  }, [initialSearchTerm, searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, search])

  const availableEmployees = useMemo(() => {
    const selected = new Set(selectedEmployees.map(assigneeIdFromEmployee))
    return employees.filter(e => !selected.has(assigneeIdFromEmployee(e)))
  }, [employees, selectedEmployees])

  const toggleEmployee = useCallback(
    (employee: EmployeeLiteOption) => {
      const id = assigneeIdFromEmployee(employee)
      const exists = selectedEmployees.some(e => assigneeIdFromEmployee(e) === id)
      if (exists) {
        onSelectedEmployeesChange(selectedEmployees.filter(e => assigneeIdFromEmployee(e) !== id))
      } else {
        onSelectedEmployeesChange([...selectedEmployees, employee])
      }
    },
    [onSelectedEmployeesChange, selectedEmployees]
  )

  const removeEmployee = useCallback(
    (employeeId: string) => {
      onSelectedEmployeesChange(selectedEmployees.filter(e => assigneeIdFromEmployee(e) !== employeeId))
    },
    [onSelectedEmployeesChange, selectedEmployees]
  )

  const pendingHintText = pendingHint ? pendingHintLabel(pendingHint, labels) : undefined

  let listContent: React.ReactNode
  if (loading && availableEmployees.length === 0) {
    listContent = <p className="gba:p-3 gba:text-xs gba:text-muted-foreground">{labels.loading}</p>
  } else if (availableEmployees.length === 0) {
    listContent = <p className="gba:p-3 gba:text-xs gba:text-muted-foreground">{labels.empty}</p>
  } else {
    listContent = (
      <ul className="gba:divide-y gba:divide-border">
        {availableEmployees.map(emp => (
          <li key={assigneeIdFromEmployee(emp)}>
            <button
              type="button"
              className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:text-left gba:text-sm hover:gba:bg-muted/50"
              onClick={() => toggleEmployee(emp)}
              data-testid={`${testIdPrefix}-pick-assignee-${assigneeIdFromEmployee(emp)}`}
            >
              <Avatar className="gba:w-7 gba:h-7">
                {toAvatarSrc(emp.pictureThumbnail) ? (
                  <AvatarImage src={toAvatarSrc(emp.pictureThumbnail)} alt={emp.displayName} />
                ) : null}
                <AvatarFallback className="gba:text-xs">
                  {(emp.displayName || '?')
                    .split(' ')
                    .map(p => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="gba:truncate">{emp.displayName}</span>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="gba:space-y-3 gba:pt-1">
      {pendingHintText && selectedEmployees.length === 0 ? (
        <p
          className={
            pendingHint?.status === 'ambiguous'
              ? 'gba:text-xs gba:text-amber-600'
              : 'gba:text-xs gba:text-muted-foreground'
          }
          data-testid={`${testIdPrefix}-assignee-pending-hint`}
        >
          {pendingHintText}
        </p>
      ) : null}
      <div className="gba:space-y-2">
        <Label>{labels.assigneeLabel}</Label>
        {selectedEmployees.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {selectedEmployees.map(e => {
              const id = assigneeIdFromEmployee(e)
              return (
                <div
                  key={id}
                  className="gba:flex gba:items-center gba:gap-1 gba:pl-1 gba:pr-2 gba:py-1 gba:bg-muted gba:rounded-md gba:text-xs"
                >
                  <Avatar className="gba:w-6 gba:h-6">
                    {toAvatarSrc(e.pictureThumbnail) ? (
                      <AvatarImage src={toAvatarSrc(e.pictureThumbnail)} alt={e.displayName} />
                    ) : null}
                    <AvatarFallback className="gba:text-xs">
                      {(e.displayName || '?')
                        .split(' ')
                        .map(p => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="gba:max-w-[180px] gba:truncate">{e.displayName}</span>
                  <button
                    type="button"
                    className="gba:p-0.5 gba:rounded-sm hover:gba:bg-muted-foreground/15"
                    onClick={() => removeEmployee(id)}
                    aria-label={labels.removeAria}
                    data-testid={`${testIdPrefix}-remove-assignee-${id}`}
                  >
                    <X className="gba:w-3.5 gba:h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="gba:flex gba:items-center gba:border gba:border-input gba:rounded-md gba:px-3 gba:h-10 gba:bg-background gba:focus-within:ring-2 gba:focus-within:ring-ring gba:focus-within:ring-offset-2">
          <Search className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:mr-2 gba:flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="gba:flex-1 gba:bg-transparent gba:border-none gba:outline-none gba:text-sm gba:placeholder:text-muted-foreground"
            data-testid={`${testIdPrefix}-assignee-search`}
          />
        </div>
        <div className="gba:border gba:rounded-lg gba:max-h-40 gba:overflow-y-auto">
          {listContent}
          {hasMore && availableEmployees.length > 0 ? (
            <div className="gba:p-2 gba:border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gba:w-full gba:text-xs"
                onClick={() => void loadMore()}
              >
                {labels.loadMore}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
