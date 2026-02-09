import React, { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Textarea,
  Label
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

export interface TaskExpertTestPanelProps extends BusinessAppContextProps {
  open: boolean
  onClose: () => void
  promptId: string
}

export const TaskExpertTestPanel: React.FC<TaskExpertTestPanelProps> = props => {
  const { open, onClose, promptId } = props
  const client = usePromptManagerClient(props.accessToken)
  const [systemParams, setSystemParams] = useState<string>('{}')
  const [userParams, setUserParams] = useState<string>('{}')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string>('')

  const onRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult('')
    try {
      const fd = new FormData()
      if (systemParams) fd.append('system_params', systemParams)
      if (userParams) fd.append('user_params', userParams)
      fd.append('context', JSON.stringify({ executionMode: 'test' }))
      const res = await client.executePromptById(promptId, fd)
      const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content, null, 2)
      setResult(content || '')
      setLoading(false)
    } catch (e) {
      setLoading(false)
      setError(e instanceof Error ? e.message : 'Execution failed')
    }
  }, [client, promptId, systemParams, userParams])

  return (
    <Dialog open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <DialogContent data-testid="task-expert-test-dialog">
        <DialogHeader>
          <DialogTitle>Test AI Task Expert</DialogTitle>
        </DialogHeader>
        <div className="gba:space-y-3">
          {error && (
            <div className="gba:text-destructive" data-testid="task-expert-test-error">
              {error}
            </div>
          )}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>System Params (JSON)</Label>
              <Textarea rows={6} value={systemParams} onChange={e => setSystemParams(e.target.value)} />
            </div>
            <div className="gba:space-y-2">
              <Label>User Params (JSON)</Label>
              <Textarea rows={6} value={userParams} onChange={e => setUserParams(e.target.value)} />
            </div>
          </div>
          <div className="gba:space-y-2">
            <Label>Result</Label>
            <Textarea readOnly rows={8} value={result} />
          </div>
        </div>
        <DialogFooter className="gba:gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button variant="default" onClick={onRun} disabled={loading} data-testid="task-expert-test-run-button">
            {loading ? 'Running…' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TaskExpertTestPanel
