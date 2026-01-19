'use client'

import React from 'react'
import { Button, Alert, AlertDescription, Input, Spinner } from '@newwork/nw-design-system'
import { BriefcaseIcon, XIcon } from 'lucide-react'
import { usePositionTerminationContext } from '../context/PositionTerminationContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

interface PositionTerminationFormProps {
  isModal?: boolean
  onClose?: () => void
}

export const PositionTerminationForm: React.FC<PositionTerminationFormProps> = ({ isModal = false, onClose }) => {
  const { formValues, setFormValues, position, loading, error, submit, cancel } = usePositionTerminationContext()

  // Get organizational unit display
  const getOrganizationalUnitDisplay = () => {
    if (!position?.employeePositions.length) return '-'

    const orgUnits = position.employeePositions
      .map(ep => ep.organizationalUnit?.name)
      .filter(name => name) // Remove undefined/null values
      .filter((name, index, arr) => arr.indexOf(name) === index) // Remove duplicates

    return orgUnits.length > 0 ? orgUnits.join(', ') : '-'
  }

  const handleClose = () => {
    if (isModal && onClose) {
      onClose()
    } else {
      cancel()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit()

    // Close modal if in modal mode and submission is successful
    if (isModal && onClose) {
      onClose()
    }
  }

  const isFormValid = formValues.jobPositionId && formValues.terminationDate

  // Set default termination date to today if not set
  React.useEffect(() => {
    if (!formValues.terminationDate) {
      setFormValues({ terminationDate: dayjs() })
    }
  }, [formValues.terminationDate, setFormValues])

  return (
    <div className="gba:max-w-[500px] gba:mx-auto gba:bg-white gba:rounded-2xl gba:shadow-lg gba:flex gba:flex-col gba:min-h-[600px] gba:p-0">
      {/* Header Section - matching Employee Termination */}
      <div className="gba:flex gba:items-center gba:justify-between gba:pt-8 gba:pb-6 gba:px-6 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-3">
          <BriefcaseIcon className="gba:h-6 gba:w-6 gba:text-foreground" />
          <span className="gba:flex gba:items-center gba:h-6 gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:position_termination.title', 'Terminate Job Position')}
          </span>
        </div>

        {/* Close Button */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={handleClose}
            className="gba:p-1 gba:hover:bg-muted gba:rounded gba:transition-colors"
            data-testid="position-termination-close-button"
          >
            <XIcon className="gba:h-5 gba:w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="gba:flex-1 gba:flex gba:flex-col gba:justify-between gba:pb-10 gba:px-6">
        <div className="gba:pb-10 gba:pt-4">
          {/* Position Information Section - matching Employee info layout */}
          <div className="gba:flex gba:items-center gba:mb-8">
            {loading ? (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Spinner size="sm" />
                <div>Loading position info...</div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:position_termination.error', 'Error Loading Position')}:{' '}
                  {error}
                </AlertDescription>
              </Alert>
            ) : position ? (
              <>
                <div className="gba:flex gba:items-center gba:justify-center gba:w-16 gba:h-16 gba:rounded-lg gba:mr-4 gba:bg-accent">
                  <BriefcaseIcon className="gba:h-8 gba:w-8 gba:text-accent-foreground" />
                </div>
                <div className="gba:ml-2">
                  <div className="gba:font-medium gba:text-lg">{position.name}</div>
                  <div className="gba:text-muted-foreground">{getOrganizationalUnitDisplay()}</div>
                  <div className="gba:text-muted-foreground">{position.jobFunction?.name || '-'}</div>
                </div>
              </>
            ) : (
              <div>No position data found</div>
            )}
          </div>

          {/* Termination Date Input */}
          <div className="gba:mb-6">
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-2 gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:position_termination.termination_date', 'Exit Date')}*
            </label>
            <Input
              type="date"
              value={formValues.terminationDate ? formValues.terminationDate.format('YYYY-MM-DD') : ''}
              onChange={e => {
                const value = e.target.value
                if (value) {
                  setFormValues({ terminationDate: dayjs(value) })
                }
              }}
              required
              className="gba:w-full"
              data-testid="position-termination-date-input"
            />
          </div>
        </div>

        {/* Action Buttons - matching Employee Termination layout */}
        <div className="gba:border-t gba:border-border gba:flex gba:gap-4 gba:justify-start gba:pt-4">
          <Button
            type="submit"
            variant="default"
            disabled={!isFormValid || loading}
            data-testid="position-termination-submit-button"
            className="gba:min-w-[120px] gba:h-[40px] gba:px-8 gba:rounded-full"
          >
            {loading ? (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Spinner size="sm" />
                {getTranslationFromI18nKeyAndLabel('lowcoder:position_termination.processing', 'Processing...')}
              </div>
            ) : (
              getTranslationFromI18nKeyAndLabel('lowcoder:position_termination.submit', 'Submit')
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            data-testid="position-termination-cancel-button"
            className="gba:min-w-[120px] gba:h-[40px] gba:px-8 gba:rounded-full"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:position_termination.cancel', 'Cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
