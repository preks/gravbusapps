import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import '@newwork/nw-design-system/style'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useUpdateEmployeeEntitlementsContext } from '../context/UpdateEmployeeEntitlementsContext'
import UpdateEntitlementModal from './UpdateEntitlementModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Spinner
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import EntitlementsTable from './EntitlementsTable'

type UpdateEmployeeEntitlementsFormValues = Record<string, unknown>

interface UpdateEmployeeEntitlementsFormProps {
  onCancel?: () => void | Promise<void>
}

const UpdateEmployeeEntitlementsForm: React.FC<UpdateEmployeeEntitlementsFormProps> = ({ onCancel }) => {
  const {
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    loading,
    error,
    isFixedEmployeeId,
    activeEmployeeId,
    employeeHeaderInfo,
    entitlements,
    absenceTypes,
    reload,
    accessToken
  } = useUpdateEmployeeEntitlementsContext()
  const effectiveValue = activeEmployeeId || selectedEmployeeId

  const form = useForm<UpdateEmployeeEntitlementsFormValues>({
    defaultValues: {},
    mode: 'onChange'
  })

  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const [employeeSelectTouched, setEmployeeSelectTouched] = useState(false)
  const pageSize = 5
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isEmployeeSelectionMissing = !selectedEmployeeId
  // Keep enabled to allow viewing options even when fixed

  // Pagination handled inside EntitlementsTable

  // Until data is loaded from the query, render only a loading state (no fields)
  if (loading) {
    return (
      <div className="gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[400px] gba:p-0 gba:[&>div[data-testid='update-employee-entitlements-form']]:!pt-0">
        <div className="gba:flex gba:flex-1 gba:min-h-[300px] gba:items-center gba:justify-center">
          <Spinner size="lg" data-testid="update-employee-entitlements-loading" />
        </div>
      </div>
    )
  }

  return (
    <div className="gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[400px] gba:p-0 gba:min-w-0 gba:max-w-full gba:overflow-x-hidden gba:[&>div[data-testid='update-employee-entitlements-form']]:!pt-0">
      <AppActionForm
        processType="update"
        form={form as any}
        formData={{}}
        submitEventType="pse_save"
        cancelEventType="pse_abort"
        disableFormSubmission
        data-testid="update-employee-entitlements-form"
        onSubmit={async () => ({ event: 'pse_save' })}
      >
        <div
          className="gba:flex-1 gba:flex gba:flex-col gba:justify-start gba:min-w-0 gba:max-w-full gba:overflow-x-hidden"
          id="mileageRuleModal_containerMileageRule"
          data-testid="mileageRuleModal_containerMileageRule"
        >
          {/* Header-like section inside container (outer header will be in wrapper) */}
          <div
            id="mileageRuleModal_columnLayoutContainer"
            data-testid="mileageRuleModal_columnLayoutContainer"
            className="gba:min-w-0 gba:max-w-full gba:overflow-x-hidden"
          >
            {!isFixedEmployeeId && (
              <div className="gba:mb-4">
                <div className="gba:font-semibold gba:text-sm gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.employee_label', 'Employee')}
                  <span className="gba:text-destructive"> *</span>
                </div>
                <div data-testid="flw_updateEmployeeEntitlements_employee" className="gba:relative">
                  <Select
                    value={effectiveValue}
                    onValueChange={v => {
                      setEmployeeSelectTouched(true)
                      setSelectedEmployeeId(v)
                    }}
                  >
                    <SelectTrigger className="gba:w-full gba:text-sm">
                      <SelectValue
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'lowcoder:working_hours_form.employee_placeholder',
                          'Select...'
                        )}
                      />
                    </SelectTrigger>
                    {employees.length > 0 && (
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem
                            key={emp.id}
                            value={emp.id}
                          >{`${emp.firstName || ''} ${emp.lastName || ''}`}</SelectItem>
                        ))}
                      </SelectContent>
                    )}
                  </Select>
                </div>
                {employeeSelectTouched && isEmployeeSelectionMissing && !loading && employees.length > 0 && (
                  <div className="gba:mt-2 gba:text-destructive" data-testid="working-hours-employee-select-error">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:working_hours_form.employee_validation_message',
                      'The Employee field is required. Please select an employee.'
                    )}
                  </div>
                )}
                {loading && (
                  <div className="gba:mt-2">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_termination.load_employee_text',
                      'Loading employee info...'
                    )}
                  </div>
                )}
                {error && <div className="gba:mt-2 gba:text-destructive">{error}</div>}
              </div>
            )}

            {/* Add Entitlement button */}
            <div className="gba:mb-6">
              <Button
                variant="default"
                size="sm"
                data-testid="mileageRuleModal_btnAddDetail"
                onClick={() => {
                  setIsModalOpen(true)
                }}
              >
                <PlusIcon className="gba:h-4 gba:w-4" />
                <span className="gba:ml-2">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.add_entitlements', 'Add Entitlement')}
                </span>
              </Button>
            </div>

            {/* Entitlements table */}
            <EntitlementsTable entitlements={entitlements || []} page={page} setPage={setPage} pageSize={pageSize} />

            {/* Modal */}
            <Dialog
              open={isModalOpen}
              onOpenChange={open => {
                setIsModalOpen(open)
              }}
            >
              <DialogContent
                className="gba:h-screen gba:max-h-screen gba:!rounded-none"
                data-testid="mileageRuleModal_modalExpenses"
              >
                <DialogTitle className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:entitlements.update_entitlements',
                    'Update Entitlements'
                  )}
                </DialogTitle>
                <UpdateEntitlementModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  selectedLine={null}
                  absenceTypes={absenceTypes}
                  employeeId={effectiveValue}
                  accessToken={accessToken}
                  year={currentYear}
                  employeeHeaderInfo={employeeHeaderInfo}
                  onSuccess={async () => {
                    await reload()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Custom Actions to mirror UpdateEntitlementModal */}
        <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
          <Button
            variant="outline"
            data-testid="hcm_createHrAbsence_cancelButton"
            onClick={() => {
              if (onCancel) {
                void Promise.resolve(onCancel())
              }
            }}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.cancel', 'Cancel')}
          </Button>
        </div>
      </AppActionForm>
    </div>
  )
}

export default UpdateEmployeeEntitlementsForm
