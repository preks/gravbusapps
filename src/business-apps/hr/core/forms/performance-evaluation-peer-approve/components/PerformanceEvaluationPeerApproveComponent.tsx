import React, { useState, useMemo } from 'react'
import {
  Button,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { EmployeeSelect } from '@/components/employee-select'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import {
  usePerformanceEvaluationPeerApprove,
  MIN_PEERS,
  MAX_PEERS
} from '../context/PerformanceEvaluationPeerApproveContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import FormHeader from '../../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import translations from '../_i18n'

const prefixDataTestId = 'PerformanceEvaluationPeerApprove'

const PerformanceEvaluationPeerApproveComponent: React.FC = () => {
  const { t } = useTranslation(translations)
  const {
    nominatedPeers,
    peersLoading,
    isLoading,
    error,
    onApprove,
    employeeForHeader,
    employeeForHeaderLoading,
    peerReplacements,
    setPeerReplacement,
    removeNominatedPeer,
    additionalSlots,
    addPeerSlot,
    removePeerSlot,
    setAdditionalPeerEmployee,
    totalPeerCount,
    canAddPeers,
    canRemovePeers,
    isValid,
    replacementEmployees,
    replacementEmployeesLoading,
    searchReplacementEmployees
  } = usePerformanceEvaluationPeerApprove()

  const employeeOptionsForSelect = useMemo<Employee[]>(
    () =>
      replacementEmployees.map(emp => ({
        id: emp.id,
        displayName: emp.name,
        firstName: emp.name.split(' ')[0] || '',
        lastName: emp.name.split(' ').slice(1).join(' ') || '',
        pictureThumbnail: emp.pictureThumbnail,
        userId: emp.userId,
        employeePosition: {
          jobPosition: emp.jobTitle ? { name: emp.jobTitle } : undefined,
          organizationalUnit: emp.department ? { name: emp.department } : undefined
        }
      })),
    [replacementEmployees]
  )

  const [approving, setApproving] = useState(false)

  const handleApprove = async () => {
    setApproving(true)
    try {
      await onApprove()
    } finally {
      setApproving(false)
    }
  }

  const isBusy = isLoading || approving || peersLoading

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

      <div className="gba:flex-1 gba:px-6 gba:py-6 gba:space-y-4 gba:overflow-auto">
        {error && (
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card variant="surface">
          <CardHeader>
            <CardTitle className="gba:text-base">{t('peers-label')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0 gba:space-y-3">
            <p className="gba:text-xs gba:text-muted-foreground gba:m-0">
              {t('peers-hint', { min: MIN_PEERS, max: MAX_PEERS })}
            </p>

            {peersLoading ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:py-4">
                <Spinner size="sm" />
                <p className="gba:text-sm gba:text-muted-foreground">{t('loading-peers')}</p>
              </div>
            ) : (
              <>
                {nominatedPeers.length === 0 && additionalSlots.length === 0 ? (
                  <p className="gba:text-sm gba:text-muted-foreground">{t('no-peers')}</p>
                ) : (
                  <ul
                    className="gba:space-y-4 gba:list-none gba:pl-0 gba:m-0"
                    data-testid={formatDataTestId(prefixDataTestId, 'PeerList')}
                  >
                    {nominatedPeers.map((peer, index) => (
                      <li
                        key={peer.id}
                        className="gba:space-y-2 gba:py-2 gba:px-3 gba:rounded-md gba:bg-muted gba:border gba:border-border"
                        data-testid={formatDataTestId(prefixDataTestId, 'PeerItem', String(index))}
                      >
                        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                          <div className="gba:text-sm gba:font-medium gba:text-foreground">{peer.name}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            disabled={!canRemovePeers || isBusy}
                            onClick={() => removeNominatedPeer(peer.id)}
                            data-testid={formatDataTestId(prefixDataTestId, 'RemoveNominated', peer.id)}
                            className="gba:text-destructive gba:hover:text-destructive gba:shrink-0"
                          >
                            {t('remove-button')}
                          </Button>
                        </div>
                        <div className="gba:space-y-1">
                          <Label className="gba:text-xs gba:font-normal gba:text-muted-foreground">
                            {t('replace-with-label')}
                          </Label>
                          <EmployeeSelect
                            value={peerReplacements[peer.id] ?? null}
                            onValueChange={value => setPeerReplacement(peer.id, value ?? null)}
                            placeholder={t('replace-with-placeholder')}
                            employees={employeeOptionsForSelect}
                            loading={replacementEmployeesLoading}
                            onSearch={searchReplacementEmployees}
                            data-testid={formatDataTestId(prefixDataTestId, 'ReplaceSelect', peer.id)}
                            className="gba:w-full"
                          />
                        </div>
                      </li>
                    ))}

                    {additionalSlots.map((slot, index) => (
                      <li
                        key={slot.slotId}
                        className="gba:space-y-2 gba:py-2 gba:px-3 gba:rounded-md gba:bg-muted gba:border gba:border-border"
                        data-testid={formatDataTestId(prefixDataTestId, 'AdditionalSlot', String(index))}
                      >
                        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                          <Label className="gba:text-xs gba:font-normal gba:text-muted-foreground">
                            {t('additional-peer-label')}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            disabled={isBusy}
                            onClick={() => removePeerSlot(slot.slotId)}
                            data-testid={formatDataTestId(prefixDataTestId, 'RemoveSlot', slot.slotId)}
                            className="gba:text-destructive gba:hover:text-destructive gba:shrink-0"
                          >
                            {t('remove-button')}
                          </Button>
                        </div>
                        <EmployeeSelect
                          value={slot.employeeId}
                          onValueChange={value => setAdditionalPeerEmployee(slot.slotId, value ?? null)}
                          placeholder={t('select-peer-placeholder')}
                          employees={employeeOptionsForSelect}
                          loading={replacementEmployeesLoading}
                          onSearch={searchReplacementEmployees}
                          data-testid={formatDataTestId(prefixDataTestId, 'AdditionalSelect', slot.slotId)}
                          className="gba:w-full"
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <p className="gba:text-xs gba:text-muted-foreground gba:m-0">
                    {t('peers-count', { count: totalPeerCount, min: MIN_PEERS, max: MAX_PEERS })}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={!canAddPeers || isBusy}
                    onClick={addPeerSlot}
                    data-testid={formatDataTestId(prefixDataTestId, 'AddPeerButton')}
                  >
                    {t('add-peer-button')}
                  </Button>
                </div>

                {totalPeerCount > 0 && totalPeerCount < MIN_PEERS && (
                  <p
                    className="gba:text-xs gba:text-destructive gba:m-0"
                    data-testid={formatDataTestId(prefixDataTestId, 'MinPeersError')}
                  >
                    {t('peers-min-error', { min: MIN_PEERS })}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
        <Button
          type="button"
          variant="default"
          disabled={isBusy || !isValid}
          onClick={handleApprove}
          data-testid={formatDataTestId(prefixDataTestId, 'ApproveButton')}
        >
          {t('approve-button')}
        </Button>
      </div>
    </div>
  )
}

export default PerformanceEvaluationPeerApproveComponent
