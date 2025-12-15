import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge
} from '@newwork/nw-design-system'
import { Send, X, Users, Search, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useEmployeeSearch, EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { sendGlossaryRequest } from '../services/GlossaryRequestFlowService'
import { Book } from 'lucide-react'

interface GlossaryRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentUserId: string
}

/**
 * Dialog for requesting a glossary term via workflow task
 */
export const GlossaryRequestDialog: React.FC<GlossaryRequestDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  currentUserId
}) => {
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeLiteOption[]>([])
  const [term, setTerm] = useState('')
  const [context, setContext] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sentSuccess, setSentSuccess] = useState(false)

  const { employees, loading: employeesLoading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedEmployees([])
      setTerm('')
      setContext('')
      setSearchTerm('')
      setSentSuccess(false)
    }
  }, [open])

  // Trigger search when search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, search])

  // Filter out already selected employees from the list
  const availableEmployees = useMemo(() => {
    const selectedIds = new Set(selectedEmployees.map(e => e.id))
    return employees.filter(e => !selectedIds.has(e.id))
  }, [employees, selectedEmployees])

  const toggleEmployee = useCallback((employee: EmployeeLiteOption) => {
    setSelectedEmployees(prev => {
      const exists = prev.find(e => e.id === employee.id)
      if (exists) {
        return prev.filter(e => e.id !== employee.id)
      } else {
        return [...prev, employee]
      }
    })
  }, [])

  const removeEmployee = useCallback((employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== employeeId))
  }, [])

  const handleSubmit = async () => {
    if (!term.trim()) {
      toast.error('Please enter a term to request')
      return
    }

    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee to assign the request to')
      return
    }

    setIsSubmitting(true)

    try {
      const assigneeUserIds = selectedEmployees.map(e => e.userId || e.id)

      const result = await sendGlossaryRequest(accessToken, {
        term: term.trim(),
        context: context.trim() || undefined,
        assigneeUserIds,
        initiatorId: currentUserId
      })

      if (result.success) {
        const count = result.count || selectedEmployees.length
        setSentSuccess(true)
        setTimeout(() => {
          toast.success(`Glossary request sent to ${count} ${count === 1 ? 'person' : 'people'}!`)
          onOpenChange(false)
        }, 1500)
      } else {
        toast.error(result.error || 'Failed to send request')
        setIsSubmitting(false)
      }
    } catch {
      toast.error('Failed to send request')
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    return (name || '?')
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const getSendButtonText = (submitting: boolean, count: number): string => {
    if (submitting) return 'Sending...'
    if (count === 0) return 'Select recipients'
    const personWord = count === 1 ? 'person' : 'people'
    return `Send to ${count} ${personWord}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:sm:max-w-[600px] gba:max-h-[90vh] gba:overflow-hidden gba:flex gba:flex-col"
        data-testid="glossary-request-dialog"
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Book className="gba:w-5 gba:h-5 gba:text-primary" />
            Request Glossary Term
          </DialogTitle>
          <DialogDescription>
            Request a glossary term definition. The assigned person will receive a task to create the glossary entry.
          </DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {sentSuccess ? (
          <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center gba:mb-4">
              <CheckCircle className="gba:w-10 gba:h-10 gba:text-success" />
            </div>
            <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">Sent!</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center">
              {selectedEmployees.length === 1
                ? `${selectedEmployees[0].displayName} will receive a task to create the glossary entry.`
                : `${selectedEmployees.length} people will receive a task to create the glossary entry.`}
            </p>
          </div>
        ) : (
          <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-4 gba:py-4 gba:px-1">
            {/* Term Input */}
            <div className="gba:space-y-2">
              <Label htmlFor="term">Term *</Label>
              <input
                id="term"
                type="text"
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="Enter the term you want to request..."
                className="gba:flex gba:h-10 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:ring-offset-background file:gba:border-0 file:gba:bg-transparent file:gba:text-sm file:gba:font-medium placeholder:gba:text-muted-foreground focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                data-testid="glossary-request-dialog-term-input"
              />
            </div>

            {/* Context Input */}
            <div className="gba:space-y-2">
              <Label htmlFor="context">Context (optional)</Label>
              <Textarea
                id="context"
                placeholder="Provide context about where you encountered this term or why you need it defined..."
                value={context}
                onChange={e => setContext(e.target.value)}
                className="gba:min-h-[80px] gba:resize-none"
                data-testid="glossary-request-dialog-context-textarea"
              />
            </div>

            {/* Selected Employees */}
            {selectedEmployees.length > 0 && (
              <div className="gba:space-y-2">
                <Label className="gba:flex gba:items-center gba:gap-2">
                  <Users className="gba:w-4 gba:h-4" />
                  Selected ({selectedEmployees.length})
                </Label>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {selectedEmployees.map(emp => (
                    <Badge
                      key={emp.id}
                      variant="secondary"
                      className="gba:flex gba:items-center gba:gap-2 gba:pr-1 gba:py-1"
                    >
                      <Avatar className="gba:w-5 gba:h-5">
                        {emp.pictureThumbnail ? (
                          <AvatarImage src={`data:image/jpeg;base64,${emp.pictureThumbnail}`} alt={emp.displayName} />
                        ) : (
                          <AvatarFallback className="gba:text-[10px]">{getInitials(emp.displayName)}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="gba:text-sm">{emp.displayName}</span>
                      <button
                        type="button"
                        onClick={() => removeEmployee(emp.id)}
                        className="gba:ml-1 gba:p-0.5 gba:rounded-full gba:hover:bg-muted"
                        data-testid={`remove-employee-${emp.id}`}
                      >
                        <X className="gba:w-3 gba:h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Search */}
            <div className="gba:space-y-2">
              <Label>Assign to</Label>
              <div className="gba:flex gba:items-center gba:border gba:border-input gba:rounded-md gba:px-3 gba:h-10 gba:bg-background gba:focus-within:ring-2 gba:focus-within:ring-ring gba:focus-within:ring-offset-2">
                <Search className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:mr-2 gba:flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search for employees..."
                  className="gba:flex-1 gba:bg-transparent gba:border-none gba:outline-none gba:text-sm gba:placeholder:text-muted-foreground"
                  data-testid="glossary-request-dialog-search-input"
                />
              </div>

              {/* Employee List */}
              <div className="gba:border gba:rounded-lg gba:max-h-[200px] gba:overflow-y-auto">
                {employeesLoading && availableEmployees.length === 0 ? (
                  <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-8">Loading...</div>
                ) : availableEmployees.length === 0 ? (
                  <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-8">
                    {searchTerm ? 'No employees found' : 'Type to search employees'}
                  </div>
                ) : (
                  <>
                    {availableEmployees.map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp)}
                        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:hover:bg-muted gba:transition-colors gba:border-b gba:last:border-b-0"
                        data-testid={`employee-option-${emp.id}`}
                      >
                        <Avatar className="gba:w-8 gba:h-8">
                          {emp.pictureThumbnail ? (
                            <AvatarImage src={`data:image/jpeg;base64,${emp.pictureThumbnail}`} alt={emp.displayName} />
                          ) : (
                            <AvatarFallback className="gba:text-xs">{getInitials(emp.displayName)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="gba:flex-1 gba:min-w-0 gba:text-left">
                          <div className="gba:text-sm gba:font-medium gba:truncate">{emp.displayName}</div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:flex-wrap gba:gap-1">
                            {emp.organizationalUnitName && <span>{emp.organizationalUnitName}</span>}
                            {emp.organizationalUnitName && emp.jobPositionName && <span>·</span>}
                            {emp.jobPositionName && <span>{emp.jobPositionName}</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={loadMore}
                        className="gba:w-full gba:p-2 gba:text-sm gba:text-primary gba:hover:bg-muted gba:transition-colors"
                        disabled={employeesLoading}
                      >
                        {employeesLoading ? 'Loading...' : 'Load more'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!sentSuccess && (
          <DialogFooter className="gba:gap-2 gba:pt-4 gba:border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-testid="glossary-request-dialog-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!term.trim() || selectedEmployees.length === 0 || isSubmitting}
              data-testid="glossary-request-dialog-send-button"
            >
              <Send className="gba:w-4 gba:h-4 gba:mr-2" />
              {getSendButtonText(isSubmitting, selectedEmployees.length)}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default GlossaryRequestDialog
