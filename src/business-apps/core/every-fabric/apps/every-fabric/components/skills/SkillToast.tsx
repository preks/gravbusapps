import { Check, WarningCircle, X } from '@phosphor-icons/react'
import type { SkillToastState } from './useSkillToast'

interface SkillToastProps {
  toast: SkillToastState
  onDismiss: () => void
}

export const SkillToast: React.FC<SkillToastProps> = ({ toast, onDismiss }) => (
  <div
    className={[
      'gba:fixed gba:bottom-4 gba:left-1/2 gba:-translate-x-1/2 gba:z-[100] gba:flex gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:px-4 gba:py-2.5 gba:shadow-lg gba:text-sm gba:animate-in gba:slide-in-from-bottom-2 gba:fade-in',
      toast.variant === 'error'
        ? 'gba:border-destructive/30 gba:bg-destructive/10 gba:text-destructive'
        : 'gba:border-primary/30 gba:bg-primary/10 gba:text-foreground'
    ].join(' ')}
    role="status"
    data-testid="skill-toast"
  >
    {toast.variant === 'error' ? (
      <WarningCircle className="gba:h-4 gba:w-4 gba:shrink-0" />
    ) : (
      <Check className="gba:h-4 gba:w-4 gba:shrink-0" />
    )}
    <span>{toast.message}</span>
    <button type="button" className="gba:ml-2 gba:p-0.5 gba:rounded gba:hover:bg-background/50" onClick={onDismiss}>
      <X className="gba:h-3.5 gba:w-3.5" />
    </button>
  </div>
)
