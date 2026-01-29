/**
 * Internal Tools Panel
 *
 * Displays available internal platform tools and allows registering them
 * as NW Functions for use in Task Experts.
 */

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  Label,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system'
import {
  UserPlusIcon,
  BuildingIcon,
  UsersIcon,
  TrendingUpIcon,
  CopyIcon,
  CheckIcon,
  CodeIcon,
  WrenchIcon,
  UploadIcon,
  Loader2Icon,
  AlertCircleIcon,
  Trash2Icon
} from 'lucide-react'
import { INTERNAL_TOOLS, type InternalToolDefinition } from '../definitions/internal-tools'
import { FunctionsServiceClient } from '@/common/network/functions/FunctionsServiceClient'

// Use all internal tools
const ALL_TOOLS = [...INTERNAL_TOOLS]

// Get unique categories
const CATEGORIES = [...new Set(ALL_TOOLS.map(t => t.category))]

export interface InternalToolsPanelProps {
  open: boolean
  onClose: () => void
  accessToken?: string
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  lead: UserPlusIcon,
  opportunity: TrendingUpIcon,
  contact: UsersIcon,
  account: BuildingIcon
}

const CATEGORY_COLORS: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  lead: 'info',
  opportunity: 'success',
  contact: 'warning',
  account: 'default'
}

