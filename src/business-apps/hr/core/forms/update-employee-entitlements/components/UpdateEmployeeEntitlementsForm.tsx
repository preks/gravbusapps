import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import { useUpdateEmployeeEntitlementsContext } from '../context/UpdateEmployeeEntitlementsContext'
import UpdateEntitlementModal from './UpdateEntitlementModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Dialog,
  DialogContent
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'

type UpdateEmployeeEntitlementsFormValues = Record<string, unknown>

const UpdateEmployeeEntitlementsForm: React.FC = () => {
  const {
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    loading,
    error,
    isFixedEmployeeId,
    activeEmployeeId,
    fixedEmployeeName,
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
  const [selectedLine, setSelectedLine] = useState<any | null>(null)
  const allowedTypeIds = useMemo(() => new Set((absenceTypes || []).map((t: any) => t.id)), [absenceTypes])

  const canOpenRow = (row: any) => allowedTypeIds.has(row?.type?.id)
  const openModalForRow = (row: any) => {
    if (!canOpenRow(row)) return
    setSelectedLine({
      id: row.id,
      version: row.version,
      employeeId: row.employeeId,
      type: row.type,
      typeRef: row?.type?.id,
      available: row.available,
      pending: row.pending,
      approved: row.approved,
      total: row.total
    })
    setIsModalOpen(true)
  }

  const isEmployeeSelectionMissing = !selectedEmployeeId
  // Keep enabled to allow viewing options even when fixed

  const isAddDisabled = useMemo(() => {
    const tableData = entitlements || []
    const types = absenceTypes || []
    if (types.length === 0) return false
    const firstTypeRefs = new Set(tableData.map((item: any) => item?.type?.id))

    return types.every((t: any) => firstTypeRefs.has(t.id))
  }, [entitlements, absenceTypes])

  const totalItems = (entitlements || []).length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentItems = (entitlements || []).slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="gba:bg-card gba:rounded-2xl gba:flex gba:flex-col gba:min-h-[400px] gba:p-0 gba:[&>div[data-testid='update-employee-entitlements-form']]:!pt-0">
      <AppActionForm
        processType="update"
        form={form as any}
        formData={{}}
        submitEventType="pse_save"
        cancelEventType="pse_abort"
        submitButtonTestId="mileageRuleModal_btnSave"
        cancelButtonTestId="mileageRuleModal_btnDiscard"
        submitButtonText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.btn_update',
          'Update'
        )}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.cancel', 'Cancel')}
        isSubmitDisabled={isEmployeeSelectionMissing}
        data-testid="update-employee-entitlements-form"
        onSubmit={async () => ({ event: 'pse_save' })}
      >
        <div
          className="gba:flex-1 gba:flex gba:flex-col gba:justify-start"
          id="mileageRuleModal_containerMileageRule"
          data-testid="mileageRuleModal_containerMileageRule"
        >
          {/* Header-like section inside container (outer header will be in wrapper) */}
          <div id="mileageRuleModal_columnLayoutContainer" data-testid="mileageRuleModal_columnLayoutContainer">
            {/* Employee selector or fixed display */}
            {!isFixedEmployeeId ? (
              <div className="gba:mb-4">
                <div className="gba:font-semibold gba:mb-2">
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
                    <SelectTrigger className="gba:w-full">
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
            ) : (
              <div className="gba:mb-4">
                <div className="gba:font-semibold gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:working_hours_form.employee_label', 'Employee')}
                </div>
                <div
                  className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base"
                  data-testid="flw_updateEmployeeEntitlements_employee_fixed"
                >
                  <span>{fixedEmployeeName || '-'}</span>
                </div>
              </div>
            )}

            {/* Year display to match WorkingHoursSummary style */}
            <div className="gba:mb-4" data-testid="entitlements-year-display">
              <div className="gba:font-semibold gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:entitlements.year_of_entitlement', 'Year of Entitlement')}
              </div>
              <div className="gba:bg-muted gba:rounded-md gba:p-4 gba:text-base">
                <span data-testid="flw_updateEmployeeEntitlements_year">{currentYear}</span>
              </div>
            </div>

            {/* Add Entitlement button */}
            <div className="gba:mb-6">
              <Button
                variant="default"
                size="sm"
                data-testid="mileageRuleModal_btnAddDetail"
                disabled={isAddDisabled}
                onClick={() => {
                  setSelectedLine(null)
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
            <div className="gba:mb-8">
              <Table data-testid="entitlements-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.type',
                        'Type'
                      )}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_overview.side_bar.payment_status',
                        'Pending'
                      )}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_landing_page.upcoming_approved_badge',
                        'Approved'
                      )}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:new_goal.remaining', 'Remaining')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((row: any) => {
                    const remaining = Number(row.total || 0) - Number(row.approved || 0) - Number(row.pending || 0)
                    return (
                      <TableRow
                        key={row.id}
                        data-testid={`entitlements-table-row-${row.id}`}
                        className="gba:cursor-pointer gba:hover:bg-accent"
                        onClick={() => openModalForRow(row)}
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openModalForRow(row)
                          }
                        }}
                      >
                        <TableCell
                          data-testid={`entitlements-type-${row.id}`}
                          className="gba:cursor-pointer"
                          onClick={() => openModalForRow(row)}
                        >
                          {getCatalogValue(row.type)}
                        </TableCell>
                        <TableCell
                          data-testid={`entitlements-total-${row.id}`}
                          className="gba:cursor-pointer"
                          onClick={() => openModalForRow(row)}
                        >
                          {row.total ?? 0}
                        </TableCell>
                        <TableCell
                          data-testid={`entitlements-pending-${row.id}`}
                          className="gba:cursor-pointer"
                          onClick={() => openModalForRow(row)}
                        >
                          {row.pending ?? 0}
                        </TableCell>
                        <TableCell
                          data-testid={`entitlements-approved-${row.id}`}
                          className="gba:cursor-pointer"
                          onClick={() => openModalForRow(row)}
                        >
                          {row.approved ?? 0}
                        </TableCell>
                        <TableCell
                          data-testid={`entitlements-remaining-${row.id}`}
                          className="gba:cursor-pointer"
                          onClick={() => openModalForRow(row)}
                        >
                          {remaining}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="gba:flex gba:items-center gba:justify-between gba:mt-3">
                <div className="gba:text-sm">
                  {totalItems === 0
                    ? '0-0 of 0'
                    : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalItems)} of ${totalItems}`}
                </div>
                <div className="gba:flex gba:gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    data-testid="entitlements-prev-page"
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:list.previous', 'Previous')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    data-testid="entitlements-next-page"
                  >
                    {getTranslationFromI18nKeyAndLabel('lowcoder:list.next', 'Next')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Modal */}
            <Dialog
              open={isModalOpen}
              onOpenChange={open => {
                setIsModalOpen(open)
                if (!open) setSelectedLine(null)
              }}
            >
              <DialogContent data-testid="mileageRuleModal_modalExpenses">
                <UpdateEntitlementModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  selectedLine={selectedLine}
                  absenceTypes={absenceTypes}
                  employeeId={effectiveValue}
                  accessToken={accessToken}
                  year={currentYear}
                  onSuccess={async () => {
                    await reload()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </AppActionForm>
    </div>
  )
}

export default UpdateEmployeeEntitlementsForm
