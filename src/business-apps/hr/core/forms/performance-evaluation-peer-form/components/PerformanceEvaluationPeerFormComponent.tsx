import React, { useState, useEffect } from 'react'
import { Button, Alert, Label, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { usePerformanceEvaluationPeerForm } from '../context/PerformanceEvaluationPeerFormContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import FormHeader from '../../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import MultiEmployeeSelectionModal, {
  MultiEmployeeOption
} from '../../feedback-request-form/components/MultiEmployeeSelectionModal'
import translations from '../_i18n'

const prefixDataTestId = 'PerformanceEvaluationPeerForm'

const PerformanceEvaluationPeerFormComponent: React.FC = () => {
  const { t } = useTranslation(translations)
  const {
    formValues,
    setFormValues,
    isLoading,
    error,
    employees,
    employeesLoading,
    employeesError,
    searchEmployees,
    onSubmit,
    employeeForHeader,
    employeeForHeaderLoading
  } = usePerformanceEvaluationPeerForm()

  useEffect(() => {
    searchEmployees('')
  }, [searchEmployees])

  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleConfirmPeers = (ids: string[], selectedEmployees: MultiEmployeeOption[]) => {
    const selected =
      selectedEmployees?.length > 0
        ? selectedEmployees
        : employees.filter(e => ids.includes(e.id)).map(e => ({ id: e.id, name: e.name }))
    setFormValues({
      peerEmployeeIds: selected.map(s => s.id),
      peerEmployeeNames: selected.map(s => s.name)
    })
    setIsModalOpen(false)
  }

  const hasPeers = (formValues.peerEmployeeIds?.length ?? 0) > 0
  const isSubmitDisabled = isLoading || !hasPeers

  const peerNames = formValues.peerEmployeeNames ?? []
  const peerIds = formValues.peerEmployeeIds ?? []

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-white"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:flex-shrink-0">
        <FormHeader
          title={t('header-title')}
          flowIconUrl={flowIconUrl}
          employee={employeeForHeaderLoading ? null : (employeeForHeader ?? undefined)}
        />
      </div>

      <div className="gba:flex-1 gba:px-6 gba:py-6 gba:space-y-4">
        {error && (
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <Label className="gba:block gba:text-sm gba:font-medium">
              {t('peers-label')} <span className="gba:text-destructive">*</span>
            </Label>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(true)}
              data-testid={formatDataTestId(prefixDataTestId, 'OpenPeerSelect')}
            >
              {t('select-peers')}
            </Button>
          </div>
          {peerNames.length > 0 ? (
            <ul className="gba:space-y-2 gba:list-none gba:p-0 gba:m-0">
              {peerNames.map((name, index) => (
                <li
                  key={peerIds[index] ?? index}
                  className="gba:py-2 gba:px-3 gba:rounded-md gba:bg-muted/50 gba:border gba:border-border gba:text-base gba:font-medium"
                  data-testid={formatDataTestId(prefixDataTestId, 'PeerItem')}
                >
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">{t('select-peers-placeholder')}</p>
          )}
        </div>
      </div>

      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
        <Button
          type="button"
          variant="default"
          disabled={isSubmitDisabled}
          onClick={onSubmit}
          data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
        >
          {t('submit-button')}
        </Button>
      </div>

      <MultiEmployeeSelectionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        employees={employees.map(e => ({
          id: e.id,
          name: e.name,
          jobTitle: e.jobTitle,
          department: e.department,
          pictureThumbnail: e.pictureThumbnail,
          userId: e.userId
        }))}
        loading={employeesLoading}
        error={employeesError ?? undefined}
        onSearch={searchEmployees}
        initialSelectedIds={formValues.peerEmployeeIds ?? []}
        onConfirm={handleConfirmPeers}
      />
    </div>
  )
}

export default PerformanceEvaluationPeerFormComponent
