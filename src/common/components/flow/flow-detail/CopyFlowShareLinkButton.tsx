import React, { useCallback, useState } from 'react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, toast } from '@newwork/nw-design-system'
import { Check, Link2 } from 'lucide-react'
import { buildFlowDetailShareUrl } from './flowDetailShareLinks'

interface CopyFlowShareLinkButtonProps {
  flowId: string
  taskId?: string
  label?: string
  tooltip?: string
  variant?: 'outline' | 'ghost'
  size?: 'sm' | 'icon'
  className?: string
  'data-testid'?: string
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const CopyFlowShareLinkButton: React.FC<CopyFlowShareLinkButtonProps> = ({
  flowId,
  taskId,
  label,
  tooltip = 'Copy link',
  variant = 'outline',
  size = 'sm',
  className,
  'data-testid': testId = 'flow-detail-copy-link'
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const url = buildFlowDetailShareUrl(flowId, taskId)
      const success = await copyTextToClipboard(url)

      if (!success) {
        toast.error('Could not copy link', { description: 'Clipboard access was denied.' })
        return
      }

      setCopied(true)
      toast.success(taskId ? 'Step link copied' : 'Flow link copied')
      window.setTimeout(() => setCopied(false), 2000)
    },
    [flowId, taskId]
  )

  const icon = copied ? <Check className="gba:h-4 gba:w-4" /> : <Link2 className="gba:h-4 gba:w-4" />
  const isIconOnly = size === 'icon' || !label

  const button = (
    <Button
      type="button"
      variant={variant}
      size={isIconOnly ? 'icon' : size}
      onClick={event => void handleCopy(event)}
      className={className}
      data-testid={testId}
      aria-label={tooltip}
    >
      {icon}
      {!isIconOnly ? label : null}
    </Button>
  )

  if (isIconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{copied ? 'Copied' : tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return button
}
