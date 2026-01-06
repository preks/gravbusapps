import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  FileText,
  LayoutGrid,
  Target,
  RefreshCw,
  Trash2,
  Zap,
  ChevronRight,
  Calendar,
  User,
  Clock,
  AlertCircle,
  Microscope
} from 'lucide-react'
import { useCalculationTrace } from './hooks/useCalculationTrace'
import { useExpenseDataLoader } from './hooks/useExpenseDataLoader'
import { AnalysisModal } from './components/AnalysisModal'
import { EmployeeSelect } from '@/components/employee-select'
import { BusinessAppContextProps } from '@/business-apps/types'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

type CalculationDebuggerProps = BusinessAppContextProps

// Status badge colors
const statusColors: Record<string, string> = {
  CREATED: 'gba:bg-slate-100 gba:text-slate-700',
  PREPARED: 'gba:bg-slate-100 gba:text-slate-700',
  PENDING: 'gba:bg-amber-100 gba:text-amber-700',
  ASSIGNED: 'gba:bg-blue-100 gba:text-blue-700',
  APPROVED: 'gba:bg-emerald-100 gba:text-emerald-700',
  REJECTED: 'gba:bg-red-100 gba:text-red-700',
  RETURNED: 'gba:bg-orange-100 gba:text-orange-700',
  VERIFIED: 'gba:bg-teal-100 gba:text-teal-700',
  BOOKED: 'gba:bg-cyan-100 gba:text-cyan-700',
  PAID: 'gba:bg-emerald-100 gba:text-emerald-700',
  CLOSED: 'gba:bg-gray-100 gba:text-gray-600',
  DISCARDED: 'gba:bg-gray-100 gba:text-gray-500',
  TRANSFERRED: 'gba:bg-purple-100 gba:text-purple-700'
}

