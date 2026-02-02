import React, { useCallback, useMemo, useState } from 'react'
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
import type { ToolODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

type ToolType = 'mcp' | 'function'

export interface ToolFormProps extends BusinessAppContextProps {
  open: boolean
  onClose: () => void
  onSaved: (entry: {
    name: string
    code: string
    description?: string
    type: 'mcp' | 'function'
    config: ToolODM['config']
  }) => void
  initial?: Partial<ToolODM>
}

export const ToolForm: React.FC<ToolFormProps> = props => {
  const { open, onClose, onSaved, initial } = props
  const [name, setName] = useState(initial?.name || '')
  const [code, setCode] = useState(initial?.code || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [toolType, setToolType] = useState<ToolType>(initial?.type || 'function')
  const [source, setSource] = useState(initial?.config?.function?.source || '')
  const [handler, setHandler] = useState(initial?.config?.function?.handler || 'handler')
  const [entryFile, setEntryFile] = useState(initial?.config?.function?.entryFile || 'handler.js')
  const [networkPolicy, setNetworkPolicy] = useState<'allow' | 'deny'>(
    initial?.config?.function?.networkPolicy || 'deny'
  )

  const [mcpCommand, setMcpCommand] = useState(initial?.config?.mcp?.command || '')
  const [mcpTransport, setMcpTransport] = useState<'stdio' | 'sse' | 'websocket'>(
    (initial?.config?.mcp?.transport as any) || 'stdio'
  )

  const isValid = useMemo(
    () => !!code && !!name && (toolType === 'mcp' ? !!mcpCommand : !!source),
    [code, name, toolType, mcpCommand, source]
  )

  const handleSave = useCallback(() => {
    const config: ToolODM['config'] = {}
    if (toolType === 'mcp') {
      config.mcp = { command: mcpCommand, transport: mcpTransport }
    } else {
      config.function = { runtime: 'js-runtime', source, handler, entryFile, networkPolicy }
    }
    onSaved({ name, code, description, type: toolType, config })
  }, [name, code, description, toolType, mcpCommand, mcpTransport, source, handler, entryFile, networkPolicy, onSaved])

  return (
    <Dialog open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <DialogContent data-testid="tool-form-dialog">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Tool' : 'New Tool'}</DialogTitle>
        </DialogHeader>
        <div className="gba:space-y-3">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>Code</Label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="task-expert-tool.search" />
            </div>
            <div className="gba:space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" />
            </div>
          </div>
          <div className="gba:space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="gba:space-y-2">
            <Label>Type</Label>
            <div className="gba:flex gba:gap-2">
              <Button
                size="sm"
                variant={toolType === 'function' ? 'default' : 'outline'}
                onClick={() => setToolType('function')}
              >
                Function
              </Button>
              <Button size="sm" variant={toolType === 'mcp' ? 'default' : 'outline'} onClick={() => setToolType('mcp')}>
                MCP
              </Button>
            </div>
          </div>
          {toolType === 'function' ? (
            <div className="gba:space-y-2">
              <Label>Function Source (JS)</Label>
              <Textarea
                rows={12}
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder={`export async function handler(event, context) {\n  return { ok: true };\n}`}
              />
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div className="gba:space-y-2">
                  <Label>Entry file</Label>
                  <Input value={entryFile} onChange={e => setEntryFile(e.target.value)} />
                </div>
                <div className="gba:space-y-2">
                  <Label>Handler</Label>
                  <Input value={handler} onChange={e => setHandler(e.target.value)} />
                </div>
              </div>
              <div className="gba:space-y-2">
                <Label>Network policy</Label>
                <div className="gba:flex gba:gap-2">
                  <Button
                    size="sm"
                    variant={networkPolicy === 'deny' ? 'default' : 'outline'}
                    onClick={() => setNetworkPolicy('deny')}
                  >
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    variant={networkPolicy === 'allow' ? 'default' : 'outline'}
                    onClick={() => setNetworkPolicy('allow')}
                  >
                    Allow
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="gba:space-y-2">
              <Label>MCP Command</Label>
              <Input
                value={mcpCommand}
                onChange={e => setMcpCommand(e.target.value)}
                placeholder="tool-binary --flag"
              />
              <Label>Transport</Label>
              <Select value={mcpTransport} onValueChange={v => setMcpTransport(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="stdio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stdio">stdio</SelectItem>
                  <SelectItem value="sse">sse</SelectItem>
                  <SelectItem value="websocket">websocket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="gba:gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" disabled={!isValid} onClick={handleSave} data-testid="tool-form-save">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ToolForm
