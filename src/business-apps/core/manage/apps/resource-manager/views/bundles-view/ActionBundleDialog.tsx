import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Combobox,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCreateComponent } from '@/common/data/resources/hooks/useCreateComponent'
import { useUpdateComponent } from '@/common/data/resources/hooks/useUpdateComponent'
import { useCreateAction } from '@/common/data/resources/hooks/useCreateAction'
import { useCreateActionAssignment } from '@/common/data/resources/hooks/useCreateActionAssignment'
import { useCreateContext } from '@/common/data/resources/hooks/useCreateContext'
import { useContexts } from '@/common/data/resources/hooks/useContexts'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import { useFeaturesCatalog } from '@/common/data/resources/hooks/useFeaturesCatalog'
import { useResourceData, useResourceActions } from '../../contexts/ResourceManagerContext'
import type { Component } from '@/common/data/resources/types/component.types'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import { splitCombinedType } from '../../utils/componentKeyUtils'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { DebugSection, type DebugStep } from './segments/DebugSection'

export interface ActionFlowRow {
  flowName: string
  contextId: string | null
  roles: string[]
  features: string[]
  useCustomName?: boolean
}

function getFlowEffectiveName(row: ActionFlowRow, componentName: string): string {
  return row.useCustomName && row.flowName?.trim() ? row.flowName.trim() : componentName.trim()
}

const DEFAULT_NAMESPACE_ID = '1e6e2926-33f1-4dfb-a3b8-d535602d06b0'
const DEFAULT_NAMESPACE_CODE = 'nw_dev'

const COMPONENT_TYPE_OPTIONS = [
  { value: 'native-form', label: 'Form' },
  { value: 'native-window', label: 'Window' },
  { value: 'native-popup', label: 'Popup' }
] as const

export interface ActionBundleDialogInitialData {
  componentPath?: string
  name?: string
  screenKey?: string
  domain?: string
  process?: string
  existingComponentId?: string
}

export interface ActionBundleDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: ActionBundleDialogInitialData
  'data-testid'?: string
}

