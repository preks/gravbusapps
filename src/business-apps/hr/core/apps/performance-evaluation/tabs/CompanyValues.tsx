import React, { useState } from 'react'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useTranslation,
  toast,
  Spinner
} from '@newwork/nw-design-system'
import { Plus, Warning as WarningIcon } from '@phosphor-icons/react'
import type { PerformanceCycle, ValueItemStored } from '../types'
import ValuesEditorModal, { ValueEditorValues } from '../ValuesEditorModal'
import translations from '../_i18n'

export interface CompanyValuesProps {
  valuesStore: ValueItemStored[]
  valuesLoading?: boolean
  valuesError?: string | null
  cycles: PerformanceCycle[]
  onSaveFromValuesModal: (values: ValueEditorValues) => void
  onDeleteValue: (id: string) => void
  onActivateValue: (id: string) => void
  onDeactivateValue: (id: string) => void
}

export const CompanyValues: React.FC<CompanyValuesProps> = ({
  valuesStore,
  valuesLoading,
  valuesError,
  cycles,
  onSaveFromValuesModal,
  onDeleteValue,
  onActivateValue,
  onDeactivateValue
}) => {
  const { t } = useTranslation(translations)
  const [isValuesModalOpen, setIsValuesModalOpen] = useState(false)
  const [editingValue, setEditingValue] = useState<ValueItemStored | null>(null)

  const handleAdd = () => {
    setEditingValue(null)
    setIsValuesModalOpen(true)
  }

  const handleSaveFromModal = async (values: ValueEditorValues) => {
    try {
      await Promise.resolve(onSaveFromValuesModal(values))
      setEditingValue(null)
      setIsValuesModalOpen(false)
    } catch {
      // Error already toasted by parent; keep modal open
    }
  }

  const handleDeactivateValue = (id: string) => {
    const usedInActiveCycle = cycles.some(c => c.status === 'Active' && (c.valueIds ?? []).includes(id))
    if (usedInActiveCycle) {
      toast.warning(t('values-error-cannot-deactivate-active-cycle'), {
        position: 'bottom-right',
        className: 'gba:text-base',
        icon: <WarningIcon size={18} weight="fill" className="gba:text-warning" />
      })
      return
    }
    onDeactivateValue(id)
  }

  return (
    <div className="gba:space-y-6">
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">{t('tab-values')}</CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              {valuesLoading && <Spinner className="gba:h-5 gba:w-5" data-testid="performance-values-loading" />}
              <Button variant="default" onClick={handleAdd} data-testid="performance-values-add-button">
                <Plus className="gba:mr-2" size={16} />
                {t('button-add')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {valuesError && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm"
              data-testid="performance-values-error"
            >
              {valuesError}
            </div>
          )}
          <div className="gba:border gba:rounded-lg gba:overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[24px]"></TableHead>
                  <TableHead>{t('field-title')}</TableHead>
                  <TableHead>{t('field-description')}</TableHead>
                  <TableHead>{t('table-status')}</TableHead>
                  <TableHead className="gba:text-right">{t('table-actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if (valuesLoading && valuesStore.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="gba:py-8 gba:text-center">
                          <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                        </TableCell>
                      </TableRow>
                    )
                  }
                  if (valuesStore.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground">
                          {t('empty-no-values')}
                        </TableCell>
                      </TableRow>
                    )
                  }
                  return valuesStore.map((v, i) => (
                    <TableRow key={v.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="gba:font-medium">{v.title}</TableCell>
                      <TableCell>{v.description}</TableCell>
                      <TableCell>
                        <Badge variant={v.recordState?.toLowerCase() === 'active' ? 'success' : 'secondary'}>
                          {v.recordState?.toLowerCase() === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:text-right">
                        <div className="gba:flex gba:justify-end gba:gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingValue(v)
                              setIsValuesModalOpen(true)
                            }}
                            aria-label="Edit Value"
                          >
                            {t('button-edit')}
                          </Button>
                          {v.recordState?.toLowerCase() === 'active' ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeactivateValue(v.id)}
                              data-testid={`value-deactivate-${v.id}`}
                            >
                              {t('button-deactivate')}
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onActivateValue(v.id)}
                              data-testid={`value-activate-${v.id}`}
                            >
                              {t('button-activate')}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteValue(v.id)}
                            data-testid={`value-delete-${v.id}`}
                          >
                            {t('button-delete')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ValuesEditorModal
        open={isValuesModalOpen}
        onOpenChange={open => setIsValuesModalOpen(open)}
        onSave={handleSaveFromModal}
        initialValues={
          editingValue
            ? {
                id: editingValue.id,
                version: editingValue.version,
                title: editingValue.title,
                description: editingValue.description,
                recordState: editingValue.recordState
              }
            : undefined
        }
      />
    </div>
  )
}

export default CompanyValues
