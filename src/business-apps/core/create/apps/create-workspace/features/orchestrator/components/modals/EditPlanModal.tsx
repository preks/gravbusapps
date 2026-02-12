/**
 * EditPlanModal - Modal for customizing components in a build plan
 *
 * Allows users to:
 * - Toggle component inclusion (skip/include)
 * - Edit component names and descriptions
 * - View estimated build time
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Checkbox,
  cn
} from '@newwork/nw-design-system'
import { Monitor, Bot, Code2, Workflow, Database, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import type { BuildPlan, ComponentSpec, ComponentType } from '../../types'

export interface EditPlanModalProps {
  plan: BuildPlan
  isOpen: boolean
  onClose: () => void
  onSave: (updatedComponents: ComponentSpec[]) => void
  isSaving?: boolean
  error?: string | null
  'data-testid'?: string
}

// Icon mapping for component types
const typeIcons: Record<ComponentType, LucideIcon> = {
  screen: Monitor,
  agent: Bot,
  function: Code2,
  flow: Workflow,
  data_model: Database
}

// Labels for component types
const typeLabels: Record<ComponentType, string> = {
  screen: 'Screens',
  agent: 'Task Experts',
  function: 'Functions',
  flow: 'Flows',
  data_model: 'Data Models'
}

interface EditableComponent extends ComponentSpec {
  included: boolean
  expanded: boolean
}

/**
 * EditPlanModal component
 */
