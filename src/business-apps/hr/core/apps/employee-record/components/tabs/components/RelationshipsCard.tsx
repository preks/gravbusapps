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
  Badge,
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

const MASK_PLACEHOLDER = '••••••••'

interface RelationshipsCardProps {
  employee: Employee
  accessToken: string
  isSelfView: boolean
  employeeRecordHrBackoffice: ScopePermissionCheckResult
}

function shouldMask(isSelfView: boolean, hasBackofficePermission: boolean): boolean {
  return !isSelfView && !hasBackofficePermission
}

const RelationshipsCard: React.FC<RelationshipsCardProps> = ({
  employee,
  accessToken,
  isSelfView,
  employeeRecordHrBackoffice
}) => {
  const { t } = useTranslation(translations)
  const masked = shouldMask(isSelfView, employeeRecordHrBackoffice.hasPermission === true)
  const [deleteTarget, setDeleteTarget] = useState<(typeof employee.relationship)[number] | null>(null)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const relationships = (employee.relationship || []).filter(rel => !deletedIds.has(rel.id))

  const formatField = (value: string | undefined | null) => {
    if (!value?.trim()) return '-'
    if (masked) return MASK_PLACEHOLDER
    return value
  }

  const buildContextData = (rel: (typeof relationships)[0]) => ({
    employeeId: employee.id,
    relationship: {
      id: rel.id,
      version: rel.version,
      firstName: rel.firstName,
      lastName: rel.lastName,
      typeRef: rel.typeRef,
      phoneNumber: rel.phoneNumber,
      isEmergencyContact: rel.isEmergencyContact
    }
  })

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || !accessToken) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${EMPLOYEES_API_URL}/deleteEmployeeRelationship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          employeeRelationship: {
            id: deleteTarget.id,
            version: deleteTarget.version,
            employeeId: employee.id,
            firstName: deleteTarget.firstName || '',
            lastName: deleteTarget.lastName || '',
            phoneNumber: deleteTarget.phoneNumber || '',
            email: deleteTarget.email || '',
            typeRef: deleteTarget.typeRef || '',
            emergencyContact: deleteTarget.isEmergencyContact
          }
        })
      })

      if (response.ok) {
        setDeletedIds(prev => new Set(prev).add(deleteTarget.id))
      }
    } catch {
      console.error('Failed to delete relationship entry')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, accessToken, employee.id])

  return (
    <Card data-testid="details-section-relationships">
      <CardContent className="gba:p-4">
        <div className="gba:mb-4 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
          <h3 className="gba:text-lg gba:font-semibold">{t('details-relationships')}</h3>
          <AppAction
            variant="create-secondary"
            data-testid="relationships-add-button"
            contexts={[
              { context: FlowContextName.updateEmployeeRelationship, contextData: { employeeId: employee?.id } }
            ]}
            prefixDataTestId="relationships-add"
            accessToken={accessToken}
            autoExecute={true}
          />
        </div>

        {relationships.length === 0 ? (
          <div className="gba:text-muted-foreground gba:text-sm gba:py-4">{t('details-relationships-no-entries')}</div>
        ) : (
          <ul className="gba:list-none gba:p-0 gba:m-0 gba:divide-y gba:divide-border">
            {relationships.map(rel => (
              <li
                key={rel.id}
                className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:py-3"
                data-testid={`relationship-entry-${rel.id}`}
              >
                <div className="gba:min-w-0 gba:flex-1">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:font-medium gba:text-foreground">
                      {masked ? MASK_PLACEHOLDER : `${rel.firstName || ''} ${rel.lastName || ''}`.trim() || '-'}
                    </span>
                    {rel.isEmergencyContact ? (
                      <Badge variant="secondary" data-testid={`relationship-emergency-${rel.id}`}>
                        {t('details-relationships-emergency')}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-0.5 gba:mt-1">
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {t('details-label-relationship-type')}:{' '}
                      {formatField(rel.type?.translations?.[0]?.value || rel.type?.value)}
                    </span>
                    {rel.phoneNumber ? (
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {t('details-label-phone-number')}:{' '}
                        {masked ? MASK_PLACEHOLDER : formatPhoneNumberWithCountryCode(rel.phoneNumber)}
                      </span>
                    ) : null}
                    {rel.email ? (
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {t('details-label-relationship-email')}: {formatField(rel.email)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="gba:flex gba:items-center gba:gap-1 gba:shrink-0">
                  <AppAction
                    variant="update-secondary"
                    data-testid={`relationship-edit-${rel.id}`}
                    contexts={[
                      {
                        context: FlowContextName.updateEmployeeRelationship,
                        contextData: buildContextData(rel)
                      }
                    ]}
                    prefixDataTestId={`relationship-edit-${rel.id}`}
                    accessToken={accessToken}
                    autoExecute={true}
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => setDeleteTarget(rel)}
                    data-testid={`relationship-delete-${rel.id}`}
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
          <AlertDialogContent data-testid="relationship-delete-confirm-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('delete-relationship-confirm-title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('delete-relationship-confirm-description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} data-testid="relationship-delete-cancel">
                {t('action-cancel')}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                data-testid="relationship-delete-confirm-action"
              >
                {isDeleting ? t('common-loading') : t('delete-relationship-confirm-button')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export default RelationshipsCard
