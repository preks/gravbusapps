import React, { useState } from 'react'
import {
  Search,
  CheckCircle,
  Database,
  Plane,
  Clock,
  Tag,
  Calculator,
  Minus,
  Car,
  BarChart3,
  CheckSquare,
  Globe,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  MapPin,
  Code
} from 'lucide-react'
import { CalculationStep, StepCategory } from '../hooks/useCalculationTrace'

interface TraceTimelineProps {
  steps: CalculationStep[]
  onStepClick?: (step: CalculationStep) => void
}

// Category icons mapping
const categoryIcons: Record<StepCategory, React.ReactNode> = {
  RULE_LOOKUP: <Search className="gba:w-3.5 gba:h-3.5" />,
  RULE_MATCH: <CheckCircle className="gba:w-3.5 gba:h-3.5" />,
  DATA_FETCH: <Database className="gba:w-3.5 gba:h-3.5" />,
  TRAVEL_BREAKDOWN: <Plane className="gba:w-3.5 gba:h-3.5" />,
  ALLOWANCE_PERIOD: <Clock className="gba:w-3.5 gba:h-3.5" />,
  ALLOWANCE_CODE: <Tag className="gba:w-3.5 gba:h-3.5" />,
  AMOUNT_CALCULATION: <Calculator className="gba:w-3.5 gba:h-3.5" />,
  DEDUCTION: <Minus className="gba:w-3.5 gba:h-3.5" />,
  MILEAGE: <Car className="gba:w-3.5 gba:h-3.5" />,
  AGGREGATION: <BarChart3 className="gba:w-3.5 gba:h-3.5" />,
  VALIDATION: <CheckSquare className="gba:w-3.5 gba:h-3.5" />,
  COUNTRY_RULE: <Globe className="gba:w-3.5 gba:h-3.5" />,
  DMN_DECISION: <FileSpreadsheet className="gba:w-3.5 gba:h-3.5" />,
  STATUS_CHANGE: <RefreshCw className="gba:w-3.5 gba:h-3.5" />,
  ERROR: <AlertCircle className="gba:w-3.5 gba:h-3.5" />,
  WARNING: <AlertTriangle className="gba:w-3.5 gba:h-3.5" />
}

// Friendly category names
const categoryNames: Record<StepCategory, string> = {
  RULE_LOOKUP: 'Rule Lookup',
  RULE_MATCH: 'Rule Matched',
  DATA_FETCH: 'Data Loading',
  TRAVEL_BREAKDOWN: 'Travel Breakdown',
  ALLOWANCE_PERIOD: 'Allowance Period',
  ALLOWANCE_CODE: 'Allowance Code',
  AMOUNT_CALCULATION: 'Calculation',
  DEDUCTION: 'Deduction',
  MILEAGE: 'Mileage',
  AGGREGATION: 'Aggregation',
  VALIDATION: 'Validation',
  COUNTRY_RULE: 'Country Rule',
  DMN_DECISION: 'Decision Table',
  STATUS_CHANGE: 'Status Change',
  ERROR: 'Error',
  WARNING: 'Warning'
}

// Category color styles
const categoryStyles: Record<StepCategory, { border: string; bg: string; text: string; icon: string }> = {
  RULE_LOOKUP: {
    border: 'gba:border-blue-300',
    bg: 'gba:bg-blue-50',
    text: 'gba:text-blue-700',
    icon: 'gba:text-blue-500'
  },
  RULE_MATCH: {
    border: 'gba:border-emerald-300',
    bg: 'gba:bg-emerald-50',
    text: 'gba:text-emerald-700',
    icon: 'gba:text-emerald-500'
  },
  DATA_FETCH: {
    border: 'gba:border-purple-300',
    bg: 'gba:bg-purple-50',
    text: 'gba:text-purple-700',
    icon: 'gba:text-purple-500'
  },
  TRAVEL_BREAKDOWN: {
    border: 'gba:border-cyan-300',
    bg: 'gba:bg-cyan-50',
    text: 'gba:text-cyan-700',
    icon: 'gba:text-cyan-500'
  },
  ALLOWANCE_PERIOD: {
    border: 'gba:border-indigo-300',
    bg: 'gba:bg-indigo-50',
    text: 'gba:text-indigo-700',
    icon: 'gba:text-indigo-500'
  },
  ALLOWANCE_CODE: {
    border: 'gba:border-teal-300',
    bg: 'gba:bg-teal-50',
    text: 'gba:text-teal-700',
    icon: 'gba:text-teal-500'
  },
  AMOUNT_CALCULATION: {
    border: 'gba:border-amber-300',
    bg: 'gba:bg-amber-50',
    text: 'gba:text-amber-700',
    icon: 'gba:text-amber-500'
  },
  DEDUCTION: {
    border: 'gba:border-orange-300',
    bg: 'gba:bg-orange-50',
    text: 'gba:text-orange-700',
    icon: 'gba:text-orange-500'
  },
  MILEAGE: {
    border: 'gba:border-lime-300',
    bg: 'gba:bg-lime-50',
    text: 'gba:text-lime-700',
    icon: 'gba:text-lime-600'
  },
  AGGREGATION: {
    border: 'gba:border-emerald-300',
    bg: 'gba:bg-emerald-50',
    text: 'gba:text-emerald-700',
    icon: 'gba:text-emerald-500'
  },
  VALIDATION: { border: 'gba:border-sky-300', bg: 'gba:bg-sky-50', text: 'gba:text-sky-700', icon: 'gba:text-sky-500' },
  COUNTRY_RULE: {
    border: 'gba:border-violet-300',
    bg: 'gba:bg-violet-50',
    text: 'gba:text-violet-700',
    icon: 'gba:text-violet-500'
  },
  DMN_DECISION: {
    border: 'gba:border-fuchsia-300',
    bg: 'gba:bg-fuchsia-50',
    text: 'gba:text-fuchsia-700',
    icon: 'gba:text-fuchsia-500'
  },
  STATUS_CHANGE: {
    border: 'gba:border-rose-300',
    bg: 'gba:bg-rose-50',
    text: 'gba:text-rose-700',
    icon: 'gba:text-rose-500'
  },
  ERROR: { border: 'gba:border-red-300', bg: 'gba:bg-red-50', text: 'gba:text-red-700', icon: 'gba:text-red-500' },
  WARNING: {
    border: 'gba:border-amber-300',
    bg: 'gba:bg-amber-50',
    text: 'gba:text-amber-700',
    icon: 'gba:text-amber-500'
  }
}