export const ActionBundleDialog: React.FC<ActionBundleDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  'data-testid': dataTestId = 'register-new-action-dialog',
  ...context
}) => {
  const [componentType, setComponentType] = useState<'native-form' | 'native-window' | 'native-popup'>('native-form')
  const [name, setName] = useState('')
  const [componentPath, setComponentPath] = useState('')
  const [version, setVersion] = useState('')
  const [domain, setDomain] = useState('')
  const [process, setProcess] = useState('')
  const [flowRows, setFlowRows] = useState<ActionFlowRow[]>([
    { flowName: '', contextId: null, roles: [], features: [] }
  ])
  const [activeFlowTab, setActiveFlowTab] = useState('0')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [newContextName, setNewContextName] = useState('')
  const [isCreatingContext, setIsCreatingContext] = useState(false)

  const { domains, getProcessesForDomain } = useResourceData()
  const { refreshServices } = useResourceActions()
  const { createComponent, isCreating: isCreatingComponent } = useCreateComponent(context)
  const { updateComponent } = useUpdateComponent(context)
  const { createAction, isLoading: isCreatingAction } = useCreateAction(context)
  const { createActionAssignment, isLoading: isCreatingAssignment } = useCreateActionAssignment(context)
  const { createContext } = useCreateContext(context)
  const { contexts: contextsWithActions, refetch: refetchContexts } = useContexts(context, {
    limit: 25,
    offset: 0,
    returnTotalRecords: true
  })
  const { roles: roleOptions, refetch: refetchRoles } = useRolesCatalog(context)
  const { features: featureOptions, refetch: refetchFeatures } = useFeaturesCatalog(context)

  const processOptions = domain ? getProcessesForDomain(domain) : []
  const contextOptions = useMemo(
    () => contextsWithActions.map(c => ({ value: c.context.id, label: c.context.contextName })),
    [contextsWithActions]
  )
  const contextById = useMemo(() => {
    const map = new Map<string, { id: string; contextName: string }>()
    contextsWithActions.forEach(c => {
      if (c.context?.id) map.set(c.context.id, c.context)
    })
    return map
  }, [contextsWithActions])
  const isSubmitting = isCreatingComponent || isCreatingAction || isCreatingAssignment

  const componentTypeFromScreenKey = useCallback((key: string): 'native-form' | 'native-window' | 'native-popup' => {
    if (key.startsWith('win_')) return 'native-window'
    if (key.startsWith('pop_')) return 'native-popup'
    return 'native-form'
  }, [])

  useEffect(() => {
    if (!open) {
      setComponentType('native-form')
      setName('')
      setComponentPath('')
      setVersion('')
      setDomain('')
      setProcess('')
      setFlowRows([{ flowName: '', contextId: null, roles: [], features: [], useCustomName: false }])
      setActiveFlowTab('0')
      setSubmitError(null)
      setNewContextName('')
    }
  }, [open])

  useEffect(() => {
    if (open) {
      refetchContexts()
      refetchRoles()
      refetchFeatures()
    }
  }, [open, refetchContexts, refetchRoles, refetchFeatures])

  useEffect(() => {
    if (open) {
      refreshServices?.()
    }
  }, [open, refreshServices])

  useEffect(() => {
    if (open && initialData) {
      if (initialData.componentPath != null) setComponentPath(initialData.componentPath)
      if (initialData.name != null) setName(initialData.name)
      if (initialData.screenKey != null) {
        setComponentType(componentTypeFromScreenKey(initialData.screenKey))
      }
      if (initialData.domain != null) setDomain(initialData.domain)
      if (initialData.process != null) setProcess(initialData.process)
    }
  }, [open, initialData, componentTypeFromScreenKey])

  useEffect(() => {
    const idx = parseInt(activeFlowTab, 10)
    if (flowRows.length > 0 && (idx < 0 || idx >= flowRows.length)) {
      setActiveFlowTab(String(Math.min(flowRows.length - 1, Math.max(0, idx))))
    }
  }, [flowRows.length, activeFlowTab])

  const screenKeyPrefix =
    componentType === 'native-window' ? 'win_' : componentType === 'native-popup' ? 'pop_' : 'frm_'
  const screenKey = useMemo(() => {
    if (initialData?.screenKey != null && initialData.screenKey.trim()) return initialData.screenKey.trim()
    const suffix = process || (name.trim() ? name.trim().replace(/\s+/g, '-') : '')
    return suffix ? `${screenKeyPrefix}${suffix}` : `${screenKeyPrefix}`
  }, [initialData?.screenKey, process, name, screenKeyPrefix])

  const addFlowRow = useCallback(() => {
    setFlowRows(prev => [...prev, { flowName: '', contextId: null, roles: [], features: [], useCustomName: false }])
    setActiveFlowTab(String(flowRows.length))
  }, [flowRows.length])
  const removeFlowRow = useCallback((index: number) => {
    setFlowRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
    setActiveFlowTab(prev => {
      const idx = parseInt(prev, 10)
      if (idx >= index && idx > 0) return String(idx - 1)
      return prev
    })
  }, [])
  const setFlowRow = useCallback(
    (index: number, field: keyof ActionFlowRow, value: string | null | string[] | boolean) => {
      setFlowRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    },
    []
  )

  const handleCreateContext = useCallback(async () => {
    const trimmed = newContextName?.trim()
    if (!trimmed) return
    setIsCreatingContext(true)
    try {
      const newId = await createContext({ contextName: trimmed, contextData: [] })
      if (newId) {
        await refetchContexts()
        const tabIdx = parseInt(activeFlowTab, 10)
        if (flowRows[tabIdx] != null) setFlowRow(tabIdx, 'contextId', newId)
        setNewContextName('')
      }
    } finally {
      setIsCreatingContext(false)
    }
  }, [newContextName, createContext, refetchContexts, activeFlowTab, flowRows, setFlowRow])

  const debugSteps = useMemo((): DebugStep[] => {
    const steps: DebugStep[] = []
    const componentName = name.trim()
    const hasFlow = flowRows.some(r => getFlowEffectiveName(r, componentName))
    if (!componentName || !componentPath.trim() || !domain || !process || !hasFlow) return steps

    const { builderType, screenType } = splitCombinedType(componentType)
    const componentPayload: Omit<
      Component,
      'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
    > = {
      name: name.trim(),
      screenKey,
      namespaceCode: DEFAULT_NAMESPACE_CODE,
      namespaceId: DEFAULT_NAMESPACE_ID,
      namespaceDescription: DEFAULT_NAMESPACE_CODE,
      type: screenType as 'FORM' | 'POPUP' | 'WINDOW',
      screenComponents: {
        key: screenKey,
        name: name.trim(),
        builderType: builderType as any,
        appName: name.trim(),
        flowIcon: '',
        formDefinition: { componentPath: componentPath.trim(), version: version || '' },
        release: ''
      }
    }
    steps.push({ order: 1, method: 'POST', endpoint: '/screen', payload: componentPayload })
    let order = 2
    flowRows.forEach((row, i) => {
      const effectiveFlowName = getFlowEffectiveName(row, componentName)
      if (!effectiveFlowName) return
      const flowId = effectiveFlowName.replace(/\s+/g, '-').toLowerCase()
      const roleNames = (row.roles ?? [])
        .map(id => roleOptions.find(r => r.id === id)?.name)
        .filter(Boolean) as string[]
      const featureNames = (row.features ?? [])
        .map(id => featureOptions.find(f => f.id === id)?.name)
        .filter(Boolean) as string[]
      const actionPayload: Omit<ActionDTO, 'id'> = {
        flowName: effectiveFlowName,
        flowId: flowId || `flow-${i}`,
        processName: process,
        flowType: 'ACTION',
        domain,
        targetDesktop: screenKey,
        targetMobile: screenKey,
        ...(roleNames.length ? { roles: roleNames } : {}),
        ...(featureNames.length ? { features: featureNames } : {})
      }
      steps.push({ order: order++, method: 'POST', endpoint: '/flow-items', payload: actionPayload })
      if (row.contextId) {
        steps.push({
          order: order++,
          method: 'POST',
          endpoint: '/flow-assignments',
          payload: {
            contextId: row.contextId,
            flowItemId: '<from flow-items response>',
            permission: 'execute',
            rank: i
          },
          note: 'Uses action id from previous flow-items response.'
        })
      }
    })
    return steps
  }, [componentType, name, componentPath, version, domain, process, flowRows, screenKey, roleOptions, featureOptions])

  const handleSubmit = useCallback(async () => {
    setSubmitError(null)
    const componentName = name.trim()
    const validFlows = flowRows.filter(r => getFlowEffectiveName(r, componentName))
    if (!componentName || !componentPath.trim() || !domain || !process || validFlows.length === 0) return

    const existingComponentId = initialData?.existingComponentId
    try {
      const { builderType, screenType } = splitCombinedType(componentType)
      const componentPayload: Omit<
        Component,
        'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'
      > = {
        name: name.trim(),
        screenKey,
        namespaceCode: DEFAULT_NAMESPACE_CODE,
        namespaceId: DEFAULT_NAMESPACE_ID,
        namespaceDescription: DEFAULT_NAMESPACE_CODE,
        type: screenType as 'FORM' | 'POPUP' | 'WINDOW',
        screenComponents: {
          key: screenKey,
          name: name.trim(),
          builderType: builderType as any,
          appName: name.trim(),
          flowIcon: '',
          formDefinition: { componentPath: componentPath.trim(), version: version || '' },
          release: ''
        }
      }
      if (existingComponentId) {
        await updateComponent(existingComponentId, componentPayload)
      } else {
        await createComponent(componentPayload)
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : existingComponentId
            ? 'Failed to update component'
            : 'Failed to create component'
      )
      return
    }

    let assignmentRank = 0
    for (let i = 0; i < flowRows.length; i++) {
      const row = flowRows[i]
      const effectiveFlowName = getFlowEffectiveName(row, componentName)
      if (!effectiveFlowName) continue
      try {
        const flowId = effectiveFlowName.replace(/\s+/g, '-').toLowerCase() || `flow-${i}`
        const roleNames = (row.roles ?? [])
          .map(id => roleOptions.find(r => r.id === id)?.name)
          .filter(Boolean) as string[]
        const featureNames = (row.features ?? [])
          .map(id => featureOptions.find(f => f.id === id)?.name)
          .filter(Boolean) as string[]
        const actionPayload: Omit<ActionDTO, 'id'> = {
          flowName: effectiveFlowName,
          flowId,
          processName: process,
          flowType: 'ACTION',
          domain,
          targetDesktop: screenKey,
          targetMobile: screenKey,
          ...(roleNames.length ? { roles: roleNames } : {}),
          ...(featureNames.length ? { features: featureNames } : {})
        }
        const created = await createAction(actionPayload)
        if (!created) {
          setSubmitError('Failed to create action')
          return
        }
        if (row.contextId) {
          const ctx = contextById.get(row.contextId)
          if (ctx) {
            const assignmentResult = await createActionAssignment({
              context: ctx as any,
              assignments: [
                {
                  id: `temp-${assignmentRank}`,
                  flowItem: created,
                  permission: 'execute',
                  rank: assignmentRank
                }
              ]
            })
            if (!assignmentResult) {
              setSubmitError('Failed to create flow assignment')
              return
            }
          }
        }
        assignmentRank++
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to create action or assignment')
        return
      }
    }
    onOpenChange(false)
    onSuccess?.()
  }, [
    componentType,
    name,
    componentPath,
    version,
    domain,
    process,
    flowRows,
    screenKey,
    initialData?.existingComponentId,
    contextById,
    roleOptions,
    featureOptions,
    createComponent,
    updateComponent,
    createAction,
    createActionAssignment,
    onOpenChange,
    onSuccess
  ])

  const validFlows = flowRows.some(r => getFlowEffectiveName(r, name.trim()))
  const canSubmit = name.trim() && componentPath.trim() && domain && process && validFlows

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[600px] gba:max-h-[90vh] gba:overflow-y-auto" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>Action bundle</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-8 gba:py-4">
          <section className="gba:space-y-4">
            <div>
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">General</h3>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">Component and flow definition.</p>
            </div>
            <div className="gba:space-y-2">
              <Label>Component type *</Label>
              <Select
                value={componentType}
                onValueChange={(v: 'native-form' | 'native-window' | 'native-popup') => setComponentType(v)}
              >
                <SelectTrigger data-testid={`${dataTestId}-component-type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Component name"
                data-testid={`${dataTestId}-name`}
              />
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label>Domain *</Label>
                <Combobox
                  value={domain}
                  onValueChange={v => {
                    setDomain(v)
                    setProcess('')
                  }}
                  options={domains.map(d => ({ value: d.id, label: d.name }))}
                  placeholder="Select domain"
                  data-testid={`${dataTestId}-domain`}
                />
              </div>
              <div className="gba:space-y-2">
                <Label>Process *</Label>
                <Combobox
                  value={process}
                  onValueChange={setProcess}
                  options={processOptions.map(p => ({ value: p.name, label: p.name }))}
                  placeholder={domain ? 'Select process' : 'Select domain first'}
                  disabled={!domain}
                  data-testid={`${dataTestId}-process`}
                />
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-[1fr_minmax(0,6rem)] gba:gap-4">
              <div className="gba:space-y-2 gba:min-w-0">
                <Label htmlFor="componentPath">Component path *</Label>
                <Input
                  id="componentPath"
                  value={componentPath}
                  onChange={e => setComponentPath(e.target.value)}
                  placeholder="/module/core/forms/my-form"
                  data-testid={`${dataTestId}-component-path`}
                />
              </div>
              <div className="gba:space-y-2 gba:min-w-0">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  data-testid={`${dataTestId}-version`}
                />
              </div>
            </div>

            <div className="gba:p-2 gba:rounded gba:bg-muted/30 gba:text-xs gba:font-mono">Screen key: {screenKey}</div>
          </section>

          <section className="gba:space-y-4">
            <div>
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Flows and contexts</h3>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                One tab per flow. Set roles, features, and context; create contexts if needed.
              </p>
            </div>
            <Tabs value={activeFlowTab} onValueChange={setActiveFlowTab} className="gba:w-full">
              <TabsList className="gba:flex-wrap gba:h-auto gba:gap-1 gba:mb-3">
                {flowRows.map((row, index) => (
                  <TabsTrigger
                    key={index}
                    value={String(index)}
                    className="gba:data-[state=active]:gba:bg-muted"
                    data-testid={`${dataTestId}-flow-tab-${index}`}
                  >
                    {getFlowEffectiveName(row, name) || `Flow ${index + 1}`}
                  </TabsTrigger>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gba:ml-1"
                  onClick={addFlowRow}
                  data-testid={`${dataTestId}-add-flow`}
                >
                  <PlusIcon size={14} className="gba:mr-1" />
                  Add flow
                </Button>
              </TabsList>
              {flowRows.map((row, index) => (
                <TabsContent
                  key={index}
                  value={String(index)}
                  className="gba:space-y-4 gba:mt-0 gba:p-4 gba:rounded-lg gba:border gba:border-border gba:bg-muted/10"
                >
                  <div className="gba:flex gba:items-center gba:gap-2 gba:pb-3 gba:border-b gba:border-border">
                    <div className="gba:flex-1 gba:min-w-0 gba:space-y-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Checkbox
                          id={`${dataTestId}-flow-use-custom-name-${index}`}
                          checked={row.useCustomName ?? false}
                          onCheckedChange={checked => setFlowRow(index, 'useCustomName', checked === true)}
                          data-testid={`${dataTestId}-flow-use-custom-name-${index}`}
                        />
                        <Label
                          htmlFor={`${dataTestId}-flow-use-custom-name-${index}`}
                          className="gba:text-xs gba:font-medium gba:cursor-pointer"
                        >
                          Override name
                        </Label>
                      </div>
                      {row.useCustomName ? (
                        <Input
                          value={row.flowName}
                          onChange={e => setFlowRow(index, 'flowName', e.target.value)}
                          placeholder="e.g. Open approval form"
                          data-testid={`${dataTestId}-flow-name-${index}`}
                        />
                      ) : (
                        <p className="gba:text-xs gba:text-muted-foreground">
                          Name: {name.trim() || '(component name)'}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFlowRow(index)}
                      disabled={flowRows.length <= 1}
                      data-testid={`${dataTestId}-remove-flow-${index}`}
                    >
                      <TrashIcon size={16} />
                    </Button>
                  </div>
                  <div className="gba:grid gba:grid-cols-1 sm:gba:grid-cols-2 gba:gap-4">
                    <div className="gba:space-y-2">
                      <Label className="gba:text-xs">Roles</Label>
                      <Combobox
                        mode="multiple"
                        options={roleOptions.map(r => ({ value: r.id, label: r.name }))}
                        value={row.roles ?? []}
                        onValueChange={v => setFlowRow(index, 'roles', Array.isArray(v) ? v : v ? [v] : [])}
                        placeholder="Select roles"
                        data-testid={`${dataTestId}-flow-roles-${index}`}
                      />
                    </div>
                    <div className="gba:space-y-2">
                      <Label className="gba:text-xs">Features</Label>
                      <Combobox
                        mode="multiple"
                        options={featureOptions.map(f => ({ value: f.id, label: f.name }))}
                        value={row.features ?? []}
                        onValueChange={v => setFlowRow(index, 'features', Array.isArray(v) ? v : v ? [v] : [])}
                        placeholder="Select features"
                        data-testid={`${dataTestId}-flow-features-${index}`}
                      />
                    </div>
                  </div>
                  <div className="gba:flex gba:items-end gba:gap-2">
                    <div className="gba:flex-1 gba:min-w-0 gba:space-y-2">
                      <Label className="gba:text-xs">Context (optional)</Label>
                      <Combobox
                        value={row.contextId ?? ''}
                        onValueChange={v => setFlowRow(index, 'contextId', v || null)}
                        options={contextOptions}
                        placeholder="Select context"
                        data-testid={`${dataTestId}-flow-context-${index}`}
                      />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`${dataTestId}-create-context-${index}`}
                        >
                          Create context
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="gba:w-80" align="end">
                        <div className="gba:space-y-3">
                          <Label>New context name</Label>
                          <Input
                            value={newContextName}
                            onChange={e => setNewContextName(e.target.value)}
                            placeholder="Context name"
                            data-testid={`${dataTestId}-new-context-name`}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateContext}
                            disabled={!newContextName?.trim() || isCreatingContext}
                            data-testid={`${dataTestId}-create-context-submit`}
                          >
                            {isCreatingContext ? 'Creating...' : 'Create and assign'}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </section>

          <DebugSection steps={debugSteps} data-testid={`${dataTestId}-debug`} />

          {submitError && (
            <p className="gba:text-sm gba:text-destructive" data-testid={`${dataTestId}-submit-error`}>
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} data-testid={`${dataTestId}-submit`}>
            {isSubmitting ? 'Creating...' : 'Create component and action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
