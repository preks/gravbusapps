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
  SelectItem
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCreateComponent } from '@/common/data/resources/hooks/useCreateComponent'
import { useUpdateComponent } from '@/common/data/resources/hooks/useUpdateComponent'
import { useResourceData, useResourceActions } from '../../contexts/ResourceManagerContext'
import type { Component } from '@/common/data/resources/types/component.types'
import { splitCombinedType } from '../../utils/componentKeyUtils'
import { DebugSection, type DebugStep } from './segments/DebugSection'

const DEFAULT_NAMESPACE_ID = '1e6e2926-33f1-4dfb-a3b8-d535602d06b0'
const DEFAULT_NAMESPACE_CODE = 'nw_dev'

const COMPONENT_TYPE_OPTIONS = [
  { value: 'native-form', label: 'Form' },
  { value: 'native-window', label: 'Window' },
  { value: 'native-popup', label: 'Popup' }
] as const

export interface UserTaskBundleDialogInitialData {
  componentPath?: string
  name?: string
  process?: string
  userTaskName?: string
  screenKey?: string
  existingComponentId?: string
}

export interface UserTaskBundleDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: UserTaskBundleDialogInitialData
  'data-testid'?: string
}

export const UserTaskBundleDialog: React.FC<UserTaskBundleDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  'data-testid': dataTestId = 'register-new-user-task-dialog',
  ...context
}) => {
  const [componentType, setComponentType] = useState<'native-form' | 'native-window' | 'native-popup'>('native-form')
  const [name, setName] = useState('')
  const [componentPath, setComponentPath] = useState('')
  const [version, setVersion] = useState('')
  const [domain, setDomain] = useState('')
  const [process, setProcess] = useState('')
  const [userTaskName, setUserTaskName] = useState('')
  const [useCustomNameForUserTask, setUseCustomNameForUserTask] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const effectiveUserTaskName = useCustomNameForUserTask ? userTaskName.trim() : name.trim()

  const { domains, getProcessesForDomain } = useResourceData()
  const { refreshServices } = useResourceActions()
  const { createComponent, isCreating: isSubmitting } = useCreateComponent(context)
  const { updateComponent } = useUpdateComponent(context)

  const processOptions = domain ? getProcessesForDomain(domain) : []

  const componentTypeFromScreenKey = useCallback((key: string): 'native-form' | 'native-window' | 'native-popup' => {
    if (key.startsWith('twin_')) return 'native-window'
    if (key.startsWith('tpop_')) return 'native-popup'
    return 'native-form'
  }, [])

  useEffect(() => {
    if (open) {
      refreshServices?.()
    }
  }, [open, refreshServices])

  useEffect(() => {
    if (!open) {
      setComponentType('native-form')
      setName('')
      setComponentPath('')
      setVersion('')
      setDomain('')
      setProcess('')
      setUserTaskName('')
      setUseCustomNameForUserTask(false)
      setSubmitError(null)
    }
  }, [open])

  useEffect(() => {
    if (open && initialData) {
      if (initialData.componentPath != null) setComponentPath(initialData.componentPath)
      if (initialData.name != null) setName(initialData.name)
      if (initialData.process != null) setProcess(initialData.process)
      if (initialData.userTaskName != null) setUserTaskName(initialData.userTaskName)
      if (initialData.screenKey != null) {
        setComponentType(componentTypeFromScreenKey(initialData.screenKey))
      }
    }
  }, [open, initialData, componentTypeFromScreenKey])

  const screenKeyPrefix =
    componentType === 'native-window' ? 'twin_' : componentType === 'native-popup' ? 'tpop_' : 'tfrm_'
  const screenKey = useMemo(() => {
    if (initialData?.screenKey != null && initialData.screenKey.trim()) return initialData.screenKey.trim()
    if (process && effectiveUserTaskName) return `${screenKeyPrefix}${process}_${effectiveUserTaskName}`
    return screenKeyPrefix
  }, [initialData?.screenKey, process, effectiveUserTaskName, screenKeyPrefix])

  const debugSteps = useMemo((): DebugStep[] => {
    if (!name.trim() || !componentPath.trim() || !domain || !process || !effectiveUserTaskName) return []

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
    return [{ order: 1, method: 'POST', endpoint: '/screen', payload: componentPayload }]
  }, [componentType, name, componentPath, version, domain, process, effectiveUserTaskName, screenKey])

  const handleSubmit = useCallback(async () => {
    setSubmitError(null)
    if (!name.trim() || !componentPath.trim() || !domain || !process || !effectiveUserTaskName) return

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
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : existingComponentId
            ? 'Failed to update component'
            : 'Failed to create component'
      )
    }
  }, [
    componentType,
    name,
    componentPath,
    version,
    domain,
    process,
    effectiveUserTaskName,
    screenKey,
    initialData?.existingComponentId,
    createComponent,
    updateComponent,
    onOpenChange,
    onSuccess
  ])

  const canSubmit = name.trim() && componentPath.trim() && domain && process && effectiveUserTaskName

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[600px] gba:max-h-[90vh] gba:overflow-y-auto" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>User task bundle</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-8 gba:py-4">
          <section className="gba:space-y-4">
            <div>
              <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">General</h3>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">Component and user task definition.</p>
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

            <div className="gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Checkbox
                  id={`${dataTestId}-user-task-use-custom-name`}
                  checked={useCustomNameForUserTask}
                  onCheckedChange={checked => setUseCustomNameForUserTask(checked === true)}
                  data-testid={`${dataTestId}-user-task-use-custom-name`}
                />
                <Label
                  htmlFor={`${dataTestId}-user-task-use-custom-name`}
                  className="gba:text-sm gba:font-medium gba:cursor-pointer"
                >
                  Override user task name
                </Label>
              </div>
              {useCustomNameForUserTask ? (
                <Input
                  id="userTaskName"
                  value={userTaskName}
                  onChange={e => setUserTaskName(e.target.value)}
                  placeholder="e.g. ApprovalTask"
                  data-testid={`${dataTestId}-user-task-name`}
                />
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground">
                  User task name: {name.trim() || '(component name)'}
                </p>
              )}
            </div>

            <div className="gba:grid gba:grid-cols-[1fr_minmax(0,6rem)] gba:gap-4">
              <div className="gba:space-y-2 gba:min-w-0">
                <Label htmlFor="componentPath">Component path *</Label>
                <Input
                  id="componentPath"
                  value={componentPath}
                  onChange={e => setComponentPath(e.target.value)}
                  placeholder="/module/core/forms/my-user-task"
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
            {isSubmitting ? 'Creating...' : 'Create component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
