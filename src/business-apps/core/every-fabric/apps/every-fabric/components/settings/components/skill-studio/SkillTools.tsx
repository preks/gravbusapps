import { useCallback, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CheckIcon, PlusIcon, TrashIcon, WrenchIcon, XIcon } from '@phosphor-icons/react'
import type { SkillTool } from '../../../types/enterpriseAgent'

interface SkillToolsProps {
  assignedTools: SkillTool[]
  availableTools: SkillTool[]
  canEdit: boolean
  onAssign?: (toolIds: string[]) => void
  onRemove?: (toolId: string) => void
}

export const SkillTools: React.FC<SkillToolsProps> = ({
  assignedTools,
  availableTools,
  canEdit,
  onAssign,
  onRemove
}) => {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const assignedIds = new Set(assignedTools.map(t => t.id))
  const assignable = availableTools.filter(t => !assignedIds.has(t.id))

  const handleAdd = useCallback(() => {
    if (selectedIds.length > 0 && onAssign) {
      onAssign(selectedIds)
      setSelectedIds([])
      setShowPicker(false)
    }
  }, [selectedIds, onAssign])

  return (
    <div className="gba:space-y-3">
      <div className="gba:flex gba:items-center gba:gap-2">
        <WrenchIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">Tools</h4>
        <span className="gba:text-xs gba:text-muted-foreground">{assignedTools.length}</span>
      </div>

      {assignedTools.length > 0 && (
        <ul className="gba:divide-y gba:divide-border gba:border gba:border-border gba:rounded-md">
          {assignedTools.map(tool => (
            <li key={tool.id} className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <WrenchIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <div>
                  <p className="gba:text-sm gba:font-medium">{tool.name}</p>
                  <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{tool.description}</p>
                </div>
              </div>
              {canEdit && onRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(tool.id)}
                  data-testid={`remove-tool-${tool.id}`}
                >
                  <TrashIcon className="gba:h-4 gba:w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && !showPicker && assignable.length > 0 && (
        <Button size="sm" variant="secondary" onClick={() => setShowPicker(true)} data-testid="assign-tools-button">
          <PlusIcon className="gba:h-4 gba:w-4" />
          Assign Tools
        </Button>
      )}

      {showPicker && assignable.length > 0 && (
        <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:p-3 gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:font-medium">Select tools</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowPicker(false)
                setSelectedIds([])
              }}
            >
              <XIcon className="gba:h-4 gba:w-4" />
            </Button>
          </div>
          <div className="gba:space-y-1 gba:max-h-48 gba:overflow-y-auto">
            {assignable.map(tool => (
              <label
                key={tool.id}
                className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:px-2 gba:py-1.5 gba:hover:bg-muted/30 gba:rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(tool.id)}
                  onChange={e =>
                    setSelectedIds(prev => (e.target.checked ? [...prev, tool.id] : prev.filter(id => id !== tool.id)))
                  }
                  className="gba:h-4 gba:w-4"
                  data-testid={`tool-checkbox-${tool.id}`}
                />
                <span className="gba:text-sm">{tool.name}</span>
              </label>
            ))}
          </div>
          <div className="gba:flex gba:gap-2 gba:pt-1">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={selectedIds.length === 0}
              data-testid="confirm-assign-tools"
            >
              <CheckIcon className="gba:h-4 gba:w-4" />
              Assign
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowPicker(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {assignable.length === 0 && assignedTools.length === 0 && (
        <p className="gba:text-sm gba:text-muted-foreground">No tools available.</p>
      )}
    </div>
  )
}
