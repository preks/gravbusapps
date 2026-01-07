import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Microscope,
  Banknote,
  Tag,
  Car,
  Receipt,
  FileText,
  Plane,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  List,
  BarChart3,
  Minus,
  User,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { CalculationTrace, RequestAnalysis } from '../hooks/useCalculationTrace'
import { TraceTimeline } from './TraceTimeline'
import { TraceChart } from './TraceChart'

interface AnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  analysis: RequestAnalysis | null
  currentTrace: CalculationTrace | null
  loading: boolean
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, analysis, currentTrace, loading }) => {
  const [traceView, setTraceView] = useState<'timeline' | 'chart'>('timeline')
  const [showTraceDetails, setShowTraceDetails] = useState(false)

  // Detect if this is a rule lookup
  const isRuleLookup = currentTrace?.entityType === 'RULE_ASSIGNMENT' && !analysis

  // Get the entity (request or plan) from analysis
  const entity = analysis?.request || analysis?.plan

  // Debug logging - can be removed after issue is resolved
  if (isOpen) {
    console.log(
      `[AnalysisModal] Open with: hasAnalysis=${!!analysis}, hasCurrentTrace=${!!currentTrace}, traceSteps=${currentTrace?.steps?.length || 0}`
    )
  }

  if (!isOpen) return null

  const formatCurrency = (value?: number | null, currency?: string | null) => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(value)
  }

  const getTraceStatusStyle = (status: CalculationTrace['status']) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      COMPLETED: {
        bg: 'gba:bg-emerald-100',
        text: 'gba:text-emerald-700',
        icon: <CheckCircle className="gba:w-3.5 gba:h-3.5" />
      },
      COMPLETED_WITH_WARNINGS: {
        bg: 'gba:bg-amber-100',
        text: 'gba:text-amber-700',
        icon: <AlertTriangle className="gba:w-3.5 gba:h-3.5" />
      },
      FAILED: {
        bg: 'gba:bg-red-100',
        text: 'gba:text-red-700',
        icon: <AlertCircle className="gba:w-3.5 gba:h-3.5" />
      },
      IN_PROGRESS: {
        bg: 'gba:bg-blue-100',
        text: 'gba:text-blue-700',
        icon: <Activity className="gba:w-3.5 gba:h-3.5" />
      }
    }
    return styles[status] || { bg: 'gba:bg-gray-100', text: 'gba:text-gray-700', icon: null }
  }

  const modalContent = (
    <div className="gba:fixed gba:inset-0 gba:flex gba:items-center gba:justify-center" style={{ zIndex: 999999 }}>
      {/* Backdrop */}
      <div
        className="gba:absolute gba:inset-0 gba:bg-black/40 gba:backdrop-blur-sm"
        onClick={onClose}
        style={{ zIndex: 999999 }}
      />

      {/* Modal */}
      <div
        className="gba:relative gba:w-full gba:max-w-6xl gba:h-[95vh] gba:bg-white gba:rounded-2xl gba:shadow-2xl gba:overflow-hidden gba:flex gba:flex-col gba:m-4"
        style={{ zIndex: 1000000 }}
      >
        {/* Header */}
        <div className="gba:bg-gray-900 gba:text-white gba:px-6 gba:py-4 gba:flex gba:items-center gba:justify-between gba:flex-shrink-0">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:bg-white/10 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
              <Microscope className="gba:w-5 gba:h-5" />
            </div>
            <div>
              <h2 className="gba:text-lg gba:font-semibold">
                {isRuleLookup ? 'Rule Lookup Result' : 'Calculation Analysis'}
              </h2>
              {analysis && entity && (
                <p className="gba:text-gray-400 gba:text-sm">
                  {entity.code} · {entity.status}
                </p>
              )}
              {isRuleLookup && currentTrace?.appliedRule && (
                <p className="gba:text-gray-400 gba:text-sm">{currentTrace.appliedRule.ruleName}</p>
              )}
              {currentTrace && !analysis && !isRuleLookup && (
                <p className="gba:text-gray-400 gba:text-sm">
                  {currentTrace.entityType} · {currentTrace.entityId.substring(0, 8)}...
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/10 hover:gba:bg-white/20 gba:flex gba:items-center gba:justify-center gba:transition-colors"
          >
            <X className="gba:w-5 gba:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:bg-gray-50">
          {loading ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20">
              <div className="gba:w-12 gba:h-12 gba:border-3 gba:border-gray-200 gba:border-t-indigo-500 gba:rounded-full gba:animate-spin gba:mb-4" />
              <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">Analyzing...</h3>
              <p className="gba:text-gray-500 gba:mt-1 gba:text-sm">Tracing calculation steps</p>
            </div>
          ) : (
            <div className="gba:space-y-6">
              {/* Rule Lookup Result - Clean focused view */}
              {isRuleLookup && currentTrace && (
                <div className="gba:space-y-4">
                  {/* Main Result Card */}
                  <div className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:shadow-sm gba:overflow-hidden">
                    {/* Success/Failure Banner */}
                    <div
                      className={`gba:px-5 gba:py-3 gba:flex gba:items-center gba:gap-3 ${
                        currentTrace.appliedRule
                          ? 'gba:bg-emerald-50 gba:border-b gba:border-emerald-100'
                          : 'gba:bg-red-50 gba:border-b gba:border-red-100'
                      }`}
                    >
                      {currentTrace.appliedRule ? (
                        <>
                          <CheckCircle className="gba:w-5 gba:h-5 gba:text-emerald-600" />
                          <span className="gba:text-emerald-800 gba:font-medium">Rule Found</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="gba:w-5 gba:h-5 gba:text-red-600" />
                          <span className="gba:text-red-800 gba:font-medium">No Rule Found</span>
                        </>
                      )}
                    </div>

                    <div className="gba:p-5">
                      {/* Lookup Context - WHO and WHEN */}
                      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mb-6">
                        {/* Employee */}
                        <div className="gba:bg-gray-50 gba:rounded-lg gba:p-4">
                          <div className="gba:flex gba:items-center gba:gap-3">
                            <div className="gba:w-10 gba:h-10 gba:bg-blue-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                              <User className="gba:w-5 gba:h-5 gba:text-blue-600" />
                            </div>
                            <div>
                              <div className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                                Employee
                              </div>
                              <div className="gba:font-semibold gba:text-gray-900">
                                {currentTrace.contextData?.employeeId || currentTrace.employeeId || '—'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="gba:bg-gray-50 gba:rounded-lg gba:p-4">
                          <div className="gba:flex gba:items-center gba:gap-3">
                            <div className="gba:w-10 gba:h-10 gba:bg-purple-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                              <Calendar className="gba:w-5 gba:h-5 gba:text-purple-600" />
                            </div>
                            <div>
                              <div className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                                Lookup Date
                              </div>
                              <div className="gba:font-semibold gba:text-gray-900">
                                {currentTrace.contextData?.allowanceDate
                                  ? new Date(currentTrace.contextData.allowanceDate).toLocaleDateString('de-DE', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  : '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Applied Rule - The main result */}
                      {currentTrace.appliedRule ? (
                        <div className="gba:bg-gradient-to-br gba:from-indigo-50 gba:to-purple-50 gba:rounded-xl gba:p-5 gba:border gba:border-indigo-100">
                          <div className="gba:flex gba:items-start gba:gap-4">
                            <div className="gba:w-12 gba:h-12 gba:bg-indigo-100 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                              <Target className="gba:w-6 gba:h-6 gba:text-indigo-600" />
                            </div>
                            <div className="gba:flex-1">
                              <div className="gba:text-xs gba:text-indigo-600 gba:font-medium gba:uppercase gba:tracking-wide gba:mb-1">
                                Applied Rule
                              </div>
                              <div className="gba:text-xl gba:font-bold gba:text-gray-900">
                                {currentTrace.appliedRule.ruleName}
                              </div>
                              <div className="gba:text-sm gba:text-gray-500 gba:font-mono gba:mt-0.5">
                                {currentTrace.appliedRule.ruleCode}
                              </div>

                              {/* Key Rule Properties */}
                              <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-3 gba:mt-4">
                                {currentTrace.appliedRule.activeFrom && (
                                  <div className="gba:bg-white/60 gba:rounded-lg gba:px-3 gba:py-2">
                                    <div className="gba:text-xs gba:text-gray-500">Active From</div>
                                    <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                      {new Date(currentTrace.appliedRule.activeFrom).toLocaleDateString('de-DE')}
                                    </div>
                                  </div>
                                )}
                                {currentTrace.appliedRule.activeTo && (
                                  <div className="gba:bg-white/60 gba:rounded-lg gba:px-3 gba:py-2">
                                    <div className="gba:text-xs gba:text-gray-500">Active Until</div>
                                    <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                      {new Date(currentTrace.appliedRule.activeTo).toLocaleDateString('de-DE')}
                                    </div>
                                  </div>
                                )}
                                <div className="gba:bg-white/60 gba:rounded-lg gba:px-3 gba:py-2">
                                  <div className="gba:text-xs gba:text-gray-500">Use Last Country</div>
                                  <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                    {currentTrace.appliedRule.useLastCountry ? 'Yes' : 'No'}
                                  </div>
                                </div>
                                <div className="gba:bg-white/60 gba:rounded-lg gba:px-3 gba:py-2">
                                  <div className="gba:text-xs gba:text-gray-500">Deduction Limit</div>
                                  <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                    {currentTrace.appliedRule.deductionLimit ? 'Yes' : 'No'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="gba:bg-red-50 gba:rounded-xl gba:p-5 gba:border gba:border-red-200 gba:text-center">
                          <AlertCircle className="gba:w-10 gba:h-10 gba:text-red-400 gba:mx-auto gba:mb-3" />
                          <div className="gba:font-medium gba:text-red-800">No Expense Rule Found</div>
                          <div className="gba:text-sm gba:text-red-600 gba:mt-1">
                            No expense rule is configured for this employee on the selected date.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Trace Details */}
                  {currentTrace.steps.length > 0 && (
                    <div className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:shadow-sm gba:overflow-hidden">
                      <button
                        onClick={() => setShowTraceDetails(!showTraceDetails)}
                        className="gba:w-full gba:px-5 gba:py-3 gba:flex gba:items-center gba:justify-between gba:bg-gray-50 gba:border-b gba:border-gray-200 hover:gba:bg-gray-100 gba:transition-colors"
                      >
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Activity className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span className="gba:font-medium gba:text-gray-900 gba:text-sm">
                            Lookup Trace ({currentTrace.steps.length} steps)
                          </span>
                        </div>
                        {showTraceDetails ? (
                          <ChevronUp className="gba:w-4 gba:h-4 gba:text-gray-400" />
                        ) : (
                          <ChevronDown className="gba:w-4 gba:h-4 gba:text-gray-400" />
                        )}
                      </button>
                      {showTraceDetails && (
                        <div className="gba:p-5">
                          <div className="gba:max-h-[400px] gba:overflow-y-auto">
                            <TraceTimeline steps={currentTrace.steps} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Analysis Summary */}
              {analysis && (
                <>
                  {/* Amount Cards - Shows Total = Allowance + Mileage + Expenses */}
                  <div className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:shadow-sm gba:p-5">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                      <Banknote className="gba:w-4 gba:h-4 gba:text-gray-400" />
                      <span className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                        Amount Breakdown
                      </span>
                    </div>

                    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
                      {/* Component Cards - The 3 addends */}
                      <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                        {/* Allowance */}
                        <div className="gba:flex-1 gba:min-w-[120px] gba:bg-emerald-50 gba:rounded-lg gba:p-3 gba:border gba:border-emerald-200">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            <div className="gba:w-6 gba:h-6 gba:bg-emerald-100 gba:rounded gba:flex gba:items-center gba:justify-center">
                              <Tag className="gba:w-3 gba:h-3 gba:text-emerald-600" />
                            </div>
                            <span className="gba:text-xs gba:text-emerald-600 gba:font-medium">Allowance</span>
                          </div>
                          <div className="gba:text-lg gba:font-semibold gba:text-emerald-700">
                            {formatCurrency(entity?.totalAmountAllowance)}
                          </div>
                        </div>

                        {/* Plus Sign */}
                        <div className="gba:flex-shrink-0 gba:w-6 gba:h-6 gba:rounded-full gba:bg-gray-100 gba:flex gba:items-center gba:justify-center">
                          <span className="gba:text-gray-400 gba:font-bold gba:text-sm">+</span>
                        </div>

                        {/* Mileage */}
                        <div className="gba:flex-1 gba:min-w-[120px] gba:bg-purple-50 gba:rounded-lg gba:p-3 gba:border gba:border-purple-200">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            <div className="gba:w-6 gba:h-6 gba:bg-purple-100 gba:rounded gba:flex gba:items-center gba:justify-center">
                              <Car className="gba:w-3 gba:h-3 gba:text-purple-600" />
                            </div>
                            <span className="gba:text-xs gba:text-purple-600 gba:font-medium">Mileage</span>
                          </div>
                          <div className="gba:text-lg gba:font-semibold gba:text-purple-700">
                            {formatCurrency(entity?.totalAmountMileage)}
                          </div>
                        </div>

                        {/* Plus Sign */}
                        <div className="gba:flex-shrink-0 gba:w-6 gba:h-6 gba:rounded-full gba:bg-gray-100 gba:flex gba:items-center gba:justify-center">
                          <span className="gba:text-gray-400 gba:font-bold gba:text-sm">+</span>
                        </div>

                        {/* Expenses */}
                        <div className="gba:flex-1 gba:min-w-[120px] gba:bg-amber-50 gba:rounded-lg gba:p-3 gba:border gba:border-amber-200">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            <div className="gba:w-6 gba:h-6 gba:bg-amber-100 gba:rounded gba:flex gba:items-center gba:justify-center">
                              <Receipt className="gba:w-3 gba:h-3 gba:text-amber-600" />
                            </div>
                            <span className="gba:text-xs gba:text-amber-600 gba:font-medium">Expenses</span>
                          </div>
                          <div className="gba:text-lg gba:font-semibold gba:text-amber-700">
                            {formatCurrency(entity?.totalAmountExpense)}
                          </div>
                        </div>
                      </div>

                      {/* Equals Sign */}
                      <div className="gba:flex-shrink-0 gba:w-8 gba:h-8 gba:rounded-full gba:bg-blue-100 gba:flex gba:items-center gba:justify-center">
                        <span className="gba:text-blue-600 gba:font-bold gba:text-lg">=</span>
                      </div>

                      {/* Total Card - The sum, visually distinct */}
                      <div className="gba:flex-shrink-0 gba:min-w-[160px] gba:bg-gradient-to-br gba:from-blue-500 gba:to-blue-600 gba:rounded-xl gba:p-4 gba:shadow-lg gba:shadow-blue-500/25">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                          <div className="gba:w-7 gba:h-7 gba:bg-white/20 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                            <Banknote className="gba:w-4 gba:h-4 gba:text-white" />
                          </div>
                          <span className="gba:text-xs gba:text-blue-100 gba:font-medium gba:uppercase gba:tracking-wide">
                            Total
                          </span>
                        </div>
                        <div className="gba:text-2xl gba:font-bold gba:text-white">
                          {formatCurrency(entity?.totalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Applied Rule */}
                  {analysis.appliedRule && (
                    <div className="gba:bg-white gba:rounded-xl gba:p-5 gba:border gba:border-gray-200 gba:shadow-sm">
                      <div className="gba:flex gba:items-start gba:gap-4">
                        <div className="gba:w-12 gba:h-12 gba:bg-indigo-100 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                          <FileText className="gba:w-6 gba:h-6 gba:text-indigo-600" />
                        </div>
                        <div className="gba:flex-1">
                          <div className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide gba:mb-1">
                            Applied Rule
                          </div>
                          <div className="gba:text-lg gba:font-semibold gba:text-gray-900">
                            {analysis.appliedRule.name}
                          </div>
                          <div className="gba:text-sm gba:text-gray-500 gba:mt-0.5 gba:font-mono">
                            {analysis.appliedRule.code}
                          </div>
                          <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-3 gba:mt-4">
                            <div className="gba:bg-gray-50 gba:rounded-lg gba:px-3 gba:py-2">
                              <div className="gba:text-xs gba:text-gray-500">Country</div>
                              <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                {analysis.appliedRule.countryName || analysis.appliedRule.countryRef || '—'}
                              </div>
                            </div>
                            <div className="gba:bg-gray-50 gba:rounded-lg gba:px-3 gba:py-2">
                              <div className="gba:text-xs gba:text-gray-500">Calc Type</div>
                              <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                {analysis.appliedRule.calculationTypeName ||
                                  analysis.appliedRule.calculationType ||
                                  '—'}
                              </div>
                            </div>
                            <div className="gba:bg-gray-50 gba:rounded-lg gba:px-3 gba:py-2">
                              <div className="gba:text-xs gba:text-gray-500">Use Last Country</div>
                              <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                {analysis.appliedRule.useLastCountry ? 'Yes' : 'No'}
                              </div>
                            </div>
                            <div className="gba:bg-gray-50 gba:rounded-lg gba:px-3 gba:py-2">
                              <div className="gba:text-xs gba:text-gray-500">Deduction Limit</div>
                              <div className="gba:font-medium gba:text-gray-900 gba:text-sm">
                                {analysis.appliedRule.deductionLimit ? 'Yes' : 'No'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rule Error */}
                  {analysis.ruleError && (
                    <div className="gba:bg-red-50 gba:rounded-xl gba:p-4 gba:border gba:border-red-200">
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <AlertCircle className="gba:w-5 gba:h-5 gba:text-red-500 gba:flex-shrink-0 gba:mt-0.5" />
                        <div>
                          <div className="gba:font-medium gba:text-red-800">Rule Error</div>
                          <div className="gba:text-sm gba:text-red-700 gba:mt-1">{analysis.ruleError}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trip Segments */}
                  {analysis.trips && analysis.trips.length > 0 && (
                    <div className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:shadow-sm">
                      <div className="gba:bg-gray-50 gba:px-5 gba:py-3 gba:border-b gba:border-gray-200 gba:flex gba:items-center gba:gap-2">
                        <Plane className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium gba:text-gray-900 gba:text-sm">Trip Segments</span>
                        <span className="gba:text-gray-400 gba:text-sm">({analysis.trips.length})</span>
                      </div>
                      <div className="gba:p-4">
                        {/* Table Header */}
                        <div className="gba:grid gba:grid-cols-6 gba:gap-2 gba:px-3 gba:py-2 gba:bg-gray-50 gba:rounded-lg gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-2">
                          <div>#</div>
                          <div>Address</div>
                          <div>Type</div>
                          <div>Date/Time</div>
                          <div>Country</div>
                          <div>Region</div>
                        </div>
                        {/* Table Rows */}
                        <div className="gba:space-y-2">
                          {analysis.trips.map((trip, idx) => {
                            const tripId = String(trip.id || idx)
                            const tripOrder = trip.tripOrder || idx + 1
                            // Prefer address (actual location) over point field
                            const address = trip.address || trip.point || '—'
                            const pointType = trip.pointType || '—'
                            let dateTime = '—'
                            try {
                              if (trip.tripDateTime) {
                                dateTime = new Date(trip.tripDateTime).toLocaleString()
                              }
                            } catch {
                              console.error('Error parsing date:', trip.tripDateTime)
                            }
                            // Prefer resolved names over refs
                            const country = trip.countryName || trip.countryRef || '—'
                            const region = trip.travelRegionName || trip.travelRegionRef || '—'

                            return (
                              <div
                                key={tripId}
                                className="gba:grid gba:grid-cols-6 gba:gap-2 gba:px-3 gba:py-3 gba:bg-gray-50/50 gba:rounded-lg gba:text-sm hover:gba:bg-gray-100 gba:transition-colors"
                              >
                                <div className="gba:text-gray-400 gba:font-mono gba:text-xs">{tripOrder}</div>
                                <div className="gba:font-medium gba:text-gray-900">{address}</div>
                                <div>
                                  <span className="gba:px-2 gba:py-1 gba:bg-gray-100 gba:rounded gba:text-xs gba:font-medium gba:text-gray-600">
                                    {pointType}
                                  </span>
                                </div>
                                <div className="gba:font-mono gba:text-xs gba:text-gray-600">{dateTime}</div>
                                <div className="gba:text-gray-600">{country}</div>
                                <div className="gba:text-gray-600">{region}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Calculation Trace - Skip for rule lookups since they have dedicated UI */}
              {currentTrace && !isRuleLookup && (
                <div className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:shadow-sm gba:overflow-hidden">
                  {/* Trace Header */}
                  <div className="gba:bg-gray-50 gba:px-5 gba:py-4 gba:border-b gba:border-gray-200">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Activity className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium gba:text-gray-900">Calculation Trace</span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        {(() => {
                          const statusStyle = getTraceStatusStyle(currentTrace.status)
                          return (
                            <span
                              className={`gba:px-2.5 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:flex gba:items-center gba:gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {statusStyle.icon}
                              {currentTrace.status.replace(/_/g, ' ')}
                            </span>
                          )
                        })()}
                        {currentTrace.totalDurationMs && (
                          <span className="gba:text-sm gba:text-gray-500 gba:bg-white gba:px-2.5 gba:py-1 gba:rounded-full gba:border gba:border-gray-200 gba:flex gba:items-center gba:gap-1.5">
                            <Clock className="gba:w-3.5 gba:h-3.5" />
                            {currentTrace.totalDurationMs}ms
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Summary Stats */}
                    {currentTrace.summary && (
                      <div className="gba:grid gba:grid-cols-4 gba:gap-3">
                        <div className="gba:bg-white gba:rounded-lg gba:p-3 gba:text-center gba:border gba:border-gray-200">
                          <div className="gba:text-xl gba:font-semibold gba:text-gray-900">
                            {currentTrace.summary.totalSteps}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500">Total</div>
                        </div>
                        <div className="gba:bg-white gba:rounded-lg gba:p-3 gba:text-center gba:border gba:border-gray-200">
                          <div className="gba:text-xl gba:font-semibold gba:text-emerald-600">
                            {currentTrace.summary.successfulSteps}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500">Success</div>
                        </div>
                        <div className="gba:bg-white gba:rounded-lg gba:p-3 gba:text-center gba:border gba:border-gray-200">
                          <div className="gba:text-xl gba:font-semibold gba:text-amber-500">
                            {currentTrace.summary.warningSteps}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500">Warnings</div>
                        </div>
                        <div className="gba:bg-white gba:rounded-lg gba:p-3 gba:text-center gba:border gba:border-gray-200">
                          <div className="gba:text-xl gba:font-semibold gba:text-red-500">
                            {currentTrace.summary.failedSteps}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500">Failed</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculation Breakdown */}
                  {(Object.keys(currentTrace.finalAmounts).length > 0 || currentTrace.steps.length > 0) && (
                    <div className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-white gba:p-5 gba:border-b gba:border-gray-200">
                      <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-4">
                        Calculation Breakdown
                      </div>

                      {/* Formula Summary - Use request totals for accuracy */}
                      {(() => {
                        // Use entity for accurate totals (already calculated correctly by backend)
                        const grossAllowance = currentTrace.finalAmounts.totalAllowance || 0
                        const deductions = currentTrace.finalAmounts.totalDeductions || 0
                        const netAllowance = grossAllowance - deductions
                        // Real expenses from entity (excludes generated allowances)
                        const realExpenses = entity?.totalAmountExpense || 0
                        const mileage = entity?.totalAmountMileage || currentTrace.finalAmounts.totalMileage || 0
                        const totalAmount = entity?.totalAmount || netAllowance + realExpenses + mileage

                        return (
                          <div className="gba:bg-white gba:rounded-xl gba:border gba:border-gray-200 gba:p-4 gba:mb-4">
                            <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:flex-wrap gba:text-base gba:font-mono">
                              {grossAllowance > 0 && (
                                <>
                                  <span className="gba:text-emerald-600 gba:font-semibold">
                                    {formatCurrency(grossAllowance)}
                                  </span>
                                  <span className="gba:text-gray-400 gba:text-xs">gross allowances</span>
                                </>
                              )}
                              {deductions > 0 && (
                                <>
                                  <span className="gba:text-gray-400">−</span>
                                  <span className="gba:text-red-500 gba:font-semibold">
                                    {formatCurrency(deductions)}
                                  </span>
                                  <span className="gba:text-gray-400 gba:text-xs">deductions</span>
                                </>
                              )}
                              {realExpenses > 0 && (
                                <>
                                  <span className="gba:text-gray-400">+</span>
                                  <span className="gba:text-amber-600 gba:font-semibold">
                                    {formatCurrency(realExpenses)}
                                  </span>
                                  <span className="gba:text-gray-400 gba:text-xs">expenses</span>
                                </>
                              )}
                              {mileage > 0 && (
                                <>
                                  <span className="gba:text-gray-400">+</span>
                                  <span className="gba:text-purple-600 gba:font-semibold">
                                    {formatCurrency(mileage)}
                                  </span>
                                  <span className="gba:text-gray-400 gba:text-xs">mileage</span>
                                </>
                              )}
                              <span className="gba:text-gray-400">=</span>
                              <span className="gba:text-blue-700 gba:font-bold gba:text-xl">
                                {formatCurrency(totalAmount)}
                              </span>
                            </div>
                            {netAllowance !== grossAllowance && (
                              <div className="gba:text-center gba:text-xs gba:text-gray-500 gba:mt-2">
                                Net allowance after deductions:{' '}
                                <span className="gba:font-semibold gba:text-emerald-600">
                                  {formatCurrency(netAllowance)}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Detailed Items by Category */}
                      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                        {/* Allowance Calculations with linked Deductions */}
                        {(() => {
                          const allowanceCalcs = currentTrace.steps.filter(
                            s =>
                              s.category === 'AMOUNT_CALCULATION' &&
                              s.stepName?.startsWith('Calculate Amount for') &&
                              s.calculatedValue !== null
                          )
                          const deductionItems = currentTrace.steps.filter(s => s.category === 'DEDUCTION')

                          if (allowanceCalcs.length === 0 && deductionItems.length === 0) return null

                          // Link deductions to allowances by step order proximity
                          // Deductions immediately follow their parent allowance in the trace
                          const deductionsByAllowanceStepId = new Map<
                            string,
                            { deductions: typeof deductionItems; date: string }
                          >()

                          // Sort allowances by step order to process them in sequence
                          const sortedAllowances = [...allowanceCalcs].sort((a, b) => a.stepOrder - b.stepOrder)

                          // For each deduction, find the most recent allowance that precedes it
                          deductionItems.forEach(d => {
                            // Find the allowance with the highest stepOrder that is still less than this deduction's stepOrder
                            let parentAllowance = null
                            for (const allowance of sortedAllowances) {
                              if (allowance.stepOrder < d.stepOrder) {
                                parentAllowance = allowance
                              } else {
                                break
                              }
                            }

                            if (parentAllowance) {
                              const date =
                                parentAllowance.inputs?.expenseDate ||
                                parentAllowance.stepName?.replace('Calculate Amount for ', '')
                              if (!deductionsByAllowanceStepId.has(parentAllowance.stepId)) {
                                deductionsByAllowanceStepId.set(parentAllowance.stepId, { deductions: [], date })
                              }
                              deductionsByAllowanceStepId.get(parentAllowance.stepId)!.deductions.push(d)
                            }
                          })

                          const grossTotal = allowanceCalcs.reduce((sum, item) => sum + (item.calculatedValue || 0), 0)
                          const deductionsTotal = deductionItems.reduce((sum, item) => {
                            const amt = item.outputs?.deductionAmount || 0
                            return sum + Math.abs(amt as number)
                          }, 0)
                          const netTotal = grossTotal - deductionsTotal

                          return (
                            <div className="gba:bg-emerald-50 gba:rounded-lg gba:border gba:border-emerald-200 gba:p-3 md:gba:col-span-2">
                              <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <Tag className="gba:w-4 gba:h-4 gba:text-emerald-600" />
                                  <span className="gba:text-sm gba:font-medium gba:text-emerald-800">
                                    Allowances & Deductions
                                  </span>
                                </div>
                                <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm">
                                  <span className="gba:text-emerald-600">Gross: {formatCurrency(grossTotal)}</span>
                                  {deductionsTotal > 0 && (
                                    <>
                                      <span className="gba:text-red-500">- {formatCurrency(deductionsTotal)}</span>
                                      <span className="gba:text-gray-400">=</span>
                                      <span className="gba:font-semibold gba:text-emerald-700">
                                        Net: {formatCurrency(netTotal)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="gba:space-y-2">
                                {allowanceCalcs.map(item => {
                                  const date =
                                    item.inputs?.expenseDate || item.stepName?.replace('Calculate Amount for ', '')
                                  const linkedData = deductionsByAllowanceStepId.get(item.stepId)
                                  const linkedDeductions = linkedData?.deductions || []
                                  const deductionSum = linkedDeductions.reduce(
                                    (sum, d) => sum + Math.abs((d.outputs?.deductionAmount as number) || 0),
                                    0
                                  )
                                  const netAmount = (item.calculatedValue || 0) - deductionSum

                                  return (
                                    <div
                                      key={item.stepId}
                                      className="gba:bg-white gba:rounded-lg gba:border gba:border-emerald-100 gba:overflow-hidden"
                                    >
                                      {/* Allowance row */}
                                      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2.5">
                                        <div className="gba:flex gba:items-center gba:gap-2">
                                          <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-emerald-500" />
                                          <span className="gba:text-sm gba:font-medium gba:text-gray-800">{date}</span>
                                        </div>
                                        <div className="gba:flex gba:items-center gba:gap-3">
                                          <span className="gba:text-sm gba:font-semibold gba:text-emerald-600">
                                            {formatCurrency(item.calculatedValue)}
                                          </span>
                                          {linkedDeductions.length > 0 && (
                                            <>
                                              <span className="gba:text-xs gba:text-gray-400">→</span>
                                              <span className="gba:text-sm gba:font-semibold gba:text-emerald-700 gba:bg-emerald-100 gba:px-2 gba:py-0.5 gba:rounded">
                                                Net: {formatCurrency(netAmount)}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Linked deductions */}
                                      {linkedDeductions.length > 0 && (
                                        <div className="gba:bg-red-50/50 gba:border-t gba:border-red-100">
                                          {linkedDeductions.map(d => {
                                            const amount = Math.abs((d.outputs?.deductionAmount as number) || 0)
                                            const type =
                                              d.inputs?.allowanceType?.replace(/_/g, ' ') ||
                                              d.stepName?.replace('Deduction: ', '') ||
                                              'Deduction'
                                            return (
                                              <div
                                                key={d.stepId}
                                                className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:text-sm gba:border-b gba:border-red-100 last:gba:border-b-0"
                                              >
                                                <div className="gba:flex gba:items-center gba:gap-2 gba:pl-4">
                                                  <Minus className="gba:w-3 gba:h-3 gba:text-red-400" />
                                                  <span className="gba:text-gray-600 gba:text-xs">{type}</span>
                                                  <span className="gba:text-gray-400 gba:text-xs">for</span>
                                                  <span className="gba:text-gray-500 gba:text-xs gba:font-medium gba:bg-gray-100 gba:px-1.5 gba:py-0.5 gba:rounded">
                                                    {date}
                                                  </span>
                                                </div>
                                                <span className="gba:font-medium gba:text-red-500 gba:text-xs">
                                                  -{formatCurrency(amount)}
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}

                                {/* Orphan deductions (not linked to any allowance by step order) */}
                                {(() => {
                                  // Find deductions that weren't linked to any allowance
                                  const linkedDeductionIds = new Set<string>()
                                  deductionsByAllowanceStepId.forEach(({ deductions }) => {
                                    deductions.forEach(d => linkedDeductionIds.add(d.stepId))
                                  })

                                  const orphanDeductions = deductionItems.filter(d => !linkedDeductionIds.has(d.stepId))

                                  if (orphanDeductions.length === 0) return null

                                  return (
                                    <div className="gba:bg-white gba:rounded-lg gba:border gba:border-red-200 gba:overflow-hidden gba:mt-2">
                                      <div className="gba:bg-red-50 gba:px-3 gba:py-2 gba:border-b gba:border-red-100">
                                        <span className="gba:text-xs gba:font-medium gba:text-red-700">
                                          Other Deductions (unlinked)
                                        </span>
                                      </div>
                                      {orphanDeductions.map(d => {
                                        const amount = Math.abs((d.outputs?.deductionAmount as number) || 0)
                                        const type =
                                          d.inputs?.allowanceType?.replace(/_/g, ' ') ||
                                          d.stepName?.replace('Deduction: ', '') ||
                                          'Deduction'
                                        return (
                                          <div
                                            key={d.stepId}
                                            className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:text-sm gba:border-b gba:border-red-100 last:gba:border-b-0"
                                          >
                                            <div className="gba:flex gba:items-center gba:gap-2">
                                              <Minus className="gba:w-3 gba:h-3 gba:text-red-400" />
                                              <span className="gba:text-gray-600 gba:text-xs">{type}</span>
                                            </div>
                                            <span className="gba:font-medium gba:text-red-500 gba:text-xs">
                                              -{formatCurrency(amount)}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Real Expenses (items with expenseClass: EXPENSE) */}
                        {(() => {
                          const realExpenseItems = currentTrace.steps.filter(
                            s =>
                              s.category === 'AMOUNT_CALCULATION' &&
                              s.stepName?.startsWith('Expense:') &&
                              s.inputs?.expenseClass === 'ExpenseClass:v1:EXPENSE'
                          )
                          if (realExpenseItems.length === 0) return null

                          const total = realExpenseItems.reduce((sum, item) => sum + (item.outputs?.amount || 0), 0)

                          return (
                            <div className="gba:bg-amber-50 gba:rounded-lg gba:border gba:border-amber-200 gba:p-3">
                              <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <Receipt className="gba:w-4 gba:h-4 gba:text-amber-600" />
                                  <span className="gba:text-sm gba:font-medium gba:text-amber-800">
                                    Expenses ({realExpenseItems.length})
                                  </span>
                                </div>
                                <span className="gba:text-sm gba:font-semibold gba:text-amber-700">
                                  {formatCurrency(total)}
                                </span>
                              </div>
                              <div className="gba:space-y-2">
                                {realExpenseItems.map(item => {
                                  const title =
                                    item.inputs?.title || item.stepName?.replace('Expense: ', '') || 'Expense'
                                  const amount = item.outputs?.amount || 0
                                  return (
                                    <div
                                      key={item.stepId}
                                      className="gba:flex gba:items-center gba:justify-between gba:bg-white gba:rounded gba:px-3 gba:py-2 gba:text-sm"
                                    >
                                      <span className="gba:text-gray-700 gba:truncate gba:max-w-[180px]">{title}</span>
                                      <span className="gba:font-semibold gba:text-amber-700">
                                        {formatCurrency(amount as number)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Mileage */}
                        {(() => {
                          const mileageItems = currentTrace.steps.filter(s => s.category === 'MILEAGE')
                          if (mileageItems.length === 0) return null

                          const total = mileageItems.reduce(
                            (sum, item) => sum + (item.calculatedValue || item.outputs?.amount || 0),
                            0
                          )

                          return (
                            <div className="gba:bg-purple-50 gba:rounded-lg gba:border gba:border-purple-200 gba:p-3">
                              <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <Car className="gba:w-4 gba:h-4 gba:text-purple-600" />
                                  <span className="gba:text-sm gba:font-medium gba:text-purple-800">
                                    Mileage ({mileageItems.length})
                                  </span>
                                </div>
                                <span className="gba:text-sm gba:font-semibold gba:text-purple-700">
                                  {formatCurrency(total)}
                                </span>
                              </div>
                              <div className="gba:space-y-2">
                                {mileageItems.map(item => {
                                  const amount = item.calculatedValue ?? item.outputs?.amount ?? 0
                                  const distance = item.inputs?.distance || ''
                                  const unit = item.inputs?.unit || ''
                                  return (
                                    <div
                                      key={item.stepId}
                                      className="gba:flex gba:items-center gba:justify-between gba:bg-white gba:rounded gba:px-3 gba:py-2 gba:text-sm"
                                    >
                                      <span className="gba:text-gray-700 gba:truncate gba:max-w-[180px]">
                                        {item.stepName?.replace('Mileage Calculation: ', '') || 'Mileage'}
                                        {distance && ` (${distance} ${unit})`}
                                      </span>
                                      <span className="gba:font-semibold gba:text-purple-700">
                                        {formatCurrency(amount as number)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Summary Totals */}
                      <div className="gba:mt-4 gba:pt-4 gba:border-t gba:border-gray-200">
                        <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-5 gba:gap-3">
                          <div className="gba:rounded-lg gba:px-3 gba:py-2 gba:border gba:border-emerald-200 gba:bg-emerald-50">
                            <div className="gba:text-xs gba:text-gray-500">Gross Allowances</div>
                            <div className="gba:font-semibold gba:text-emerald-700">
                              {formatCurrency(currentTrace.finalAmounts.totalAllowance)}
                            </div>
                          </div>
                          <div className="gba:rounded-lg gba:px-3 gba:py-2 gba:border gba:border-red-200 gba:bg-red-50">
                            <div className="gba:text-xs gba:text-gray-500">Deductions</div>
                            <div className="gba:font-semibold gba:text-red-600">
                              -{formatCurrency(currentTrace.finalAmounts.totalDeductions)}
                            </div>
                          </div>
                          <div className="gba:rounded-lg gba:px-3 gba:py-2 gba:border gba:border-emerald-300 gba:bg-emerald-100">
                            <div className="gba:text-xs gba:text-gray-500">Net Allowances</div>
                            <div className="gba:font-semibold gba:text-emerald-800">
                              {formatCurrency(
                                (currentTrace.finalAmounts.totalAllowance || 0) -
                                  (currentTrace.finalAmounts.totalDeductions || 0)
                              )}
                            </div>
                          </div>
                          <div className="gba:rounded-lg gba:px-3 gba:py-2 gba:border gba:border-amber-200 gba:bg-amber-50">
                            <div className="gba:text-xs gba:text-gray-500">Expenses</div>
                            <div className="gba:font-semibold gba:text-amber-700">
                              {formatCurrency(entity?.totalAmountExpense)}
                            </div>
                          </div>
                          <div className="gba:rounded-lg gba:px-3 gba:py-2 gba:border gba:border-blue-300 gba:bg-blue-100">
                            <div className="gba:text-xs gba:text-gray-500">Total</div>
                            <div className="gba:font-semibold gba:text-blue-700">
                              {formatCurrency(entity?.totalAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {currentTrace.errors.length > 0 && (
                    <div className="gba:bg-red-50/50 gba:p-4 gba:border-b gba:border-gray-200">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <AlertCircle className="gba:w-4 gba:h-4 gba:text-red-500" />
                        <span className="gba:text-sm gba:font-medium gba:text-red-800">
                          Errors ({currentTrace.errors.length})
                        </span>
                      </div>
                      <ul className="gba:space-y-1">
                        {currentTrace.errors.map((err, idx) => (
                          <li key={idx} className="gba:text-sm gba:text-red-700 gba:flex gba:items-start gba:gap-2">
                            <span className="gba:text-red-400">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {currentTrace.warnings.length > 0 && (
                    <div className="gba:bg-amber-50/50 gba:p-4 gba:border-b gba:border-gray-200">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <AlertTriangle className="gba:w-4 gba:h-4 gba:text-amber-500" />
                        <span className="gba:text-sm gba:font-medium gba:text-amber-800">
                          Warnings ({currentTrace.warnings.length})
                        </span>
                      </div>
                      <ul className="gba:space-y-1">
                        {currentTrace.warnings.map((warn, idx) => (
                          <li key={idx} className="gba:text-sm gba:text-amber-700 gba:flex gba:items-start gba:gap-2">
                            <span className="gba:text-amber-400">•</span>
                            <span>{warn}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timeline / Chart */}
                  <div className="gba:p-5">
                    {/* View Toggle */}
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                      <div>
                        <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide">
                          Step-by-Step Trace ({currentTrace.steps.length} steps)
                        </div>
                        <p className="gba:text-xs gba:text-gray-400 gba:mt-0.5">
                          Allowances, deductions, mileage, and expense items
                        </p>
                      </div>
                      <div className="gba:flex gba:items-center gba:bg-gray-100 gba:rounded-lg gba:p-1">
                        <button
                          onClick={() => setTraceView('timeline')}
                          className={`gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-md gba:text-xs gba:font-medium gba:transition-all ${
                            traceView === 'timeline'
                              ? 'gba:bg-white gba:text-gray-900 gba:shadow-sm'
                              : 'gba:text-gray-500 hover:gba:text-gray-700'
                          }`}
                        >
                          <List className="gba:w-3.5 gba:h-3.5" />
                          Timeline
                        </button>
                        <button
                          onClick={() => setTraceView('chart')}
                          className={`gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-md gba:text-xs gba:font-medium gba:transition-all ${
                            traceView === 'chart'
                              ? 'gba:bg-white gba:text-gray-900 gba:shadow-sm'
                              : 'gba:text-gray-500 hover:gba:text-gray-700'
                          }`}
                        >
                          <BarChart3 className="gba:w-3.5 gba:h-3.5" />
                          Flow Chart
                        </button>
                      </div>
                    </div>

                    {/* Content based on view */}
                    {traceView === 'timeline' ? (
                      <div className="gba:max-h-[500px] gba:overflow-y-auto gba:pr-2">
                        <TraceTimeline steps={currentTrace.steps} />
                      </div>
                    ) : (
                      <TraceChart steps={currentTrace.steps} />
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!analysis && !currentTrace && !loading && (
                <div className="gba:text-center gba:py-16">
                  <div className="gba:w-12 gba:h-12 gba:bg-gray-100 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                    <Microscope className="gba:w-6 gba:h-6 gba:text-gray-400" />
                  </div>
                  <h3 className="gba:text-lg gba:font-medium gba:text-gray-900">No data</h3>
                  <p className="gba:text-gray-500 gba:text-sm gba:mt-1">Analysis data not available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gba:bg-white gba:px-6 gba:py-4 gba:border-t gba:border-gray-200 gba:flex gba:justify-end gba:flex-shrink-0">
          <button
            onClick={onClose}
            className="gba:bg-gray-100 gba:text-gray-700 gba:px-5 gba:py-2 gba:rounded-lg gba:font-medium gba:text-sm hover:gba:bg-gray-200 gba:transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  // Use createPortal to render outside the app's DOM hierarchy
  return createPortal(modalContent, document.body)
}

export default AnalysisModal