export const InternalToolsPanel: React.FC<InternalToolsPanelProps> = ({ open, onClose, accessToken }) => {
  const [selectedTool, setSelectedTool] = useState<InternalToolDefinition | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerResult, setRegisterResult] = useState<{ success: boolean; message: string } | null>(null)

  const deleteAndRegisterAllTools = useCallback(async () => {
    if (!accessToken) {
      setRegisterResult({ success: false, message: 'No access token available' })
      return
    }

    setIsRegistering(true)
    setRegisterResult(null)

    const client = new FunctionsServiceClient(accessToken)
    const results: string[] = []
    const errors: string[] = []
    const toolIds = ALL_TOOLS.map(t => t.id)

    // First, delete all existing internal tools
    try {
      const allFunctions = await client.list()
      for (const fn of allFunctions) {
        if (toolIds.includes(fn.name)) {
          try {
            await client.deleteFunction(fn.id)
            results.push(`Deleted: ${fn.name}`)
          } catch (err) {
            errors.push(`Delete ${fn.name}: ${err instanceof Error ? err.message : String(err)}`)
          }
        }
      }
    } catch (err) {
      errors.push(`List functions: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Now register fresh
    for (const tool of ALL_TOOLS) {
      try {
        await client.createFunctionWithVersion({
          name: tool.id,
          description: tool.description,
          agentEnabled: true,
          workflowEnabled: false,
          config: {},
          firstVersion: {
            source: tool.source,
            inputSchema: tool.schema
          }
        })
        results.push(`Created: ${tool.name}`)
      } catch (err) {
        errors.push(`Create ${tool.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    setIsRegistering(false)

    if (errors.length === 0) {
      setRegisterResult({
        success: true,
        message: `✅ Successfully cleaned up and registered ${ALL_TOOLS.length} tools!\n\n${results.join('\n')}`
      })
    } else {
      setRegisterResult({
        success: false,
        message: `Completed with ${errors.length} error(s):\n\n${results.join('\n')}\n\nErrors:\n${errors.join('\n')}`
      })
    }
  }, [accessToken])

  const registerAllTools = useCallback(async () => {
    if (!accessToken) {
      setRegisterResult({ success: false, message: 'No access token available' })
      return
    }

    setIsRegistering(true)
    setRegisterResult(null)

    const client = new FunctionsServiceClient(accessToken)
    const results: string[] = []
    const errors: string[] = []

    for (const tool of ALL_TOOLS) {
      try {
        // Check if function already exists
        const existing = await client.findFunctionByName(tool.id)

        if (existing) {
          // Function exists - add a new version
          const latestVersion = await client.getLatestVersion(existing.id)
          await client.createVersion(existing.id, latestVersion + 1, {
            source: tool.source,
            inputSchema: tool.schema
          })
          results.push(`${tool.name}: Added version ${latestVersion + 1}`)
        } else {
          // Create new function with first version
          await client.createFunctionWithVersion({
            name: tool.id,
            description: tool.description,
            agentEnabled: true,
            workflowEnabled: false,
            config: {},
            firstVersion: {
              source: tool.source,
              inputSchema: tool.schema
            }
          })
          results.push(`${tool.name}: Created new function`)
        }
      } catch (err) {
        errors.push(`${tool.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    setIsRegistering(false)

    if (errors.length === 0) {
      setRegisterResult({
        success: true,
        message: `✅ Successfully registered ${results.length} tools as NW Functions!\n\n${results.join('\n')}`
      })
    } else if (results.length > 0) {
      setRegisterResult({
        success: false,
        message: `Registered ${results.length} tools, ${errors.length} failed:\n\nSuccesses:\n${results.join('\n')}\n\nErrors:\n${errors.join('\n')}`
      })
    } else {
      setRegisterResult({
        success: false,
        message: `All ${errors.length} registrations failed:\n\n${errors.join('\n')}`
      })
    }
  }, [accessToken])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const filteredTools = activeTab === 'all' ? ALL_TOOLS : ALL_TOOLS.filter(tool => tool.category === activeTab)

  const renderToolCard = (tool: InternalToolDefinition) => {
    const Icon = CATEGORY_ICONS[tool.category]
    const colorVariant = CATEGORY_COLORS[tool.category]

    return (
      <Card
        key={tool.id}
        className="gba:cursor-pointer gba:transition-colors hover:gba:bg-accent/50"
        onClick={() => setSelectedTool(tool)}
        data-testid={`crm-tool-card-${tool.id}`}
      >
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Icon className="gba:w-5 gba:h-5 gba:text-primary" />
              <CardTitle className="gba:text-base">{tool.name}</CardTitle>
            </div>
            <div className="gba:flex gba:gap-1">
              <Badge variant={colorVariant}>{tool.category}</Badge>
              <Badge variant={tool.operation === 'create' ? 'success' : 'info'}>{tool.operation}</Badge>
            </div>
          </div>
          <CardDescription className="gba:text-sm">{tool.description}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const renderToolDetails = () => {
    if (!selectedTool) return null

    return (
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTool(null)}>
            ← Back to tools
          </Button>
          <div className="gba:flex gba:gap-1">
            <Badge variant={CATEGORY_COLORS[selectedTool.category]}>{selectedTool.category}</Badge>
            <Badge variant={selectedTool.operation === 'create' ? 'success' : 'info'}>{selectedTool.operation}</Badge>
          </div>
        </div>

        <div>
          <h3 className="gba:text-lg gba:font-semibold">{selectedTool.name}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">{selectedTool.description}</p>
        </div>

        {/* Schema */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-sm gba:font-medium">Input Schema (JSON)</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(selectedTool.schema, null, 2), 'schema')}
              data-testid="copy-schema-button"
            >
              {copiedField === 'schema' ? (
                <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" />
              ) : (
                <CopyIcon className="gba:w-4 gba:h-4" />
              )}
              Copy Schema
            </Button>
          </div>
          <Textarea
            readOnly
            value={JSON.stringify(selectedTool.schema, null, 2)}
            className="gba:font-mono gba:text-xs gba:h-48"
            data-testid="tool-schema-textarea"
          />
        </div>

        {/* Source Code */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-sm gba:font-medium">Tool Source Code (JavaScript)</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(selectedTool.source, 'source')}
              data-testid="copy-source-button"
            >
              {copiedField === 'source' ? (
                <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" />
              ) : (
                <CopyIcon className="gba:w-4 gba:h-4" />
              )}
              Copy Source
            </Button>
          </div>
          <Textarea
            readOnly
            value={selectedTool.source}
            className="gba:font-mono gba:text-xs gba:h-64"
            data-testid="tool-source-textarea"
          />
        </div>

        {/* Usage Instructions */}
        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
              <CodeIcon className="gba:w-4 gba:h-4" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="gba:text-sm gba:space-y-2 gba:list-decimal gba:list-inside gba:text-muted-foreground">
              <li>
                Create a new NW Function with the tool name:{' '}
                <code className="gba:bg-muted gba:px-1 gba:rounded">{selectedTool.id}</code>
              </li>
              <li>Copy and paste the source code above into the function</li>
              <li>Set the input schema using the JSON schema above</li>
              <li>
                <strong>Important:</strong> Configure the function with an{' '}
                <code className="gba:bg-muted gba:px-1 gba:rounded">accessToken</code> in the config
              </li>
              <li>Add the function to your Task Expert as a tool</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <WrenchIcon className="gba:w-5 gba:h-5" />
            Internal Tools
          </DialogTitle>
          <DialogDescription>Pre-built tools for Task Experts to interact with platform data.</DialogDescription>
        </DialogHeader>

        {/* Register All Button */}
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:pb-4 gba:border-b">
          <Button
            onClick={registerAllTools}
            disabled={isRegistering || !accessToken}
            data-testid="register-all-tools-button"
          >
            {isRegistering ? (
              <Loader2Icon className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
            ) : (
              <UploadIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            )}
            {isRegistering ? 'Working...' : 'Register All'}
          </Button>
          <Button
            onClick={deleteAndRegisterAllTools}
            disabled={isRegistering || !accessToken}
            variant="destructive"
            data-testid="delete-and-register-tools-button"
          >
            {isRegistering ? (
              <Loader2Icon className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
            ) : (
              <Trash2Icon className="gba:w-4 gba:h-4 gba:mr-2" />
            )}
            Delete Old & Re-register Fresh
          </Button>
          <span className="gba:text-sm gba:text-muted-foreground gba:w-full gba:mt-1">
            Use "Delete Old & Re-register Fresh" to clean up old versions and start fresh
          </span>
        </div>

        {/* Registration Result */}
        {registerResult && (
          <Alert variant={registerResult.success ? 'default' : 'destructive'} className="gba:my-4">
            {registerResult.success ? (
              <CheckIcon className="gba:w-4 gba:h-4" />
            ) : (
              <AlertCircleIcon className="gba:w-4 gba:h-4" />
            )}
            <AlertTitle>{registerResult.success ? 'Success' : 'Registration Error'}</AlertTitle>
            <AlertDescription className="gba:whitespace-pre-wrap gba:text-xs">
              {registerResult.message}
            </AlertDescription>
          </Alert>
        )}

        {selectedTool ? (
          renderToolDetails()
        ) : (
          <div className="gba:space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="gba:flex-wrap">
                <TabsTrigger value="all">All ({ALL_TOOLS.length})</TabsTrigger>
                {CATEGORIES.map(category => (
                  <TabsTrigger key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}s (
                    {ALL_TOOLS.filter(t => t.category === category).length})
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab} className="gba:mt-4">
                <div className="gba:grid gba:gap-3">{filteredTools.map(renderToolCard)}</div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default InternalToolsPanel
