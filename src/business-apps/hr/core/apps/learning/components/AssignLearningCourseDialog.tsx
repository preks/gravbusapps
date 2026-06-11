import React, { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import MultiEmployeeSelect from '@/components/multi-employee-select/MultiEmployeeSelect'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import translations from '../_i18n'
import { useLearningAssignmentCreator } from '../hooks/useLearningAssignmentCreator'
import { useLearningCourseDetails } from '../hooks/useLearningCourseDetails'
import type { LearningCourseListItem } from '../types'

interface AssignLearningCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: BusinessAppContextProps
  course: LearningCourseListItem | null
  onAssigned?: () => void
}

const toDateTimeLocalValue = (date: Date): string => {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export const AssignLearningCourseDialog: React.FC<AssignLearningCourseDialogProps> = ({
  open,
  onOpenChange,
  context,
  course,
  onAssigned
}) => {
  const { t } = useTranslation(translations)
  const {
    details,
    loading: detailsLoading,
    error: detailsError
  } = useLearningCourseDetails(open ? course?.id : undefined, context.accessToken)
  const { createAssignment, loading: creating, error: createError } = useLearningAssignmentCreator(context)
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeLiteOption[]>([])
  const [availableFrom, setAvailableFrom] = useState(() => toDateTimeLocalValue(new Date()))
  const [availableUntil, setAvailableUntil] = useState(() =>
    toDateTimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const latestVersionId = details?.latestVersion?.id
  const resolvedEmployeeCount = employeeIds.length

  const handleSubmit = async () => {
    setLocalError(null)
    setSuccess(false)
    if (!course) return
    if (!latestVersionId) {
      setLocalError(t('learning-assign-no-version'))
      return
    }
    if (!availableFrom || !availableUntil || new Date(availableUntil) <= new Date(availableFrom)) {
      setLocalError(t('learning-assign-invalid-dates'))
      return
    }
    if (employeeIds.length === 0) {
      setLocalError(t('learning-assign-no-employees'))
      return
    }

    await createAssignment({
      courseId: course.id,
      courseTitle: course.title || t('learning-assign-default-title'),
      courseVersionId: latestVersionId,
      employeeIds,
      employeeUserIdsByEmployeeId: Object.fromEntries(
        selectedEmployees.map(employee => [employee.id, employee.userId])
      ),
      teamIds: [],
      availableFrom: new Date(availableFrom).toISOString(),
      availableUntil: new Date(availableUntil).toISOString(),
      sourceDocumentId: details?.sourceDocumentId ?? course.sourceDocumentId
    })
    setSuccess(true)
    onAssigned?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid="learning-assign-dialog">
        <DialogHeader>
          <DialogTitle>{t('learning-assign-dialog-title')}</DialogTitle>
          <DialogDescription>
            {course ? t('learning-assign-dialog-description', { courseTitle: course.title || '-' }) : ''}
          </DialogDescription>
        </DialogHeader>

        {detailsLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner className="gba:h-6 gba:w-6" />
          </div>
        ) : (
          <div className="gba:space-y-5">
            {detailsError && (
              <div className="gba:rounded-md gba:bg-destructive/10 gba:p-3 gba:text-sm gba:text-destructive">
                {detailsError}
              </div>
            )}
            {!latestVersionId && (
              <div className="gba:rounded-md gba:bg-muted gba:p-3 gba:text-sm gba:text-muted-foreground">
                {t('learning-assign-no-version')}
              </div>
            )}
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">{t('learning-assign-employees')}</label>
              <MultiEmployeeSelect
                accessToken={context.accessToken}
                value={employeeIds}
                onValueChange={setEmployeeIds}
                onEmployeesChange={setSelectedEmployees}
                initialEmployees={selectedEmployees}
                placeholder={t('learning-assign-employees-placeholder')}
                searchPlaceholder={t('learning-assign-employees-search')}
                data-testid="learning-assign-employees"
              />
            </div>
            <div className="gba:grid gba:grid-cols-1 gba:gap-4 md:gba:grid-cols-2">
              <div className="gba:space-y-2">
                <label className="gba:text-sm gba:font-medium">{t('learning-assign-available-from')}</label>
                <Input
                  type="datetime-local"
                  value={availableFrom}
                  onChange={event => setAvailableFrom(event.target.value)}
                />
              </div>
              <div className="gba:space-y-2">
                <label className="gba:text-sm gba:font-medium">{t('learning-assign-available-until')}</label>
                <Input
                  type="datetime-local"
                  value={availableUntil}
                  onChange={event => setAvailableUntil(event.target.value)}
                />
              </div>
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {t('learning-assign-resolved-count', { count: resolvedEmployeeCount })}
            </div>
            {(localError || createError) && (
              <div className="gba:rounded-md gba:bg-destructive/10 gba:p-3 gba:text-sm gba:text-destructive">
                {localError ?? createError}
              </div>
            )}
            {success && (
              <div className="gba:rounded-md gba:bg-success/10 gba:p-3 gba:text-sm gba:text-success">
                {t('learning-assign-success')}
              </div>
            )}
            <div className="gba:flex gba:justify-end gba:gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('learning-cancel')}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={creating || !latestVersionId}>
                {creating && <Spinner className="gba:mr-2 gba:h-4 gba:w-4" />}
                {creating ? t('learning-assign-creating') : t('learning-assign-submit')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
