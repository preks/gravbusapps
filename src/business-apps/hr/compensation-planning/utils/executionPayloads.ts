import type { CompensationEmployeeProposal } from '../types/compensationPlanningTypes'

/**
 * Builds the exact payload format used by the adjust-employee-salary form
 * to trigger the adjustEmployeeSalary BPMN process.
 *
 * @see src/business-apps/hr/core/forms/adjust-employee-salary/AdjustEmployeeSalary.tsx
 */
export function buildSalaryAdjustmentPayload(
  proposal: CompensationEmployeeProposal,
  effectiveDate: string,
  initiatorEmployeeId: string,
  oldSalaryRecord?: {
    id: string
    activeFrom: string | null
    activeTo: string | null
    startDate: string | null
    endDate: string | null
    requestStatus: string | null
    requestDate: string | null
    decisionDate: string | null
    requestedPercent: number | null
    requestedAmount: number | null
    stockOptions: boolean | null
    notes: string | null
    salaryAdjustReasonRef: string | null
    decisionEmployeeId: string | null
    createdAt: string
    isDeleted: boolean
  }
) {
  const snapshot = proposal.currentSalarySnapshot

  return {
    event: 'pse_submit',
    employeeId: proposal.employeeId,
    initiatorEmployeeId,
    oldEmployeeSalary: oldSalaryRecord
      ? {
          id: oldSalaryRecord.id,
          employee: proposal.employeeId,
          annualGrossSalary: snapshot.annualGrossSalary,
          monthlyGrossSalary: snapshot.monthlyGrossSalary,
          hourlyGrossSalary: snapshot.hourlyGrossSalary,
          currencyRef: snapshot.currencyRef,
          activeFrom: oldSalaryRecord.activeFrom,
          activeTo: oldSalaryRecord.activeTo,
          startDate: oldSalaryRecord.startDate,
          endDate: null,
          requestStatus: oldSalaryRecord.requestStatus,
          requestDate: oldSalaryRecord.requestDate,
          decisionDate: oldSalaryRecord.decisionDate,
          requestedPercent: oldSalaryRecord.requestedPercent,
          requestedAmount: oldSalaryRecord.requestedAmount,
          stockOptions: oldSalaryRecord.stockOptions ?? false,
          notes: oldSalaryRecord.notes,
          salaryAdjustReasonRef: oldSalaryRecord.salaryAdjustReasonRef,
          decisionEmployee: oldSalaryRecord.decisionEmployeeId,
          createdAt: oldSalaryRecord.createdAt,
          isDeleted: oldSalaryRecord.isDeleted
        }
      : null,
    employeeSalary: {
      employee: proposal.employeeId,
      annualGrossSalary: proposal.proposedNewSalary,
      monthlyGrossSalary: proposal.proposedNewSalary == null ? null : proposal.proposedNewSalary / 12,
      hourlyGrossSalary: snapshot.hourlyGrossSalary,
      currencyRef: snapshot.currencyRef,
      salaryAdjustReasonRef: 'SalaryAdjustReason:v1:COMPENSATION_PLANNING',
      startDate: effectiveDate,
      notes: proposal.justification || `Compensation planning cycle: ${proposal.cycleId}`,
      stockOptions: false,
      endDate: null,
      requestStatus: null,
      requestDate: null,
      decisionDate: null,
      requestedPercent: proposal.proposedSalaryIncreasePercent,
      requestedAmount: proposal.proposedSalaryIncrease,
      decisionEmployee: null
    }
  }
}

/**
 * Builds the exact payload format used by the grant-employee-bonus form
 * to trigger the grantEmployeeBonus BPMN process.
 *
 * @see src/business-apps/hr/core/forms/grant-employee-bonus/GrantEmployeeBonus.tsx
 */
export function buildBonusPayload(
  proposal: CompensationEmployeeProposal,
  fiscalYear: number,
  managerEmployeeId: string
) {
  if (proposal.proposedBonus == null || proposal.proposedBonus === 0) return null

  const paymentDate = new Date()
  const paymentMonth = paymentDate.getMonth() + 1

  return {
    event: 'pse_submit',
    employeeIdManager: managerEmployeeId,
    requireManagerApproval: false,
    employeeBonus: {
      employee: proposal.employeeId,
      employeeBonusTypeRef: proposal.proposedBonusTypeRef || 'EmployeeBonusType:v1:PERFORMANCE_BONUS',
      amount: proposal.proposedBonus,
      currencyRef: proposal.currentSalarySnapshot.currencyRef,
      paymentDate: `${fiscalYear}-${String(paymentMonth).padStart(2, '0')}-01`,
      fiscalYear,
      notes: proposal.justification || `Compensation planning cycle: ${proposal.cycleId}`
    }
  }
}

/**
 * Prepares all execution payloads for a list of approved proposals.
 * This is called when the HR admin triggers execution after final approval.
 *
 * In the actual implementation, each payload will be used to start the
 * corresponding BPMN process via startProcess() or the Flow client.
 */
export function prepareExecutionBatch(
  approvedProposals: CompensationEmployeeProposal[],
  effectiveDate: string,
  fiscalYear: number,
  initiatorEmployeeId: string
) {
  const salaryPayloads: ReturnType<typeof buildSalaryAdjustmentPayload>[] = []
  const bonusPayloads: NonNullable<ReturnType<typeof buildBonusPayload>>[] = []

  for (const proposal of approvedProposals) {
    if (proposal.proposedSalaryIncrease != null && proposal.proposedSalaryIncrease > 0) {
      // TODO: When connected to backend, fetch the actual old salary record
      // via findActiveSalary() and EMPLOYEE_COMPENSATION_QUERY
      const payload = buildSalaryAdjustmentPayload(proposal, effectiveDate, initiatorEmployeeId)
      salaryPayloads.push(payload)
    }

    const bonusPayload = buildBonusPayload(proposal, fiscalYear, initiatorEmployeeId)
    if (bonusPayload) {
      bonusPayloads.push(bonusPayload)
    }
  }

  return { salaryPayloads, bonusPayloads }
}
