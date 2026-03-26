import { useState, useEffect } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Brain, Plus, ArrowClockwise } from '@phosphor-icons/react'
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
      // Save to 'preferences' — the only user-writable namespace the backend accepts
      await save(`fact-${Date.now()}`, newFact.trim(), 'preferences')
      setNewFact('')
      // Refresh so the new entry shows immediately
      await search('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-memory-panel">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:shrink-0">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Brain className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
            Memory
          </span>
        </div>
        <button
          onClick={() => search('')}
          className="gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
          title="Refresh"
          data-testid="enterprise-agent-memory-refresh"
        >
          <ArrowClockwise className="gba:h-3.5 gba:w-3.5" />
        </button>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-3">
        {/* Dev-mode persistence note */}
        <p className="gba:text-[10px] gba:text-muted-foreground/50 gba:leading-relaxed gba:border gba:border-border/60 gba:rounded-lg gba:px-2.5 gba:py-1.5">
          Memory is stored in-process and resets when the server restarts.
        </p>

        {loading ? (
          <p className="gba:text-xs gba:text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <Brain className="gba:h-8 gba:w-8 gba:text-muted-foreground/30 gba:mx-auto gba:mb-2" weight="duotone" />
            <p className="gba:text-xs gba:text-muted-foreground/60">No memories yet.</p>
            <p className="gba:text-xs gba:text-muted-foreground/40 gba:mt-1">
              The agent saves facts automatically as it works.
            </p>
          </div>
        ) : (
          <div className="gba:space-y-1.5">
            {entries.map(entry => (
              <div
                key={entry.key}
                className="gba:rounded-lg gba:bg-muted/50 gba:px-3 gba:py-2"
                data-testid={`enterprise-agent-memory-entry-${entry.key}`}
              >
                <p className="gba:text-xs gba:text-foreground gba:leading-relaxed">{entry.value}</p>
                {entry.namespace && (
                  <p className="gba:text-[10px] gba:text-muted-foreground/50 gba:mt-0.5 gba:uppercase gba:tracking-wide">
                    {entry.namespace}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add memory */}
      <div className="gba:shrink-0 gba:border-t gba:border-border gba:p-3 gba:space-y-2">
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
