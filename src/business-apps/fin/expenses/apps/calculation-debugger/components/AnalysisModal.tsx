import React from 'react'
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
} from 'lucide-react'
import { CalculationTrace, RequestAnalysis } from '../hooks/useCalculationTrace'
import { TraceTimeline } from './TraceTimeline'

interface AnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  analysis: RequestAnalysis | null
  currentTrace: CalculationTrace | null
  loading: boolean
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  currentTrace,
  loading,
}) => {
  // Debug logging - can be removed after issue is resolved
  if (isOpen) {
    console.log(`[AnalysisModal] Open with: hasAnalysis=${!!analysis}, hasCurrentTrace=${!!currentTrace}, traceSteps=${currentTrace?.steps?.length || 0}`)
  }
  
  if (!isOpen) return null

  const formatCurrency = (value?: number | null, currency?: string | null) => {
    if (value === undefined || value === null) return '—'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(value)
  }

  const getTraceStatusStyle = (status: CalculationTrace['status']) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      COMPLETED: {
        bg: 'gba:bg-emerald-100',
        text: 'gba:text-emerald-700',
        icon: <CheckCircle className="gba:w-3.5 gba:h-3.5" />,
      },
      COMPLETED_WITH_WARNINGS: {
        bg: 'gba:bg-amber-100',
        text: 'gba:text-amber-700',
        icon: <AlertTriangle className="gba:w-3.5 gba:h-3.5" />,
      },
      FAILED: {
        bg: 'gba:bg-red-100',
        text: 'gba:text-red-700',
        icon: <AlertCircle className="gba:w-3.5 gba:h-3.5" />,
      },
      IN_PROGRESS: {
        bg: 'gba:bg-blue-100',
        text: 'gba:text-blue-700',
        icon: <Activity className="gba:w-3.5 gba:h-3.5" />,
      },
    }
    return styles[status] || { bg: 'gba:bg-gray-100', text: 'gba:text-gray-700', icon: null }
  }

  return (
    <div className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center">
      {/* Backdrop */}
      <div
        className="gba:absolute gba:inset-0 gba:bg-black/40 gba:backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="gba:relative gba:w-full gba:max-w-6xl gba:h-[95vh] gba:bg-white gba:rounded-2xl gba:shadow-2xl gba:overflow-hidden gba:flex gba:flex-col gba:m-4">
        {/* Header */}
        <div className="gba:bg-gray-900 gba:text-white gba:px-6 gba:py-4 gba:flex gba:items-center gba:justify-between gba:flex-shrink-0">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:bg-white/10 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
              <Microscope className="gba:w-5 gba:h-5" />
            </div>
            <div>
              <h2 className="gba:text-lg gba:font-semibold">Calculation Analysis</h2>
              {analysis && (
                <p className="gba:text-gray-400 gba:text-sm">
                  {analysis.request.code} · {analysis.request.status}
                </p>
              )}
              {currentTrace && !analysis && (
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
              {/* Analysis Summary */}
              {analysis && (
                <>
                  {/* Amount Cards */}
                  <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4">
                    <div className="gba:bg-white gba:rounded-xl gba:p-4 gba:border gba:border-gray-200 gba:shadow-sm">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                        <div className="gba:w-8 gba:h-8 gba:bg-blue-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                          <Banknote className="gba:w-4 gba:h-4 gba:text-blue-600" />
                        </div>
                        <span className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                          Total
                        </span>
                      </div>
                      <div className="gba:text-2xl gba:font-semibold gba:text-gray-900">
                        {formatCurrency(analysis.request.totalAmount)}
                      </div>
                    </div>
                    <div className="gba:bg-white gba:rounded-xl gba:p-4 gba:border gba:border-gray-200 gba:shadow-sm">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                        <div className="gba:w-8 gba:h-8 gba:bg-emerald-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                          <Tag className="gba:w-4 gba:h-4 gba:text-emerald-600" />
                        </div>
                        <span className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                          Allowance
                        </span>
                      </div>
                      <div className="gba:text-2xl gba:font-semibold gba:text-gray-900">
                        {formatCurrency(analysis.request.totalAmountAllowance)}
                      </div>
                    </div>
                    <div className="gba:bg-white gba:rounded-xl gba:p-4 gba:border gba:border-gray-200 gba:shadow-sm">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                        <div className="gba:w-8 gba:h-8 gba:bg-purple-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                          <Car className="gba:w-4 gba:h-4 gba:text-purple-600" />
                        </div>
                        <span className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                          Mileage
                        </span>
                      </div>
                      <div className="gba:text-2xl gba:font-semibold gba:text-gray-900">
                        {formatCurrency(analysis.request.totalAmountMileage)}
                      </div>
                    </div>
                    <div className="gba:bg-white gba:rounded-xl gba:p-4 gba:border gba:border-gray-200 gba:shadow-sm">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                        <div className="gba:w-8 gba:h-8 gba:bg-amber-100 gba:rounded-lg gba:flex gba:items-center gba:justify-center">
                          <Receipt className="gba:w-4 gba:h-4 gba:text-amber-600" />
                        </div>
                        <span className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                          Expenses
                        </span>
                      </div>
                      <div className="gba:text-2xl gba:font-semibold gba:text-gray-900">
                        {formatCurrency(analysis.request.totalAmountExpense)}
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
                                {analysis.appliedRule.calculationTypeName || analysis.appliedRule.calculationType || '—'}
                              </div>
                            </div>
                            <div className="gba:bg-gray-50 gba:rounded-lg gba:px-3 gba:py-2">
                              <div className="gba:text-xs gba:text-gray-500">Use Last Country</div>
                              <div className="gba:font-medium gba:text-gray-900 gba:text-sm">{analysis.appliedRule.useLastCountry ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="gba:bg-gray-50 gba:rounded-lg gba:px-3 gba:py-2">
                              <div className="gba:text-xs gba:text-gray-500">Deduction Limit</div>
                              <div className="gba:font-medium gba:text-gray-900 gba:text-sm">{analysis.appliedRule.deductionLimit ? 'Yes' : 'No'}</div>
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
                        <span className="gba:font-medium gba:text-gray-900 gba:text-sm">
                          Trip Segments
                        </span>
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

              {/* Calculation Trace */}
              {currentTrace && (
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
                            <span className={`gba:px-2.5 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:flex gba:items-center gba:gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
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
                          <div className="gba:text-xl gba:font-semibold gba:text-gray-900">{currentTrace.summary.totalSteps}</div>
                          <div className="gba:text-xs gba:text-gray-500">Total</div>
                        </div>
                        <div className="gba:bg-white gba:rounded-lg gba:p-3 gba:text-center gba:border gba:border-gray-200">
                          <div className="gba:text-xl gba:font-semibold gba:text-emerald-600">{currentTrace.summary.successfulSteps}</div>
                          <div className="gba:text-xs gba:text-gray-500">Success</div>
                        </div>
                        <div className="gba:bg-white gba:rounded-lg gba:p-3 gba:text-center gba:border gba:border-gray-200">
                          <div className="gba:text-xl gba:font-semibold gba:text-amber-500">{currentTrace.summary.warningSteps}</div>
                          <div className="gba:text-xs gba:text-gray-500">Warnings</div>
                        </div>
                        <div className="gba:bg-white gba:rounded-lg gba:p-3 gba:text-center gba:border gba:border-gray-200">
                          <div className="gba:text-xl gba:font-semibold gba:text-red-500">{currentTrace.summary.failedSteps}</div>
                          <div className="gba:text-xs gba:text-gray-500">Failed</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Final Amounts */}
                  {Object.keys(currentTrace.finalAmounts).length > 0 && (
                    <div className="gba:bg-emerald-50/50 gba:p-4 gba:border-b gba:border-gray-200">
                      <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-3">
                        Final Amounts
                      </div>
                      <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-3">
                        {Object.entries(currentTrace.finalAmounts).map(([key, value]) => (
                          <div key={key} className="gba:bg-white gba:rounded-lg gba:px-3 gba:py-2 gba:border gba:border-emerald-200">
                            <div className="gba:text-xs gba:text-gray-500 gba:capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="gba:font-semibold gba:text-emerald-700">
                              {formatCurrency(value)}
                            </div>
                          </div>
                        ))}
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

                  {/* Timeline */}
                  <div className="gba:p-5">
                    <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-4">
                      Step-by-Step Trace ({currentTrace.steps.length} steps)
                    </div>
                    <div className="gba:max-h-[500px] gba:overflow-y-auto gba:pr-2">
                      <TraceTimeline steps={currentTrace.steps} />
                    </div>
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
}

export default AnalysisModal
