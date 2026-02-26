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
import { usePerformanceEvaluationPeerApprove } from '../context/PerformanceEvaluationPeerApproveContext'
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
          <CardContent className="gba:pt-0">
            {peersLoading ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:py-4">
                <Spinner size="sm" />
                <p className="gba:text-sm gba:text-muted-foreground">{t('loading-peers')}</p>
              </div>
            ) : nominatedPeers.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">{t('no-peers')}</p>
            ) : (
              <ul
                className="gba:space-y-4 gba:list-none gba:pl-0"
                data-testid={formatDataTestId(prefixDataTestId, 'PeerList')}
              >
                {nominatedPeers.map((peer, index) => (
                  <li
                    key={peer.id}
                    className="gba:space-y-2 gba:py-2 gba:px-3 gba:rounded-md gba:bg-muted gba:border gba:border-border"
                    data-testid={formatDataTestId(prefixDataTestId, 'PeerItem', String(index))}
                  >
                    <div className="gba:text-sm gba:font-medium gba:text-foreground">{peer.name}</div>
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
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
        <Button
          type="button"
          variant="default"
          disabled={isBusy}
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