export const EditPlanModal: React.FC<EditPlanModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  error,
  'data-testid': testId = 'edit-plan-modal'
}) => {
  // Initialize editable components state
  const [components, setComponents] = useState<EditableComponent[]>(() =>
    plan.components.map(comp => ({
      ...comp,
      included: comp.status !== 'skipped',
      expanded: false
    }))
  )

  const [validationError, setValidationError] = useState<string | null>(null)

  // Get component description (user-friendly if available)
  const getComponentDescription = useCallback((comp: EditableComponent) => {
    return comp.userFriendlyDescription || comp.description
  }, [])

  // Group components by type
  const componentsByType = useMemo(() => {
    const groups = new Map<ComponentType, EditableComponent[]>()

    components.forEach(comp => {
      const existing = groups.get(comp.type) || []
      groups.set(comp.type, [...existing, comp])
    })

    return groups
  }, [components])

  // Count included components
  const includedCount = useMemo(() => components.filter(c => c.included).length, [components])

  // Calculate estimated duration (only for included components)
  const estimatedMinutes = useMemo(() => {
    const includedComponents = components.filter(c => c.included)
    const seconds = plan.estimatedDurationSeconds || includedComponents.length * 60
    return Math.ceil(seconds / 60)
  }, [components, plan.estimatedDurationSeconds])

  // Toggle component inclusion
  const toggleComponent = useCallback((componentId: string) => {
    setComponents(prev => prev.map(comp => (comp.id === componentId ? { ...comp, included: !comp.included } : comp)))
    setValidationError(null)
  }, [])

  // Toggle component expansion
  const toggleExpanded = useCallback((componentId: string) => {
    setComponents(prev => prev.map(comp => (comp.id === componentId ? { ...comp, expanded: !comp.expanded } : comp)))
  }, [])

  // Update component name
  const updateComponentName = useCallback((componentId: string, name: string) => {
    setComponents(prev => prev.map(comp => (comp.id === componentId ? { ...comp, name } : comp)))
    setValidationError(null)
  }, [])

  // Update component description
  const updateComponentDescription = useCallback((componentId: string, description: string) => {
    setComponents(prev => prev.map(comp => (comp.id === componentId ? { ...comp, description } : comp)))
  }, [])

  // Validate before saving
  const handleSave = useCallback(() => {
    // Validation: At least one component must be included
    if (includedCount === 0) {
      setValidationError('At least one component must be included')
      return
    }

    // Validation: Component names must be unique among included components
    const includedComponents = components.filter(c => c.included)
    const names = includedComponents.map(c => c.name.trim())
    const uniqueNames = new Set(names)
    if (names.length !== uniqueNames.size) {
      setValidationError('Component names must be unique')
      return
    }

    // Validation: Component names cannot be empty
    if (includedComponents.some(c => !c.name.trim())) {
      setValidationError('Component names cannot be empty')
      return
    }

    // Build the updated components list
    const updatedComponents: ComponentSpec[] = components.map(comp => {
      const { included, ...componentSpec } = comp
      return {
        ...componentSpec,
        status: included ? componentSpec.status : 'skipped'
      }
    })

    onSave(updatedComponents)
  }, [components, includedCount, onSave])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="gba:max-w-3xl gba:max-h-[85vh] gba:overflow-hidden gba:flex gba:flex-col"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle>Customize Components</DialogTitle>
          <DialogDescription>Choose which components to build and edit their specifications</DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-1">
          <div className="gba:space-y-4">
            {/* Components grouped by type */}
            {Array.from(componentsByType.entries()).map(([type, typeComponents]) => {
              const Icon = typeIcons[type]
              const label = typeLabels[type]

              return (
                <div key={type} className="gba:space-y-2">
                  {/* Type header */}
                  <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
                    <Icon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground">
                      {label} ({typeComponents.length})
                    </span>
                  </div>

                  {/* Components of this type */}
                  <div className="gba:space-y-2 gba:pl-6">
                    {typeComponents.map(component => (
                      <div
                        key={component.id}
                        className={cn(
                          'gba:border gba:border-border gba:rounded-lg gba:p-3 gba:transition-all',
                          !component.included && 'gba:opacity-50 gba:bg-muted/30'
                        )}
                      >
                        {/* Component header */}
                        <div className="gba:flex gba:items-start gba:gap-3">
                          {/* Checkbox */}
                          <Checkbox
                            checked={component.included}
                            onCheckedChange={() => toggleComponent(component.id)}
                            className="gba:mt-0.5"
                          />

                          {/* Component info */}
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                              <span className="gba:text-sm gba:font-medium gba:text-foreground">{component.name}</span>

                              {/* Expand/collapse button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(component.id)}
                                className="gba:h-6 gba:w-6 gba:p-0"
                              >
                                {component.expanded ? (
                                  <ChevronDown className="gba:h-3.5 gba:w-3.5" />
                                ) : (
                                  <ChevronRight className="gba:h-3.5 gba:w-3.5" />
                                )}
                              </Button>
                            </div>

                            {!component.expanded && (
                              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:line-clamp-1">
                                {getComponentDescription(component)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Expanded edit form */}
                        {component.expanded && component.included && (
                          <div className="gba:mt-3 gba:pl-8 gba:space-y-3">
                            {/* Name input */}
                            <div className="gba:space-y-1.5">
                              <Label htmlFor={`name-${component.id}`} className="gba:text-xs">
                                Name
                              </Label>
                              <Input
                                id={`name-${component.id}`}
                                value={component.name}
                                onChange={e => updateComponentName(component.id, e.target.value)}
                                placeholder="Component name"
                                className="gba:h-9 gba:text-sm"
                              />
                            </div>

                            {/* Description textarea */}
                            <div className="gba:space-y-1.5">
                              <Label htmlFor={`desc-${component.id}`} className="gba:text-xs">
                                Description
                              </Label>
                              <Textarea
                                id={`desc-${component.id}`}
                                value={component.description}
                                onChange={e => updateComponentDescription(component.id, e.target.value)}
                                placeholder="Component description"
                                rows={2}
                                className="gba:text-sm gba:resize-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary and errors */}
        <div className="gba:border-t gba:border-border gba:pt-4 gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
            <span className="gba:text-muted-foreground">
              {includedCount} of {components.length} components selected
            </span>
            <span className="gba:text-muted-foreground">
              Estimated time: ~{estimatedMinutes} {estimatedMinutes === 1 ? 'minute' : 'minutes'}
            </span>
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:px-3 gba:py-2 gba:rounded-md gba:whitespace-pre-line">
              {validationError}
            </div>
          )}

          {/* API error */}
          {error && (
            <div className="gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:px-3 gba:py-2 gba:rounded-md gba:whitespace-pre-line">
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || includedCount === 0}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