const CalculationDebugger: React.FC<CalculationDebuggerProps> = props => {
  const { accessToken } = props
  const [activeTab, setActiveTab] = useState<'requests' | 'plans' | 'rule'>('requests')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [debugDate, setDebugDate] = useState(new Date().toISOString().split('T')[0])
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  const {
    traces,
    currentTrace,
    analysis,
    loading: traceLoading,
    error: traceError,
    fetchTraces,
    triggerTraceForPlan,
    analyzeRequest,
    debugRuleAssignment,
    clearTraces
  } = useCalculationTrace(accessToken)

  const {
    requests,
    plans,
    requestsTotal,
    plansTotal,
    loading: dataLoading,
    error: dataError,
    loadRequests,
    loadPlans,
    loadAll
  } = useExpenseDataLoader(accessToken)

  const loading = traceLoading || dataLoading
  const error = traceError || dataError

  useEffect(() => {
    loadAll('', 100)
  }, [])

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value)
      if (activeTab === 'requests') {
        loadRequests(value, 100)
      } else if (activeTab === 'plans') {
        loadPlans(value, 100)
      }
    },
    [activeTab, loadRequests, loadPlans]
  )

  const handleAnalyzeRequest = async (requestId: string) => {
    setSelectedRequestId(requestId)
    await analyzeRequest(requestId)
    setShowAnalysisModal(true)
  }

  const handleDebugPlan = async (planId: string) => {
    setSelectedPlanId(planId)
    await triggerTraceForPlan(planId)
    setShowAnalysisModal(true)
  }

  const handleDebugRule = async () => {
    if (selectedEmployee?.id) {
      await debugRuleAssignment(selectedEmployee.id, new Date(debugDate))
      setShowAnalysisModal(true)
    }
  }

  const handleEmployeeChange = (employee: Employee | null) => {
    setSelectedEmployee(employee)
  }

  const getStatusBadge = (status: string) => {
    return statusColors[status] || 'gba:bg-gray-100 gba:text-gray-700'
  }

  const formatCurrency = (value?: number | null, currency?: string | null) => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(value)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const renderRequestsList = () => (
    <div className="gba:space-y-2 gba:max-h-[520px] gba:overflow-y-auto">
      {requests.length === 0 ? (
        <div className="gba:text-center gba:py-12 gba:text-gray-400">
          {dataLoading ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
              <div className="gba:w-8 gba:h-8 gba:border-2 gba:border-gray-300 gba:border-t-indigo-500 gba:rounded-full gba:animate-spin" />
              <span className="gba:text-sm">Loading requests...</span>
            </div>
          ) : (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <FileText className="gba:w-10 gba:h-10 gba:text-gray-300" />
              <span className="gba:text-sm">No expense requests found</span>
            </div>
          )}
        </div>
      ) : (
        requests.map(req => (
          <div
            key={req.id}
            className={`gba:p-4 gba:rounded-lg gba:border gba:cursor-pointer gba:transition-all ${
              selectedRequestId === req.id
                ? 'gba:border-indigo-500 gba:bg-indigo-50/50 gba:shadow-sm'
                : 'gba:border-gray-100 gba:bg-white hover:gba:border-gray-200 hover:gba:shadow-sm'
            }`}
            onClick={() => setSelectedRequestId(req.id)}
          >
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:font-semibold gba:text-sm gba:text-gray-900">{req.code || 'No Code'}</span>
                  <span
                    className={`gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium ${getStatusBadge(req.status)}`}
                  >
                    {req.status}
                  </span>
                </div>
                <p className="gba:text-sm gba:text-gray-500 gba:truncate gba:mt-1">{req.title || 'Untitled'}</p>
                <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2 gba:text-xs gba:text-gray-400">
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <Calendar className="gba:w-3 gba:h-3" />
                    {formatDate(req.requestDate || req.startDate)}
                  </span>
                  {req.employeeName && (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <User className="gba:w-3 gba:h-3" />
                      {req.employeeName}
                    </span>
                  )}
                </div>
              </div>
              <div className="gba:text-right">
                <div className="gba:font-semibold gba:text-sm gba:text-gray-900">
                  {formatCurrency(req.totalAmount, req.currencyCode)}
                </div>
                {req.planCode && <div className="gba:text-xs gba:text-gray-400 gba:mt-1">Plan: {req.planCode}</div>}
              </div>
            </div>

            {selectedRequestId === req.id && (
              <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-gray-100">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleAnalyzeRequest(req.id)
                  }}
                  disabled={loading}
                  className="gba:w-full gba:bg-indigo-600 gba:text-white gba:py-2.5 gba:px-4 gba:rounded-lg gba:text-sm gba:font-medium hover:gba:bg-indigo-700 disabled:gba:opacity-50 gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2"
                >
                  <Microscope className="gba:w-4 gba:h-4" />
                  <span>Analyze Calculation</span>
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )

  const renderPlansList = () => (
    <div className="gba:space-y-2 gba:max-h-[520px] gba:overflow-y-auto">
      {plans.length === 0 ? (
        <div className="gba:text-center gba:py-12 gba:text-gray-400">
          {dataLoading ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
              <div className="gba:w-8 gba:h-8 gba:border-2 gba:border-gray-300 gba:border-t-teal-500 gba:rounded-full gba:animate-spin" />
              <span className="gba:text-sm">Loading plans...</span>
            </div>
          ) : (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <LayoutGrid className="gba:w-10 gba:h-10 gba:text-gray-300" />
              <span className="gba:text-sm">No expense plans found</span>
            </div>
          )}
        </div>
      ) : (
        plans.map(plan => (
          <div
            key={plan.id}
            className={`gba:p-4 gba:rounded-lg gba:border gba:cursor-pointer gba:transition-all ${
              selectedPlanId === plan.id
                ? 'gba:border-teal-500 gba:bg-teal-50/50 gba:shadow-sm'
                : 'gba:border-gray-100 gba:bg-white hover:gba:border-gray-200 hover:gba:shadow-sm'
            }`}
            onClick={() => setSelectedPlanId(plan.id)}
          >
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:font-semibold gba:text-sm gba:text-gray-900">{plan.code || 'No Code'}</span>
                  <span
                    className={`gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium ${getStatusBadge(plan.status)}`}
                  >
                    {plan.status}
                  </span>
                  {plan.hasRequests && (
                    <span className="gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:bg-blue-50 gba:text-blue-600">
                      Has Requests
                    </span>
                  )}
                </div>
                <p className="gba:text-sm gba:text-gray-500 gba:truncate gba:mt-1">{plan.title || 'Untitled'}</p>
                <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2 gba:text-xs gba:text-gray-400">
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <Calendar className="gba:w-3 gba:h-3" />
                    {formatDate(plan.planDate || plan.startDate)}
                  </span>
                  {plan.employeeName && (
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <User className="gba:w-3 gba:h-3" />
                      {plan.employeeName}
                    </span>
                  )}
                </div>
              </div>
              <div className="gba:text-right">
                <div className="gba:font-semibold gba:text-sm gba:text-gray-900">
                  {formatCurrency(plan.totalAmount, plan.currencyCode)}
                </div>
                {plan.requestType && <div className="gba:text-xs gba:text-gray-400 gba:mt-1">{plan.requestType}</div>}
              </div>
            </div>

            {selectedPlanId === plan.id && (
              <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-gray-100">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleDebugPlan(plan.id)
                  }}
                  disabled={loading}
                  className="gba:w-full gba:bg-teal-600 gba:text-white gba:py-2.5 gba:px-4 gba:rounded-lg gba:text-sm gba:font-medium hover:gba:bg-teal-700 disabled:gba:opacity-50 gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2"
                >
                  <Microscope className="gba:w-4 gba:h-4" />
                  <span>Analyze Calculation</span>
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="gba:min-h-screen gba:bg-gray-50">
      {/* Header */}
      <div className="gba:bg-white gba:border-b gba:border-gray-200">
        <div className="gba:max-w-7xl gba:mx-auto gba:px-6 gba:py-5">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:w-12 gba:h-12 gba:bg-gradient-to-br gba:from-indigo-500 gba:to-purple-600 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:shadow-lg gba:shadow-indigo-500/25">
              <Microscope className="gba:w-6 gba:h-6 gba:text-white" />
            </div>
            <div>
              <h1 className="gba:text-xl gba:font-semibold gba:text-gray-900">Calculation Debugger</h1>
              <p className="gba:text-sm gba:text-gray-500">Trace expense calculations step-by-step</p>
            </div>
          </div>
        </div>
      </div>

      <div className="gba:max-w-7xl gba:mx-auto gba:p-6">
        {/* Tabs */}
        <div className="gba:flex gba:gap-1 gba:mb-6 gba:bg-white gba:p-1.5 gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200">
          <button
            onClick={() => {
              setActiveTab('requests')
              loadRequests(searchTerm, 100)
            }}
            className={`gba:flex-1 gba:px-4 gba:py-2.5 gba:rounded-lg gba:font-medium gba:text-sm gba:transition-all gba:flex gba:items-center gba:justify-center gba:gap-2 ${
              activeTab === 'requests'
                ? 'gba:bg-indigo-600 gba:text-white gba:shadow-sm'
                : 'gba:text-gray-600 hover:gba:bg-gray-50'
            }`}
          >
            <FileText className="gba:w-4 gba:h-4" />
            <span>Requests</span>
            <span
              className={`gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${activeTab === 'requests' ? 'gba:bg-white/20' : 'gba:bg-gray-100'}`}
            >
              {requestsTotal}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('plans')
              loadPlans(searchTerm, 100)
            }}
            className={`gba:flex-1 gba:px-4 gba:py-2.5 gba:rounded-lg gba:font-medium gba:text-sm gba:transition-all gba:flex gba:items-center gba:justify-center gba:gap-2 ${
              activeTab === 'plans'
                ? 'gba:bg-teal-600 gba:text-white gba:shadow-sm'
                : 'gba:text-gray-600 hover:gba:bg-gray-50'
            }`}
          >
            <LayoutGrid className="gba:w-4 gba:h-4" />
            <span>Plans</span>
            <span
              className={`gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${activeTab === 'plans' ? 'gba:bg-white/20' : 'gba:bg-gray-100'}`}
            >
              {plansTotal}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rule')}
            className={`gba:flex-1 gba:px-4 gba:py-2.5 gba:rounded-lg gba:font-medium gba:text-sm gba:transition-all gba:flex gba:items-center gba:justify-center gba:gap-2 ${
              activeTab === 'rule'
                ? 'gba:bg-amber-500 gba:text-white gba:shadow-sm'
                : 'gba:text-gray-600 hover:gba:bg-gray-50'
            }`}
          >
            <Target className="gba:w-4 gba:h-4" />
            <span>Rule Lookup</span>
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-xl gba:p-4 gba:mb-6">
            <div className="gba:flex gba:items-start gba:gap-3 gba:text-red-700">
              <AlertCircle className="gba:w-5 gba:h-5 gba:flex-shrink-0 gba:mt-0.5" />
              <div>
                <div className="gba:font-medium">Error</div>
                <div className="gba:text-sm gba:mt-0.5 gba:text-red-600">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-3 gba:gap-6">
          {/* Left Panel */}
          <div className="gba:space-y-4">
            {(activeTab === 'requests' || activeTab === 'plans') && (
              <>
                {/* Search */}
                <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200 gba:p-4">
                  <div className="gba:relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="Search by code, title, or ID..."
                      className="gba:w-full gba:pl-10 gba:pr-4 gba:py-2.5 gba:border gba:border-gray-200 gba:rounded-lg gba:text-sm gba:bg-gray-50 focus:gba:bg-white focus:gba:ring-2 focus:gba:ring-indigo-500/20 focus:gba:border-indigo-500 gba:transition-all gba:outline-none"
                    />
                    <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-gray-400" />
                  </div>
                </div>

                {/* List */}
                <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200 gba:p-4">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                    <h3 className="gba:font-medium gba:text-gray-900">
                      {activeTab === 'requests' ? 'Expense Requests' : 'Expense Plans'}
                    </h3>
                    <button
                      onClick={() => loadAll(searchTerm, 100)}
                      disabled={loading}
                      className="gba:text-xs gba:text-gray-500 hover:gba:text-gray-700 gba:font-medium gba:flex gba:items-center gba:gap-1 gba:transition-colors"
                    >
                      <RefreshCw className={`gba:w-3 gba:h-3 ${loading ? 'gba:animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  {activeTab === 'requests' ? renderRequestsList() : renderPlansList()}
                </div>
              </>
            )}

            {activeTab === 'rule' && (
              <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200 gba:p-5">
                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-5">
                  <div className="gba:w-10 gba:h-10 gba:bg-amber-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                    <Target className="gba:w-5 gba:h-5 gba:text-amber-600" />
                  </div>
                  <div>
                    <h3 className="gba:font-medium gba:text-gray-900">Rule Lookup</h3>
                    <p className="gba:text-xs gba:text-gray-500">Find applicable expense rule</p>
                  </div>
                </div>

                <div className="gba:space-y-4">
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:block gba:mb-2">
                      Employee
                    </label>
                    <EmployeeSelect
                      value={selectedEmployee?.id || null}
                      onEmployeeChange={handleEmployeeChange}
                      accessToken={accessToken}
                      businessAppContext={props}
                      placeholder="Search employee..."
                      searchPlaceholder="Type to search..."
                    />
                  </div>
                  <div>
                    <label className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:block gba:mb-2">
                      Allowance Date
                    </label>
                    <input
                      type="date"
                      value={debugDate}
                      onChange={e => setDebugDate(e.target.value)}
                      className="gba:w-full gba:px-3 gba:py-2.5 gba:border gba:border-gray-200 gba:rounded-lg gba:text-sm gba:bg-gray-50 focus:gba:bg-white focus:gba:ring-2 focus:gba:ring-amber-500/20 focus:gba:border-amber-500 gba:transition-all gba:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleDebugRule}
                    disabled={loading || !selectedEmployee?.id}
                    className="gba:w-full gba:bg-amber-500 gba:text-white gba:py-2.5 gba:rounded-lg gba:font-medium gba:text-sm hover:gba:bg-amber-600 disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="gba:w-4 gba:h-4 gba:border-2 gba:border-white/30 gba:border-t-white gba:rounded-full gba:animate-spin" />
                        <span>Looking up...</span>
                      </>
                    ) : (
                      <>
                        <Target className="gba:w-4 gba:h-4" />
                        <span>Find Rule</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200 gba:p-4">
              <h3 className="gba:font-medium gba:text-gray-900 gba:mb-3 gba:flex gba:items-center gba:gap-2">
                <Zap className="gba:w-4 gba:h-4 gba:text-gray-400" />
                Quick Actions
              </h3>
              <div className="gba:space-y-2">
                <button
                  onClick={fetchTraces}
                  disabled={loading}
                  className="gba:w-full gba:bg-gray-50 gba:text-gray-700 gba:py-2.5 gba:rounded-lg gba:text-sm gba:font-medium hover:gba:bg-gray-100 gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2 gba:border gba:border-gray-200"
                >
                  <Clock className="gba:w-4 gba:h-4" />
                  Load Recent Traces
                </button>
                <button
                  onClick={clearTraces}
                  className="gba:w-full gba:bg-gray-50 gba:text-gray-700 gba:py-2.5 gba:rounded-lg gba:text-sm gba:font-medium hover:gba:bg-gray-100 gba:transition-colors gba:flex gba:items-center gba:justify-center gba:gap-2 gba:border gba:border-gray-200"
                >
                  <Trash2 className="gba:w-4 gba:h-4" />
                  Clear Results
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:gba:col-span-2 gba:space-y-4">
            {/* Empty state */}
            {!analysis && !currentTrace && !loading && (
              <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200 gba:p-16 gba:text-center">
                <div className="gba:w-16 gba:h-16 gba:bg-gray-100 gba:rounded-2xl gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-6">
                  <Microscope className="gba:w-8 gba:h-8 gba:text-gray-400" />
                </div>
                <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-2">Ready to Debug</h3>
                <p className="gba:text-gray-500 gba:max-w-sm gba:mx-auto gba:mb-8 gba:text-sm">
                  Select an expense request or plan to analyze how its amounts were calculated.
                </p>
                <div className="gba:flex gba:items-center gba:justify-center gba:gap-8 gba:text-sm gba:text-gray-400">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-gray-100 gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
                      1
                    </div>
                    <span>Select item</span>
                  </div>
                  <ChevronRight className="gba:w-4 gba:h-4" />
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-gray-100 gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
                      2
                    </div>
                    <span>Click Analyze</span>
                  </div>
                  <ChevronRight className="gba:w-4 gba:h-4" />
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-gray-100 gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
                      3
                    </div>
                    <span>Review trace</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200 gba:p-16 gba:text-center">
                <div className="gba:w-12 gba:h-12 gba:border-3 gba:border-gray-200 gba:border-t-indigo-500 gba:rounded-full gba:animate-spin gba:mx-auto gba:mb-4" />
                <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">Analyzing...</h3>
                <p className="gba:text-gray-500 gba:mt-1 gba:text-sm">Tracing calculation steps</p>
              </div>
            )}

            {/* Recent Traces */}
            {traces.length > 0 && !currentTrace && !loading && (
              <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-200 gba:p-4">
                <h3 className="gba:font-medium gba:text-gray-900 gba:mb-3 gba:flex gba:items-center gba:gap-2">
                  <Clock className="gba:w-4 gba:h-4 gba:text-gray-400" />
                  Recent Traces ({traces.length})
                </h3>
                <div className="gba:space-y-2 gba:max-h-[300px] gba:overflow-y-auto">
                  {traces.slice(0, 10).map(trace => (
                    <div
                      key={trace.traceId}
                      className="gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:text-sm gba:cursor-pointer hover:gba:bg-gray-100 gba:transition-colors gba:border gba:border-gray-100"
                    >
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <div>
                          <span className="gba:font-medium gba:text-gray-900">{trace.entityType}</span>
                          <span className="gba:text-gray-400 gba:ml-2 gba:font-mono gba:text-xs">
                            {trace.entityId.substring(0, 8)}...
                          </span>
                        </div>
                        <span
                          className={`gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium ${
                            trace.status === 'COMPLETED'
                              ? 'gba:bg-emerald-100 gba:text-emerald-700'
                              : trace.status === 'FAILED'
                                ? 'gba:bg-red-100 gba:text-red-700'
                                : 'gba:bg-gray-100 gba:text-gray-600'
                          }`}
                        >
                          {trace.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      <AnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        analysis={analysis}
        currentTrace={currentTrace}
        loading={loading}
      />
    </div>
  )
}

export default CalculationDebugger
