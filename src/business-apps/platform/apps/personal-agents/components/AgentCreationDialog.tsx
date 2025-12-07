/**
 * Agent Creation Confirmation Dialog
 * 
 * Shows parsed agent configuration and allows user to confirm/edit before creating.
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Card,
  CardContent,
  Badge
} from '@newwork/nw-design-system'
import type { AgentParseResult } from '../types'
import { AgentParserService } from '../services/AgentParserService'

interface AgentCreationDialogProps {
  isOpen: boolean
  parseResult: AgentParseResult | null
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
  'data-testid'?: string
}

export const AgentCreationDialog: React.FC<AgentCreationDialogProps> = ({
  isOpen,
  parseResult,
  isLoading,
  onConfirm,
  onCancel,
  'data-testid': testId = 'agent-creation-dialog'
}) => {
  if (!parseResult) return null

  const parserService = new AgentParserService('')
  const summary = parseResult.agent ? parserService.generateAgentSummary(parseResult.agent) : ''
  const validation = parseResult.agent ? parserService.validateAgentConfig(parseResult.agent) : { valid: false, errors: [] }

  const confidenceColor = 
    parseResult.confidence >= 0.8 ? 'gba:bg-success' :
    parseResult.confidence >= 0.5 ? 'gba:bg-warning' :
    'gba:bg-destructive'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent data-testid={testId} className="gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Personal Agent</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Confidence indicator */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">Confidence:</span>
            <Badge className={`${confidenceColor} gba:text-white`}>
              {Math.round(parseResult.confidence * 100)}%
            </Badge>
            {parseResult.confidence < 0.7 && (
              <span className="gba:text-sm gba:text-warning">
                Low confidence - please review carefully
              </span>
            )}
          </div>

          {/* Agent name and description */}
          {parseResult.agent && (
            <Card>
              <CardContent className="gba:pt-6">
                <div className="gba:space-y-3">
                  <div>
                    <h3 className="gba:font-semibold gba:text-lg">{parseResult.agent.name}</h3>
                    <p className="gba:text-muted-foreground gba:text-sm">{parseResult.agent.description}</p>
                  </div>

                  {/* Original prompt */}
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground gba:font-semibold gba:uppercase gba:mb-1">
                      Your request:
                    </p>
                    <p className="gba:text-sm gba:italic gba:text-muted-foreground">
                      "{parseResult.agent.originalPrompt}"
                    </p>
                  </div>

                  {/* Summary */}
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground gba:font-semibold gba:uppercase gba:mb-1">
                      What it does:
                    </p>
                    <p className="gba:text-sm">{summary}</p>
                  </div>

                  {/* Trigger details */}
                  {parseResult.agent.triggerType && (
                    <div className="gba:flex gba:items-start gba:gap-2 gba:pt-2">
                      <Badge variant="outline">{parseResult.agent.triggerType}</Badge>
                      {parseResult.agent.triggerType === 'schedule' && parseResult.agent.scheduleConfig && (
                        <div className="gba:text-sm">
                          <span className="gba:font-semibold">Schedule: </span>
                          {parseResult.agent.scheduleConfig.type === 'daily' && `Daily at ${parseResult.agent.scheduleConfig.time}`}
                          {parseResult.agent.scheduleConfig.type === 'weekly' && 
                            `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseResult.agent.scheduleConfig.dayOfWeek || 0]} at ${parseResult.agent.scheduleConfig.time}`
                          }
                          {parseResult.agent.scheduleConfig.type === 'monthly' && 
                            `Day ${parseResult.agent.scheduleConfig.dayOfMonth} of each month at ${parseResult.agent.scheduleConfig.time}`
                          }
                        </div>
                      )}
                      {parseResult.agent.triggerType === 'event' && parseResult.agent.eventConfig && (
                        <div className="gba:text-sm">
                          <span className="gba:font-semibold">Event: </span>
                          When {parseResult.agent.eventConfig.entityType} is {parseResult.agent.eventConfig.eventType}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {parseResult.agent.actions && parseResult.agent.actions.length > 0 && (
                    <div>
                      <p className="gba:text-xs gba:text-muted-foreground gba:font-semibold gba:uppercase gba:mb-2">
                        Actions:
                      </p>
                      <div className="gba:space-y-2">
                        {parseResult.agent.actions.map((action, index) => (
                          <div key={index} className="gba:flex gba:items-start gba:gap-2 gba:text-sm">
                            <Badge variant="secondary">{index + 1}</Badge>
                            <span>
                              {action.type === 'query' && `Query ${action.entityType} data`}
                              {action.type === 'notify' && `Send ${action.channel} notification`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation errors */}
          {!validation.valid && (
            <Card className="gba:border-destructive">
              <CardContent className="gba:pt-6">
                <p className="gba:text-destructive gba:font-semibold gba:mb-2">Configuration Issues:</p>
                <ul className="gba:list-disc gba:pl-5 gba:space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="gba:text-sm gba:text-destructive">{error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {parseResult.suggestions && parseResult.suggestions.length > 0 && (
            <Card className="gba:bg-info-secondary">
              <CardContent className="gba:pt-6">
                <p className="gba:text-info gba:font-semibold gba:mb-2">Suggestions:</p>
                <ul className="gba:list-disc gba:pl-5 gba:space-y-1">
                  {parseResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="gba:text-sm">{suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Error message */}
          {parseResult.error && (
            <Card className="gba:border-destructive">
              <CardContent className="gba:pt-6">
                <p className="gba:text-destructive gba:font-semibold gba:mb-2">Error:</p>
                <p className="gba:text-sm">{parseResult.error}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid={`${testId}-cancel-button`}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            disabled={isLoading || !validation.valid || !parseResult.success}
            data-testid={`${testId}-confirm-button`}
          >
            {isLoading ? 'Creating...' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

