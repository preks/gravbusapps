import { useState, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Sparkles, Check, Search, BarChart3, Lightbulb, LineChart, FileText } from 'lucide-react'
import translations from '../../_i18n'

const STEPS = [
  { labelKey: 'analysis-loading-step-analyzing', icon: Search },
  { labelKey: 'analysis-loading-step-metrics', icon: BarChart3 },
  { labelKey: 'analysis-loading-step-insights', icon: Lightbulb },
  { labelKey: 'analysis-loading-step-visualizations', icon: LineChart },
  { labelKey: 'analysis-loading-step-compiling', icon: FileText }
]

const STEP_INTERVAL_MS = 3200

interface AnalysisLoadingAnimationProps {
  testId?: string
}

export const AnalysisLoadingAnimation = ({ testId = 'nexus-analysis-loading' }: AnalysisLoadingAnimationProps) => {
  const { t } = useTranslation(translations)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev))
    }, STEP_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:min-h-[500px]"
      data-testid={testId}
    >
      {/* === Orbital system === */}
      <div className="gba:relative gba:w-40 gba:h-40 gba:mb-12">
        {/* Ring 1 — outer track */}
        <div className="gba:absolute gba:inset-0 gba:rounded-full gba:border gba:border-primary/10" />
        <div className="gba:absolute gba:inset-0 gba:animate-spin gba:[animation-duration:10s]">
          <div className="gba:absolute gba:top-0 gba:left-1/2 gba:-translate-x-1/2 gba:-translate-y-1/2 gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-primary" />
        </div>

        {/* Ring 2 — middle track, counter-clockwise */}
        <div className="gba:absolute gba:inset-6 gba:rounded-full gba:border gba:border-info/10" />
        <div className="gba:absolute gba:inset-6 gba:animate-spin gba:[animation-duration:7s] gba:[animation-direction:reverse]">
          <div className="gba:absolute gba:bottom-0 gba:left-1/2 gba:-translate-x-1/2 gba:translate-y-1/2 gba:h-2 gba:w-2 gba:rounded-full gba:bg-info" />
        </div>

        {/* Ring 3 — inner track, fast */}
        <div className="gba:absolute gba:inset-12 gba:rounded-full gba:border gba:border-warning/10" />
        <div className="gba:absolute gba:inset-12 gba:animate-spin gba:[animation-duration:4s]">
          <div className="gba:absolute gba:right-0 gba:top-1/2 gba:-translate-y-1/2 gba:translate-x-1/2 gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-warning" />
        </div>

        {/* Central pulsing glow */}
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
          <div className="gba:h-14 gba:w-14 gba:rounded-2xl gba:bg-primary/5 gba:animate-pulse gba:[animation-duration:2s]" />
        </div>

        {/* Central icon */}
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
          <Sparkles className="gba:h-7 gba:w-7 gba:text-primary" />
        </div>
      </div>

      {/* Title */}
      <h3 className="gba:font-funnel-display gba:text-xl gba:font-semibold gba:text-foreground gba:mb-8">
        {t('analysis-loading-title')}
      </h3>

      {/* Progress Steps */}
      <div className="gba:space-y-3 gba:w-64">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isComplete = i < step
          const label = t(s.labelKey)

          return (
            <div
              key={s.labelKey}
              className={`gba:flex gba:items-center gba:gap-3 gba:transition-all gba:duration-500 ${
                isActive ? 'gba:opacity-100' : isComplete ? 'gba:opacity-60' : 'gba:opacity-30'
              }`}
              data-testid={`${testId}-step-${i}`}
            >
              <div
                className={`gba:h-6 gba:w-6 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:transition-colors gba:duration-500 ${
                  isActive ? 'gba:bg-primary/10' : isComplete ? 'gba:bg-success/10' : 'gba:bg-muted'
                }`}
              >
                {isComplete ? (
                  <Check className="gba:h-3 gba:w-3 gba:text-success" />
                ) : (
                  <Icon className={`gba:h-3 gba:w-3 ${isActive ? 'gba:text-primary' : 'gba:text-muted-foreground'}`} />
                )}
              </div>
              <span
                className={`gba:text-sm gba:transition-colors gba:duration-500 ${
                  isActive ? 'gba:text-foreground gba:font-medium' : 'gba:text-muted-foreground'
                }`}
              >
                {label}
                {isActive && <span className="gba:animate-pulse">...</span>}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="gba:mt-8 gba:w-64 gba:h-1 gba:bg-muted gba:rounded-full gba:overflow-hidden">
        <div
          className="gba:h-full gba:bg-primary gba:rounded-full gba:transition-all gba:duration-700 gba:ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
