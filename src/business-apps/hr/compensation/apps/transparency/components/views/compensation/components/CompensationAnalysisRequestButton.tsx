import { Button, useTranslation } from '@newwork/nw-design-system'
import { ChartLineUpIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

import translations from '../../../../_i18n'
import type { UseRequestCompensationAnalysisResult } from '../../../../hooks/useRequestCompensationAnalysis'

interface CompensationAnalysisRequestButtonProps {
  accessToken?: string
  requestHandlers: UseRequestCompensationAnalysisResult
  label?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm' | 'iconXs'
  className?: string
  buttonTestId?: string
}

export default function CompensationAnalysisRequestButton({
  accessToken,
  requestHandlers,
  label,
  variant = 'default',
  size = 'default',
  className,
  buttonTestId = 'compensation-analysis-request-button'
}: Readonly<CompensationAnalysisRequestButtonProps>) {
  const { t } = useTranslation(translations)
  const { loading, requestCompleteAnalysis } = requestHandlers
  const buttonLabel = label ?? t('compensation-analysis-request-button')

  const handleClick = async () => {
    if (!accessToken) {
      return
    }

    try {
      await requestCompleteAnalysis()
      toast.success(t('compensation-analysis-request-success'))
    } catch {
      toast.error(t('compensation-analysis-request-error'))
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      data-testid={buttonTestId}
      disabled={!accessToken || loading}
      onClick={() => {
        void handleClick()
      }}
    >
      <ChartLineUpIcon className="gba:w-4 gba:h-4 gba:mr-2" />
      {loading ? t('compensation-analysis-request-in-progress') : buttonLabel}
    </Button>
  )
}
