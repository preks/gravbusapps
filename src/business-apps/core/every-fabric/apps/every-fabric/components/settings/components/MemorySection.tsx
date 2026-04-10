import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { BrainIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import type { MemoryEntry, MemoryNamespace } from '../agentSettings.types'
import { MEMORY_NAMESPACES } from '../agentSettings.types'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { SectionHeader } from './SettingsShared'

interface MemorySectionProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
}

export const MemorySection: React.FC<MemorySectionProps> = ({ client, isOpen }) => {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [memoryQuery, setMemoryQuery] = useState('')
  const [activeNamespace, setActiveNamespace] = useState<MemoryNamespace>('preferences')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMemoryKey, setNewMemoryKey] = useState('')
  const [newMemoryValue, setNewMemoryValue] = useState('')

  const searchMemories = useCallback(
    async (query?: string) => {
      setIsLoading(true)
      try {
        const results = await client.getMemory(query || '*')
        setMemories(results ?? [])
      } catch {
        setMemories([])
      } finally {
        setIsLoading(false)
      }
    },
    [client]
  )

  useEffect(() => {
    if (isOpen) searchMemories()
  }, [isOpen, searchMemories])

  const handleSearchMemory = useCallback(() => {
    searchMemories(memoryQuery || undefined)
  }, [memoryQuery, searchMemories])

  const handleAddMemory = useCallback(async () => {
    const key = newMemoryKey.trim()
    const value = newMemoryValue.trim()
    if (!key || !value) return

    try {
      await client.saveMemory(key, value, activeNamespace)
      setNewMemoryKey('')
      setNewMemoryValue('')
      setShowAddForm(false)
      searchMemories()
    } catch {
      // Could add toast later
    }
  }, [newMemoryKey, newMemoryValue, activeNamespace, client, searchMemories])

  const handleDeleteMemory = useCallback(
    async (key: string, namespace?: string) => {
      try {
        await client.deleteMemory(key, namespace)
        setMemories(prev => prev.filter(m => !(m.key === key && m.namespace === namespace)))
      } catch {
        // Could add toast later
      }
    },
    [client]
  )

  const filteredMemories = useMemo(
    () => memories.filter(m => !m.namespace || m.namespace === activeNamespace),
    [memories, activeNamespace]
  )

  const renderMemoryList = () => {
    if (isLoading) {
      return <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4">Loading...</p>
    }

    if (filteredMemories.length === 0) {
      return (
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4">
          No memories in {activeNamespace}
        </p>
      )
    }

    return filteredMemories.map(entry => (
      <div
        key={`${entry.namespace}-${entry.key}`}
        className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3 gba:hover:bg-muted/35 gba:transition-colors"
      >
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
          <div className="gba:flex-1 gba:min-w-0">
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{entry.key}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">{entry.value}</p>
          </div>
          <button
            onClick={() => handleDeleteMemory(entry.key, entry.namespace)}
            className="gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:shrink-0"
            data-testid={`settings-memory-delete-${entry.key}`}
            aria-label={`Delete memory: ${entry.key}`}
          >
            <TrashIcon className="gba:h-3 gba:w-3" />
          </button>
        </div>
      </div>
    ))
  }

  return (
    <>
      <SectionHeader icon={<BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />} title="Memory" />
      <div className="gba:px-4 gba:pb-3">
        <div className="gba:flex gba:gap-1 gba:mb-3">
          {MEMORY_NAMESPACES.map(ns => (
            <button
              key={ns}
              onClick={() => setActiveNamespace(ns)}
              className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:transition-colors ${
                activeNamespace === ns
                  ? 'gba:bg-foreground gba:text-background'
                  : 'gba:text-muted-foreground gba:hover:bg-muted/40'
              }`}
            >
              {ns.charAt(0).toUpperCase() + ns.slice(1)}
            </button>
          ))}
        </div>

        <div className="gba:flex gba:gap-2 gba:mb-3">
          <div className="gba:relative gba:flex-1">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/50" />
            <Input
              value={memoryQuery}
              onChange={e => setMemoryQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchMemory()}
              placeholder="Search memories..."
              className="gba:h-8 gba:pl-9 gba:text-sm gba:rounded-full gba:bg-muted/30 gba:border-border/50"
              data-testid="settings-memory-search"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-full gba:shrink-0"
            onClick={() => setShowAddForm(f => !f)}
            data-testid="settings-memory-add-toggle"
          >
            <PlusIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        {showAddForm && (
          <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3 gba:mb-3 gba:space-y-2">
            <Input
              value={newMemoryKey}
              onChange={e => setNewMemoryKey(e.target.value)}
              placeholder="Key (e.g. preferred_language)"
              className="gba:h-8 gba:text-sm gba:rounded-lg gba:bg-background/80"
              data-testid="settings-memory-new-key"
            />
            <Input
              value={newMemoryValue}
              onChange={e => setNewMemoryValue(e.target.value)}
              placeholder="Value"
              className="gba:h-8 gba:text-sm gba:rounded-lg gba:bg-background/80"
              data-testid="settings-memory-new-value"
            />
            <div className="gba:flex gba:justify-end gba:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-7 gba:text-xs gba:rounded-full"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gba:h-7 gba:text-xs gba:rounded-full"
                onClick={handleAddMemory}
                disabled={!newMemoryKey.trim() || !newMemoryValue.trim()}
                data-testid="settings-memory-save"
              >
                Save
              </Button>
            </div>
          </div>
        )}

        <div className="gba:space-y-1.5 gba:max-h-48 gba:overflow-y-auto">{renderMemoryList()}</div>
      </div>
    </>
  )
}
