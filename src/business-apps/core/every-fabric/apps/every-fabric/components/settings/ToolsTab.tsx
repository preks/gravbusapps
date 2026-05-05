// Read-only tools catalog for the enterprise agent.

import { useCallback, useEffect, useState } from 'react'
import { SpinnerGapIcon, WrenchIcon, LinkIcon, CircleIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { ProviderToolCatalogItem, ToolODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

interface ToolsTabProps {
  accessToken: string
}

export const ToolsTab: React.FC<ToolsTabProps> = ({ accessToken }) => {
  const client = usePromptManagerClient(accessToken)
  const [tools, setTools] = useState<ToolODM[]>([])
  const [providerTools, setProviderTools] = useState<ProviderToolCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTools = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [page, flowbotTools, functionManagerTools] = await Promise.all([
        client.getTools({ limit: 100 }),
        client.getFlowBotProviderTools().catch(() => [] as ProviderToolCatalogItem[]),
        client.getFunctionManagerTools().catch(() => [] as ProviderToolCatalogItem[])
      ])
      setTools(page.data)
      setProviderTools([...flowbotTools, ...functionManagerTools])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadTools()
  }, [loadTools])

  if (isLoading) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3">
        <SpinnerGapIcon className="gba:h-8 gba:w-8 gba:animate-spin gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">Loading tools...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4">
        <p className="gba:text-sm gba:text-destructive">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => void loadTools()}>
          Retry
        </Button>
      </div>
    )
  }

  if (tools.length === 0 && providerTools.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3">
        <WrenchIcon className="gba:h-10 gba:w-10 gba:text-muted-foreground/50" />
        <p className="gba:text-sm gba:text-muted-foreground">No tools configured yet.</p>
      </div>
    )
  }

  return (
    <div className="gba:max-w-5xl gba:mx-auto gba:px-4 sm:gba:px-6 lg:gba:px-8 gba:py-6 sm:gba:py-8">
      <p className="gba:text-sm gba:text-muted-foreground gba:mb-6">
        Provider tools available to enterprise agents. Use provider-qualified refs like{' '}
        <code>flowbot.list_services</code> or <code>functions.your_tool</code> when attaching tools to skills.
      </p>

      <div className="gba:grid gba:gap-3">
        {providerTools.map(tool => (
          <div
            key={tool.tool_ref}
            className="gba:flex gba:items-start gba:gap-4 gba:rounded-lg gba:border gba:border-border gba:p-4 gba:bg-card"
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-lg gba:bg-primary/10 gba:shrink-0">
              <WrenchIcon className="gba:h-5 gba:w-5 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:flex-wrap">
                <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{tool.name}</span>
                <span className="gba:text-[11px] gba:font-mono gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                  {tool.tool_ref}
                </span>
                <span className="gba:text-[11px] gba:font-medium gba:text-primary gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:rounded">
                  {tool.provider === 'functions' ? 'tools' : tool.provider}
                </span>
                {tool.capabilities?.risk_level && (
                  <span className="gba:text-[11px] gba:font-medium gba:text-amber-700 gba:bg-amber-100 gba:px-1.5 gba:py-0.5 gba:rounded">
                    {tool.capabilities.risk_level}
                  </span>
                )}
              </div>
              {tool.description && (
                <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mb-2">{tool.description}</p>
              )}
              <div className="gba:flex gba:items-center gba:gap-3 gba:text-[11px] gba:text-muted-foreground">
                <span>{tool.capabilities?.requires_auth === false ? 'No auth required' : 'Auth required'}</span>
                {tool.capabilities?.supports_hitl && <span>HITL</span>}
                {tool.capabilities?.supports_artifacts && <span>Artifacts</span>}
              </div>
            </div>
          </div>
        ))}

        {tools.map(tool => (
          <div
            key={tool._id ?? tool.code ?? tool.name}
            className="gba:flex gba:items-start gba:gap-4 gba:rounded-lg gba:border gba:border-border gba:p-4 gba:bg-card"
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-lg gba:bg-muted gba:shrink-0">
              <WrenchIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
            </div>

            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{tool.name}</span>
                {tool.code && (
                  <span className="gba:text-[11px] gba:font-mono gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                    {tool.code}
                  </span>
                )}
                {tool.internal && (
                  <span className="gba:text-[11px] gba:font-medium gba:text-blue-700 gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:rounded">
                    Built-in
                  </span>
                )}
              </div>

              {tool.description && (
                <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mb-2">{tool.description}</p>
              )}

              <div className="gba:flex gba:items-center gba:gap-3 gba:text-[11px] gba:text-muted-foreground">
                <span className="gba:flex gba:items-center gba:gap-1">
                  <LinkIcon className="gba:h-3 gba:w-3" />
                  {tool.type.toUpperCase()} · {tool.config.transport}
                </span>
                <span className="gba:flex gba:items-center gba:gap-1">
                  <CircleIcon
                    weight="fill"
                    className={`gba:h-2 gba:w-2 ${tool.active !== false ? 'gba:text-green-500' : 'gba:text-muted-foreground/40'}`}
                  />
                  {tool.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
