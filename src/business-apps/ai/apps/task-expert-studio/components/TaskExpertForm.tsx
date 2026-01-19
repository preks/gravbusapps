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
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { AIModelODM, WorkspaceODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface TaskExpertFormProps extends BusinessAppContextProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export const TaskExpertForm: React.FC<TaskExpertFormProps> = props => {
  const { open, onClose, onSaved } = props
  const client = usePromptManagerClient(props.accessToken)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [modelId, setModelId] = useState<string>('')
  const [userContent, setUserContent] = useState<string>('Write a short greeting for {{name}}')
  const [systemContent, setSystemContent] = useState<string | ''>('You are a helpful assistant.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceODM[]>([])
  const [models, setModels] = useState<AIModelODM[]>([])

  useEffect(() => {
    if (!open) return
    let mounted = true
    ;(async () => {
      try {
        const [ws, md] = await Promise.all([
          client.getWorkspaces({ limit: 100, offset: 0, returnTotalRecords: false }),
          client.getAiModels({ limit: 100, offset: 0, returnTotalRecords: false })
        ])
        if (!mounted) return
        setWorkspaces(ws.data)
        setModels(md.data)
        if (ws.data.length > 0 && !workspaceId) setWorkspaceId(ws.data[0]._id || '')
        if (md.data.length > 0 && !modelId) setModelId(md.data[0]._id || '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load form data')
      }
    })()
    return () => {
      mounted = false
    }
  }, [open])

  const isValid = useMemo(
    () => !!name && !!workspaceId && !!modelId && !!userContent,
    [name, workspaceId, modelId, userContent]
  )

  const onSave = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await client.createPrompt({
        name,
        description,
        type: 'completion',
        workspaceId,
        modelId,
        userContent,
        systemContent,
        modelSettings: {},
        responseSchema: null,
        tools: []
      })
      setLoading(false)
      onSaved()
      onClose()
    } catch (e) {
      setLoading(false)
      setError(e instanceof Error ? e.message : 'Failed to create task expert')
    }
  }, [client, name, description, workspaceId, modelId, userContent, systemContent, onSaved, onClose])

  return (
    <Dialog open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <DialogContent data-testid="task-expert-form-dialog">
        <DialogHeader>
          <DialogTitle>Create Task Expert</DialogTitle>
        </DialogHeader>
        <div className="gba:space-y-4">
          {error && (
            <div className="gba:text-destructive" data-testid="task-expert-form-error">
              {error}
            </div>
          )}
          <div className="gba:space-y-2">
            <Label htmlFor="taskExpertName">Name</Label>
            <Input
              id="taskExpertName"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="MyTaskExpert"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="taskExpertDesc">Description</Label>
            <Input
              id="taskExpertDesc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>Workspace</Label>
              <Select value={workspaceId} onValueChange={v => setWorkspaceId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map(ws => (
                    <SelectItem key={ws._id || ws.name} value={ws._id || ''}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:space-y-2">
              <Label>Model</Label>
              <Select value={modelId} onValueChange={v => setModelId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m._id || m.name} value={m._id || ''}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="gba:space-y-2">
            <Label>User Prompt</Label>
            <Textarea value={userContent} onChange={e => setUserContent(e.target.value)} rows={4} />
          </div>
          <div className="gba:space-y-2">
            <Label>System Prompt</Label>
            <Textarea value={systemContent} onChange={e => setSystemContent(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="gba:gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onSave}
            disabled={!isValid || loading}
            data-testid="task-expert-form-save-button"
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TaskExpertForm
