import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  AlertDescription,
  Spinner,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useStructureEmployees } from '@/business-apps/hr/core/forms/feedback-request-form/hooks/useStructureEmployees'

const prefixDataTestId = 'RequestFeedbackModal'

interface RequestFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  businessAppContext: BusinessAppContextProps
}

const RequestFeedbackModal: React.FC<RequestFeedbackModalProps> = ({ isOpen, onClose, businessAppContext }) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Get current user employee ID
  const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

  // Use the existing hook for fetching employees
  const {
    employees,
    isLoading,
    error: fetchError,
    fetchStructureEmployees
  } = useStructureEmployees(businessAppContext.accessToken, true, currentUserEmployeeId)

  // Combine local error with fetch error
  const displayError = error || fetchError

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStructureEmployees(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, fetchStructureEmployees])

  // Filter employees by search term (client-side)
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees
    const q = searchTerm.toLowerCase()
    return employees.filter(e => [e.name, e.jobTitle, e.department].some(v => (v || '').toLowerCase().includes(q)))
  }, [employees, searchTerm])

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    setError(null)
  }

  const selectedEmployee = useMemo(
    () => employees.find(emp => emp.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  )

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      setError(
        getTranslationFromI18nKeyAndLabel(
          'feedback.request.noEmployee',
          'Please select an employee to request feedback from'
        )
      )
      return
    }

    if (!currentUserEmployeeId) {
      setError(getTranslationFromI18nKeyAndLabel('feedback.request.noCurrentUser', 'Unable to identify current user'))
      return
    }

    if (!selectedEmployee) {
      setError(getTranslationFromI18nKeyAndLabel('feedback.request.employeeNotFound', 'Selected employee not found'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Use the same payload structure as feedback-request-form
      const payload = {
        requestedFrom: selectedEmployee.userId || selectedEmployee.id,
        requestedFromList: [selectedEmployee.userId || selectedEmployee.id],
        creatorUserId: currentUserEmployeeId,
        requestMessage: '' // Empty message for this context
      }

      // Dispatch the process continue event with 'pse_submit' to match feedback-request-form pattern
      dispatchProcessContinueEvent('pse_submit', payload)

      // Close the modal
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel('feedback.request.error', 'Failed to send feedback request')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployeeId('')
      setSearchTerm('')
      setError(null)
      fetchStructureEmployees()
    }
  }, [isOpen, fetchStructureEmployees])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl gba:w-full">
        <DialogHeader>
          <DialogTitle>{getTranslationFromI18nKeyAndLabel('feedback.request.title', 'Request Feedback')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Error Display */}
          {displayError && (
            <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          {/* Search Input */}
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel('feedback.request.searchPlaceholder', 'Search employees...')}
            data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
          />

          {/* Employee List */}
          <div className="gba:max-h-[60vh] gba:overflow-y-auto gba:space-y-2">
            {isLoading && filteredEmployees.length === 0 ? (
              <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-8">
                {getTranslationFromI18nKeyAndLabel('common.loading', 'Loading...')}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:py-8">
                {getTranslationFromI18nKeyAndLabel('common.noResults', 'No employees found')}
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const selected = selectedEmployeeId === emp.id
                const initials = (emp.name || '?')
                  .split(' ')
                  .map((p: string) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleEmployeeSelect(emp.id)}
                    className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-4 gba:rounded-lg gba:border gba:transition-all ${
                      selected ? 'gba:bg-accent gba:border-accent' : 'gba:hover:bg-muted'
                    }`}
                    data-testid={formatDataTestId(prefixDataTestId, `EmployeeRow-${emp.id}`)}
                  >
                    <Avatar>
                      {emp.pictureThumbnail ? (
                        <AvatarImage src={`data:image/jpeg;base64,${emp.pictureThumbnail}`} alt={emp.name} />
                      ) : (
                        <AvatarFallback>{initials}</AvatarFallback>
                      )}
                    </Avatar>

                    <div className="gba:flex-1 gba:min-w-0 gba:text-left">
                      <div className="gba:text-sm gba:font-medium gba:truncate">{emp.name}</div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:flex-wrap gba:gap-2">
                        {emp.jobTitle && <span>{emp.jobTitle}</span>}
                        {emp.department && <span>· {emp.department}</span>}
                      </div>
                    </div>

                    <div
                      className={`gba:w-5 gba:h-5 gba:rounded gba:border gba:flex gba:items-center gba:justify-center ${
                        selected ? 'gba:bg-primary gba:text-primary-foreground' : ''
                      }`}
                    >
                      {selected ? '✓' : ''}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            >
              {getTranslationFromI18nKeyAndLabel('feedback.request.cancel', 'Cancel')}
            </Button>
            <Button
              variant="default"
              disabled={!selectedEmployeeId || isSubmitting}
              onClick={handleSubmit}
              className="gba:bg-foreground hover:gba:bg-muted gba:text-primary-foreground"
              data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
            >
              {isSubmitting && <Spinner size="sm" className="gba:mr-2" />}
              {getTranslationFromI18nKeyAndLabel('feedback.request.submit', 'Request Feedback')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RequestFeedbackModal