const errorStyles = {
  border: 'gba:border-red-300',
  bg: 'gba:bg-red-50',
  text: 'gba:text-red-700',
  icon: 'gba:text-red-500'
}

export const TraceTimeline: React.FC<TraceTimelineProps> = ({ steps, onStepClick }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const getStyles = (category: StepCategory, success: boolean) => {
    if (!success) return errorStyles
    return (
      categoryStyles[category] || {
        border: 'gba:border-gray-300',
        bg: 'gba:bg-gray-50',
        text: 'gba:text-gray-700',
        icon: 'gba:text-gray-500'
      }
    )
  }

  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="gba:text-gray-400 gba:italic">null</span>
    if (typeof value === 'boolean')
      return (
        <span className={value ? 'gba:text-emerald-600 gba:font-medium' : 'gba:text-red-600 gba:font-medium'}>
          {value ? 'Yes' : 'No'}
        </span>
      )
    if (typeof value === 'number') return <span className="gba:text-blue-600 gba:font-mono">{value}</span>
    if (typeof value === 'object') {
      return (
        <pre className="gba:text-xs gba:bg-gray-100 gba:p-2 gba:rounded gba:overflow-x-auto gba:max-w-full gba:font-mono gba:text-gray-700">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }
    return <span className="gba:text-gray-700">{String(value)}</span>
  }

  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return (
    <div className="gba:space-y-2">
      {steps.map((step, index) => {
        const isExpanded = expandedSteps.has(step.stepId)
        const hasDetails =
          Object.keys(step.inputs || {}).length > 0 ||
          Object.keys(step.outputs || {}).length > 0 ||
          step.formula ||
          step.errorMessage
        const styles = getStyles(step.category, step.success)

        return (
          <div key={step.stepId} className={`gba:relative gba:pl-8 ${index < steps.length - 1 ? 'gba:pb-2' : ''}`}>
            {/* Timeline connector */}
            {index < steps.length - 1 && (
              <div className="gba:absolute gba:left-[11px] gba:top-7 gba:w-0.5 gba:h-[calc(100%-4px)] gba:bg-gray-200" />
            )}

            {/* Step node */}
            <div className="gba:absolute gba:left-0 gba:top-0">
              <div
                className={`gba:w-6 gba:h-6 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:border-2 gba:bg-white ${styles.border} ${styles.icon}`}
              >
                {categoryIcons[step.category] || <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-current" />}
              </div>
            </div>

            {/* Step card */}
            <div
              className={`gba:border gba:rounded-lg gba:overflow-hidden gba:cursor-pointer gba:transition-all hover:gba:shadow-sm ${styles.border} ${isExpanded ? styles.bg : 'gba:bg-white'}`}
              onClick={() => {
                if (hasDetails) toggleStep(step.stepId)
                onStepClick?.(step)
              }}
            >
              {/* Header */}
              <div className="gba:p-3">
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                      <span className="gba:text-xs gba:text-gray-400 gba:font-mono">#{step.stepOrder}</span>
                      <span className={`gba:text-sm gba:font-medium ${styles.text}`}>
                        {categoryNames[step.category] || step.category}
                      </span>
                      {step.durationMs !== undefined && (
                        <span className="gba:text-xs gba:text-gray-400 gba:bg-gray-100 gba:px-1.5 gba:py-0.5 gba:rounded">
                          {step.durationMs}ms
                        </span>
                      )}
                    </div>
                    <div className="gba:text-sm gba:text-gray-700 gba:mt-1">{step.stepName}</div>
                    {step.description && <p className="gba:text-xs gba:text-gray-500 gba:mt-1">{step.description}</p>}
                    {/* Show calculated value or result from outputs */}
                    {(step.calculatedValue !== undefined || step.outputs?.result) && (
                      <div className="gba:mt-2 gba:inline-flex gba:items-center gba:gap-1.5 gba:bg-white gba:px-2.5 gba:py-1 gba:rounded gba:border gba:border-gray-200 gba:text-sm">
                        <span className="gba:text-gray-500">Result:</span>
                        <span className="gba:font-semibold gba:text-emerald-600">
                          {step.calculatedValue !== undefined
                            ? typeof step.calculatedValue === 'number'
                              ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
                                  step.calculatedValue
                                )
                              : String(step.calculatedValue)
                            : String(step.outputs?.result || '')}
                        </span>
                      </div>
                    )}
                  </div>

                  {hasDetails && (
                    <button
                      className={`gba:w-6 gba:h-6 gba:rounded gba:flex gba:items-center gba:justify-center gba:text-gray-400 gba:transition-transform ${isExpanded ? 'gba:rotate-180' : ''}`}
                    >
                      <ChevronDown className="gba:w-4 gba:h-4" />
                    </button>
                  )}
                </div>

                {/* Error/Warning messages */}
                {step.errorMessage && (
                  <div className="gba:mt-3 gba:p-2.5 gba:bg-red-100 gba:border gba:border-red-200 gba:rounded-lg gba:flex gba:items-start gba:gap-2">
                    <AlertCircle className="gba:w-4 gba:h-4 gba:text-red-500 gba:flex-shrink-0 gba:mt-0.5" />
                    <div className="gba:text-sm gba:text-red-700">{step.errorMessage}</div>
                  </div>
                )}
                {step.warningMessage && (
                  <div className="gba:mt-3 gba:p-2.5 gba:bg-amber-100 gba:border gba:border-amber-200 gba:rounded-lg gba:flex gba:items-start gba:gap-2">
                    <AlertTriangle className="gba:w-4 gba:h-4 gba:text-amber-500 gba:flex-shrink-0 gba:mt-0.5" />
                    <div className="gba:text-sm gba:text-amber-700">{step.warningMessage}</div>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && hasDetails && (
                <div className="gba:border-t gba:border-gray-200 gba:bg-white gba:p-3 gba:space-y-3">
                  {/* Formula */}
                  {step.formula && (
                    <div>
                      <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
                        <Code className="gba:w-3.5 gba:h-3.5" />
                        Formula
                      </div>
                      <code className="gba:block gba:bg-gray-50 gba:p-2.5 gba:rounded gba:text-sm gba:font-mono gba:text-gray-800 gba:border gba:border-gray-200">
                        {step.formula}
                      </code>
                    </div>
                  )}

                  {/* Inputs */}
                  {Object.keys(step.inputs || {}).length > 0 && (
                    <div>
                      <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
                        <Database className="gba:w-3.5 gba:h-3.5" />
                        Inputs
                      </div>
                      <div className="gba:bg-gray-50 gba:rounded gba:border gba:border-gray-200 gba:divide-y gba:divide-gray-200">
                        {Object.entries(step.inputs).map(([key, value]) => (
                          <div key={key} className="gba:flex gba:text-sm">
                            <div className="gba:px-3 gba:py-2 gba:font-medium gba:text-gray-600 gba:bg-gray-100/50 gba:w-1/3 gba:flex-shrink-0">
                              {formatKey(key)}
                            </div>
                            <div className="gba:px-3 gba:py-2 gba:break-all gba:flex-1">{formatValue(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outputs */}
                  {Object.keys(step.outputs || {}).length > 0 && (
                    <div>
                      <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
                        <BarChart3 className="gba:w-3.5 gba:h-3.5" />
                        Outputs
                      </div>
                      <div className="gba:bg-emerald-50/50 gba:rounded gba:border gba:border-emerald-200 gba:divide-y gba:divide-emerald-200">
                        {Object.entries(step.outputs).map(([key, value]) => (
                          <div key={key} className="gba:flex gba:text-sm">
                            <div className="gba:px-3 gba:py-2 gba:font-medium gba:text-gray-600 gba:bg-emerald-100/50 gba:w-1/3 gba:flex-shrink-0">
                              {formatKey(key)}
                            </div>
                            <div className="gba:px-3 gba:py-2 gba:break-all gba:flex-1 gba:text-emerald-700 gba:font-medium">
                              {formatValue(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source */}
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-gray-400 gba:pt-2 gba:border-t gba:border-gray-100">
                    <MapPin className="gba:w-3 gba:h-3" />
                    <code className="gba:font-mono">
                      {step.sourceService}.{step.sourceMethod}()
                    </code>
                    {step.timestamp && (
                      <>
                        <span>·</span>
                        <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {steps.length === 0 && (
        <div className="gba:text-center gba:py-12 gba:text-gray-400">
          <Database className="gba:w-10 gba:h-10 gba:mx-auto gba:mb-3 gba:text-gray-300" />
          <div className="gba:text-sm">No calculation steps recorded</div>
        </div>
      )}
    </div>
  )
}

export default TraceTimeline
