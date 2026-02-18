import React, { useState, useMemo, useEffect } from 'react'
import { Button, Alert, Label, AlertDescription } from '@newwork/nw-design-system'
import { usePerformanceEvaluationPeerForm } from '../context/PerformanceEvaluationPeerFormContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import MultiEmployeeSelectionModal, {
  MultiEmployeeOption
} from '../../feedback-request-form/components/MultiEmployeeSelectionModal'

const prefixDataTestId = 'PerformanceEvaluationPeerForm'

const PerformanceEvaluationPeerFormComponent: React.FC = () => {
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
    onCancel
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

  const peersPreview = useMemo(() => {
    const names = formValues.peerEmployeeNames ?? []
    if (names.length === 0) return ''
    const shown = names.slice(0, 3).join(', ')
    const extra = names.length > 3 ? ` +${names.length - 3}` : ''
    return `${shown}${extra}`
  }, [formValues.peerEmployeeNames])

  const title = getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_peer_form.title', 'Select Peers')

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-b gba:border-border">
        <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{title}</h2>
      </div>

      <div className="gba:flex-1 gba:px-6 gba:py-6 gba:space-y-4">
        {error && (
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_peer_form.peersLabel', 'Peers')}{' '}
            <span className="gba:text-destructive">*</span>
          </Label>
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <div className="gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:truncate">
              {peersPreview ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:performance_evaluation_peer_form.selectPeersPlaceholder',
                  'Select peers'
                )}
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(true)}
              data-testid={formatDataTestId(prefixDataTestId, 'OpenPeerSelect')}
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:performance_evaluation_peer_form.selectPeers',
                'Select peers'
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
        >
          {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isSubmitDisabled}
          onClick={onSubmit}
          data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_peer_form.submit', 'Submit')}
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
