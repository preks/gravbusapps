import { create } from 'zustand'
import type {
  PayrollRun,
  PayrollRunStatus,
  PayrollCountry,
  SignOffData,
  AuditEvent,
  ExportOptions
} from '../types/payrollTypes'

interface PayrollRunState {
  payrollRun: PayrollRun | null
  selectedCompanyId: string | null
  selectedCompanyName: string | null
  selectedMonth: number
  selectedYear: number
  detectedCountry: PayrollCountry | null
  auditEvents: AuditEvent[]

  setCompany: (companyId: string, companyName: string) => void
  setMonth: (month: number, year: number) => void
  setDetectedCountry: (country: PayrollCountry | null) => void
  initializeRun: () => void
  updateStatus: (status: PayrollRunStatus) => void
  setSignOff: (data: SignOffData) => void
  addAuditEvent: (eventType: string, description: string, userId?: string, userName?: string) => void
  recordExport: (options: ExportOptions, employeeCount: number) => void
  reset: () => void
}

const now = () => new Date().toISOString()
const currentMonth = new Date().getMonth() + 1
const currentYear = new Date().getFullYear()

export const usePayrollRunStore = create<PayrollRunState>((set, get) => ({
  payrollRun: null,
  selectedCompanyId: null,
  selectedCompanyName: null,
  selectedMonth: currentMonth,
  selectedYear: currentYear,
  detectedCountry: null,
  auditEvents: [],

  setCompany: (companyId, companyName) => {
    set({ selectedCompanyId: companyId, selectedCompanyName: companyName, payrollRun: null })
    get().addAuditEvent('company_selected', `Selected company: ${companyName}`)
  },

  setMonth: (month, year) => {
    set({ selectedMonth: month, selectedYear: year, payrollRun: null })
    get().addAuditEvent('month_selected', `Selected period: ${year}-${String(month).padStart(2, '0')}`)
  },

  setDetectedCountry: country => {
    set({ detectedCountry: country })
  },

  initializeRun: () => {
    const state = get()
    if (!state.selectedCompanyId) return

    const run: PayrollRun = {
      id: `pr-${state.selectedYear}-${String(state.selectedMonth).padStart(2, '0')}-${state.selectedCompanyId.slice(0, 8)}`,
      month: state.selectedMonth,
      year: state.selectedYear,
      country: state.detectedCountry || 'DE',
      legalEntityId: state.selectedCompanyId,
      legalEntityName: state.selectedCompanyName || '',
      cutOffDate: new Date(state.selectedYear, state.selectedMonth - 1, 25).toISOString().split('T')[0],
      paymentDate: new Date(state.selectedYear, state.selectedMonth, 0).toISOString().split('T')[0],
      ownerUserId: 'current-user',
      status: 'in_progress',
      createdAt: now(),
      updatedAt: now()
    }

    set({ payrollRun: run })
    get().addAuditEvent(
      'payroll_run_created',
      `Payroll run created for ${run.legalEntityName} - ${run.year}-${String(run.month).padStart(2, '0')}`
    )
  },

  updateStatus: status => {
    const { payrollRun } = get()
    if (!payrollRun) return

    set({
      payrollRun: { ...payrollRun, status, updatedAt: now() }
    })
    get().addAuditEvent('status_changed', `Payroll run status changed to: ${status}`)
  },

  setSignOff: data => {
    const { payrollRun } = get()
    if (!payrollRun) return

    set({
      payrollRun: {
        ...payrollRun,
        preparedBy: data.preparedBy,
        preparedAt: data.preparedAt,
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt,
        reviewComment: data.comments,
        updatedAt: now()
      }
    })
    get().addAuditEvent(
      'signoff_completed',
      `Sign-off by ${data.reviewedBy || data.preparedBy}: ${data.approvalDecision || 'prepared'}`
    )
  },

  addAuditEvent: (eventType, description, userId = 'current-user', userName = 'Current User') => {
    set(state => ({
      auditEvents: [
        {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          eventType,
          description,
          userId,
          userName,
          timestamp: now()
        },
        ...state.auditEvents
      ]
    }))
  },

  recordExport: (options, employeeCount) => {
    get().addAuditEvent(
      'export_generated',
      `Export generated: ${options.mode}, ${employeeCount} employees, format: ${options.format}`
    )
  },

  reset: () => {
    set({
      payrollRun: null,
      selectedCompanyId: null,
      selectedCompanyName: null,
      selectedMonth: currentMonth,
      selectedYear: currentYear,
      detectedCountry: null,
      auditEvents: []
    })
  }
}))
