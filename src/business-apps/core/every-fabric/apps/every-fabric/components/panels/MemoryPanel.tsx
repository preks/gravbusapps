import { useState, useEffect } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Brain, Plus } from '@phosphor-icons/react'
import { useAgentMemory } from '../../hooks/useAgentMemory'

interface MemoryPanelProps {
  accessToken: string
  sessionId: string
}

export const MemoryPanel = ({ accessToken, sessionId }: MemoryPanelProps) => {
  const { entries, loading, save, search } = useAgentMemory(accessToken)
  const [newFact, setNewFact] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    search('')
  }, [sessionId])

  const handleSave = async () => {
    if (!newFact.trim()) return
    setSaving(true)
    try {
      await save(`fact-${Date.now()}`, newFact.trim(), `session-${sessionId}`)
      setNewFact('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-memory-panel">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:flex-shrink-0">
        <Brain className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
          Memory
        </span>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-4">
        {/* This session */}
        <div>
          <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-2">
            This session
          </p>
          {loading ? (
            <p className="gba:text-xs gba:text-muted-foreground">Loading…</p>
          ) : entries.filter(e => e.namespace?.includes(sessionId)).length === 0 ? (
            <p className="gba:text-xs gba:text-muted-foreground/60">Nothing saved yet</p>
          ) : (
            <div className="gba:space-y-1.5">
              {entries
                .filter(e => e.namespace?.includes(sessionId))
                .map(entry => (
                  <div
                    key={entry.key}
                    className="gba:rounded-lg gba:bg-muted/50 gba:px-3 gba:py-2"
                    data-testid={`enterprise-agent-memory-entry-${entry.key}`}
                  >
                    <p className="gba:text-xs gba:text-foreground">{entry.value}</p>
                    <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-0.5 gba:font-mono">{entry.key}</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Past sessions */}
        {entries.filter(e => !e.namespace?.includes(sessionId)).length > 0 && (
          <div>
            <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-2">
              From past sessions
            </p>
            <div className="gba:space-y-1.5">
              {entries
                .filter(e => !e.namespace?.includes(sessionId))
                .map(entry => (
                  <div key={entry.key} className="gba:rounded-lg gba:bg-muted/30 gba:px-3 gba:py-2">
                    <p className="gba:text-xs gba:text-foreground">{entry.value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Add memory */}
      <div className="gba:flex-shrink-0 gba:border-t gba:border-border gba:p-3 gba:space-y-2">
        <Textarea
          value={newFact}
          onChange={e => setNewFact(e.target.value)}
          placeholder="Tell the agent something to remember…"
          rows={2}
          className="gba:resize-none gba:text-sm gba:rounded-lg"
          data-testid="enterprise-agent-memory-input"
        />
        <Button
          size="sm"
          className="gba:w-full gba:gap-1.5"
          disabled={!newFact.trim() || saving}
          onClick={handleSave}
          data-testid="enterprise-agent-memory-save"
        >
          <Plus className="gba:h-3.5 gba:w-3.5" />
          Save to memory
        </Button>
      </div>
    </div>
  )
}
