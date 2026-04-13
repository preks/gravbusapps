import { SealCheckIcon, WarningIcon } from '@phosphor-icons/react'
import type { ReflectionResult } from '../../types/enterpriseAgent'

interface ReflectionRendererProps {
  result: ReflectionResult
}

export const ReflectionRenderer = ({ result }: ReflectionRendererProps) => {
  const isPassing = result.complete && result.recommendation === 'return'

  return (
    <div
      className={`gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:border gba:px-4 gba:py-3 gba:max-w-3xl ${
        isPassing ? 'gba:bg-muted/40 gba:border-border' : 'gba:bg-muted/60 gba:border-border'
      }`}
      data-testid="enterprise-agent-reflection"
    >
      {isPassing ? (
        <SealCheckIcon className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0 gba:mt-0.5" weight="fill" />
      ) : (
        <WarningIcon className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0 gba:mt-0.5" weight="fill" />
      )}
      <div className="gba:min-w-0">
        <p className="gba:text-sm gba:font-medium gba:text-foreground">
          {isPassing ? 'Quality check passed' : 'Agent found gaps and is continuing…'}
        </p>
        {!isPassing && result.missing_steps.length > 0 && (
          <ul className="gba:mt-1.5 gba:space-y-0.5">
            {result.missing_steps.map(step => (
              <li key={step} className="gba:text-xs gba:text-muted-foreground">
                · {step}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
