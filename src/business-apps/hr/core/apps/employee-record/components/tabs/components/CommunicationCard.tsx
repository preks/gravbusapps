'use client'

import React, { useCallback, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  Icon,
  useTranslation
} from '@newwork/nw-design-system'
import { TrashIcon } from '@phosphor-icons/react'
import { Employee } from '../../../hooks/useEmployeeData'
import { formatPhoneNumberWithCountryCode } from '../../../utils/formatters'
import translations from '../../../_i18n'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ScopePermissionCheckResult } from '@/common/hooks/useScopePermissionCheck'
import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'

const PHONE_CHANNEL_CODES = new Set(['Phone', 'Mobile'])
const MASK_PLACEHOLDER = '••••••••'

interface CommunicationCardProps {
  employee: Employee
  accessToken: string
  isSelfView: boolean
  employeeRecordHrBackoffice: ScopePermissionCheckResult
}

function shouldMask(isSelfView: boolean, hasBackofficePermission: boolean): boolean {
  return !isSelfView && !hasBackofficePermission
}

const CommunicationCard: React.FC<CommunicationCardProps> = ({
  employee,
  accessToken,
  isSelfView,
  employeeRecordHrBackoffice
}) => {
  const { t } = useTranslation(translations)
  const masked = shouldMask(isSelfView, employeeRecordHrBackoffice.hasPermission === true)
  const [deleteTarget, setDeleteTarget] = useState<(typeof employee.communication)[number] | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const communications = (employee.communication || []).filter(
    comm =>
      comm?.purpose === 'PRIVATE' &&
      comm?.value?.trim() &&
      !deletedIds.has(comm.id) &&
      comm.channel?.objectValue &&
      typeof comm.channel.objectValue === 'object' &&
      (comm.channel.objectValue as Record<string, unknown>).hr === true
  )

  const formatValue = (comm: (typeof communications)[0]) => {
    if (masked) return MASK_PLACEHOLDER
    const isPhone = PHONE_CHANNEL_CODES.has(comm.channel?.code || '')
    return isPhone ? formatPhoneNumberWithCountryCode(comm.value) : comm.value
  }

  const buildLabel = (comm: (typeof communications)[0]) => {
    const channelName = comm.channel?.translations?.[0]?.value || comm.channel?.value || comm.channel?.code || ''
    const typeName = comm.type?.translations?.[0]?.value || comm.type?.value || ''
    return typeName ? `${channelName} (${typeName})` : channelName
  }

  const buildContextData = (comm: (typeof communications)[0]) => ({
    employeeId: employee.id,
    communicationId: comm.id,
    channelRef: comm.channelRef,
    value: comm.value,
    purpose: comm.purpose,
    version: comm.version
  })

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || !accessToken) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${EMPLOYEES_API_URL}/deleteEmployeeCommunication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          employeeCommunication: {
            id: deleteTarget.id,
            version: deleteTarget.version,
            employeeId: employee.id,
            isDeleted: true
          }
        })
      })

      if (response.ok) {
        setDeletedIds(prev => new Set(prev).add(deleteTarget.id))
      }
    } catch {
      console.error('Failed to delete communication entry')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, accessToken, employee.id])

  return (
    <Card data-testid="details-section-communication">
      <CardContent className="gba:p-4">
        <div className="gba:mb-4 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
          <h3 className="gba:text-lg gba:font-semibold">{t('details-private-communication')}</h3>
          <AppAction
            variant="create-secondary"
            data-testid="private-communication-add-button"
            contexts={[
              { context: FlowContextName.updateEmployeeCommunication, contextData: { employeeId: employee?.id } }
            ]}
            prefixDataTestId="private-communication-add"
            accessToken={accessToken}
            autoExecute={true}
          />
        </div>

        {communications.length === 0 ? (
          <div className="gba:text-muted-foreground gba:text-sm gba:py-4">{t('details-communication-no-entries')}</div>
        ) : (
          <ul className="gba:list-none gba:p-0 gba:m-0 gba:divide-y gba:divide-border">
            {communications.map(comm => (
              <li
                key={comm.id}
                className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:py-3"
                data-testid={`communication-entry-${comm.id}`}
              >
                <div className="gba:min-w-0 gba:flex-1">
                  <span className="gba:text-xs gba:text-muted-foreground">{buildLabel(comm)}</span>
                  <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                    {formatValue(comm)}
                  </div>
                </div>

                <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                  <AppAction
                    variant="update-secondary"
                    data-testid={`communication-edit-${comm.id}`}
                    contexts={[
                      {
                        context: FlowContextName.updateEmployeeCommunication,
                        contextData: buildContextData(comm)
                      }
                    ]}
                    prefixDataTestId={`communication-edit-${comm.id}`}
                    accessToken={accessToken}
                    autoExecute={true}
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => setDeleteTarget(comm)}
                    data-testid={`communication-delete-${comm.id}`}
                  >
                    <Icon icon={TrashIcon} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={open => {
            if (!open && !isDeleting) setDeleteTarget(null)
          }}
        >
          <AlertDialogContent data-testid="communication-delete-confirm-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('delete-communication-confirm-title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('delete-communication-confirm-description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} data-testid="communication-delete-cancel">
                {t('action-cancel')}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                data-testid="communication-delete-confirm-action"
              >
                {isDeleting ? t('common-loading') : t('delete-communication-confirm-button')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export default CommunicationCard
