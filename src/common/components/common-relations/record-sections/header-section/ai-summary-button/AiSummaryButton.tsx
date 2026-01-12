import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'
import { AiSummaryButtonProps } from './AiSummaryTypes'
import { openEveryAI } from '@/common/utils/openEveryAI'

/**
 * Shared AI Summary Button component that opens Every AI sidebar with a summary prompt
 * across all CRM entities (investments, leads, accounts, contacts, opportunities).
 *
 * This component opens the Every AI sidebar instead of showing a popover.
 */
export const AiSummaryButton: React.FC<AiSummaryButtonProps> = ({
  config,
  summaryHook, // Keep for backward compatibility but not used in this implementation
  dataTestId = 'ai-summary-button',
  buttonText = 'AI Summary',
  className = ''
}) => {
  // Suppress unused variable warning - summaryHook kept for API compatibility
  void summaryHook
  // Handle AI Summary button click - open Every AI sidebar with summary prompt
  const handleAiSummaryClick = () => {
    const entityTypeCapitalized = config.entityType.charAt(0).toUpperCase() + config.entityType.slice(1)
    const prompt = `Summarize this ${entityTypeCapitalized}`
    openEveryAI({ prompt })
  }

  return (
    <Button onClick={handleAiSummaryClick} variant="ai" data-testid={dataTestId} className={className}>
      <Bot size={16} />
      {buttonText}
    </Button>
  )
}
