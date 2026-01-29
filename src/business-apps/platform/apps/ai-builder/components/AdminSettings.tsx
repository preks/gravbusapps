import React, { useState, useEffect } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Input } from '@newwork/nw-design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Label } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { Switch } from '@newwork/nw-design-system'
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  Save,
  GitBranch,
  Github,
  AlertCircle,
  CheckCircle,
  Settings,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { AutoInitConfig, CreateAutoInitConfigRequest, UpdateAutoInitConfigRequest } from '../types/admin'
import {
  getAutoInitConfigs,
  createAutoInitConfig,
  updateAutoInitConfig,
  deleteAutoInitConfig,
  syncAutoInitConfig,
  getAllIndexingStatus,
  IndexingStatus
} from '../api/adminClient'

interface AdminSettingsProps {
  onClose?: () => void
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onClose }) => {
  const [configs, setConfigs] = useState<AutoInitConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state for new config
  const [showAddForm, setShowAddForm] = useState(false)
  const [newConfig, setNewConfig] = useState<CreateAutoInitConfigRequest>({
    url: '',
    branch: '',
    autoInitOnStartup: true,
    blockedBranches: [],
    enabled: true
  })
  const [blockedBranchesInput, setBlockedBranchesInput] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UpdateAutoInitConfigRequest>({})
  const [editBlockedBranches, setEditBlockedBranches] = useState('')

  // Sync state
  const [syncingId, setSyncingId] = useState<string | null>(null)

  // Indexing status state
  const [indexingStatus, setIndexingStatus] = useState<Map<string, IndexingStatus>>(new Map())

  // Load configs on mount
  useEffect(() => {
    loadConfigs()
  }, [])

  // Load indexing status and poll while indexing is active
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    const loadStatus = async () => {
      try {
        const statuses = await getAllIndexingStatus()
        const statusMap = new Map<string, IndexingStatus>()
        statuses.forEach(s => statusMap.set(s.configId, s))
        setIndexingStatus(statusMap)

        // Check if any indexing is in progress
        const hasActiveIndexing = statuses.some(
          s => s.progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(s.progress.status)
        )

        // If active indexing, poll more frequently
        if (hasActiveIndexing && !pollInterval) {
          pollInterval = setInterval(loadStatus, 2000) // Poll every 2 seconds
        } else if (!hasActiveIndexing && pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
      } catch (err) {
        console.error('Failed to load indexing status:', err)
      }
    }

    // Initial load
    loadStatus()

    // Slow poll even when not actively indexing (to catch new indexing)
    const slowPoll = setInterval(loadStatus, 10000) // Every 10 seconds

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      clearInterval(slowPoll)
    }
  }, [configs.length]) // Re-run when configs change

  const loadConfigs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAutoInitConfigs()
      setConfigs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setError(null)
      const config: CreateAutoInitConfigRequest = {
        ...newConfig,
        blockedBranches: blockedBranchesInput
          .split(',')
          .map(b => b.trim())
          .filter(Boolean)
      }
      await createAutoInitConfig(config)
      setSuccess('Configuration created successfully')
      setShowAddForm(false)
      setNewConfig({
        url: '',
        branch: '',
        autoInitOnStartup: true,
        blockedBranches: [],
        enabled: true
      })
      setBlockedBranchesInput('')
      await loadConfigs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create configuration')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      setError(null)
      const update: UpdateAutoInitConfigRequest = {
        ...editForm,
        blockedBranches: editBlockedBranches
          .split(',')
          .map(b => b.trim())
          .filter(Boolean)
      }
      await updateAutoInitConfig(id, update)
      setSuccess('Configuration updated successfully')
      setEditingId(null)
      setEditForm({})
      setEditBlockedBranches('')
      await loadConfigs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the configuration for "${name}"?`)) {
      return
    }
    try {
      setError(null)
      await deleteAutoInitConfig(id)
      setSuccess('Configuration deleted successfully')
      await loadConfigs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration')
    }
  }

  const startEdit = (config: AutoInitConfig) => {
    setEditingId(config.id)
    setEditForm({
      branch: config.branch,
      autoInitOnStartup: config.autoInitOnStartup,
      enabled: config.enabled
    })
    setEditBlockedBranches(config.blockedBranches.join(', '))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setEditBlockedBranches('')
  }

  const toggleEnabled = async (config: AutoInitConfig) => {
    try {
      await updateAutoInitConfig(config.id, { enabled: !config.enabled })
      await loadConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle configuration')
    }
  }

  const handleSync = async (config: AutoInitConfig) => {
    try {
      setError(null)
      setSyncingId(config.id)
      const result = await syncAutoInitConfig(config.id, false)
      setSuccess(result.message)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync repository')
    } finally {
      setSyncingId(null)
    }
  }

  // Get status label for display
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'scanning':
        return 'Scanning files...'
      case 'parsing':
        return 'Parsing code...'
      case 'embedding':
        return 'Generating embeddings...'
      case 'storing':
        return 'Saving to database...'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return status
    }
  }

  // Render progress bar for a config
  const renderProgress = (configId: string) => {
    const status = indexingStatus.get(configId)
    if (!status) return null

    const { progress, indexStatus: repoStatus } = status

    // Show if actively indexing
    if (progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(progress.status)) {
      const filePercent =
        progress.totalFiles > 0 ? Math.round((progress.processedFiles / progress.totalFiles) * 100) : 0

      return (
        <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
            <span className="gba:text-xs gba:font-medium gba:text-primary gba:flex gba:items-center gba:gap-2">
              <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin" />
              {getStatusLabel(progress.status)}
            </span>
            <span className="gba:text-xs gba:text-muted-foreground">
              {progress.processedFiles}/{progress.totalFiles} files ({filePercent}%)
            </span>
          </div>
          <div className="gba:w-full gba:bg-muted gba:rounded-full gba:h-2">
            <div
              className="gba:bg-primary gba:h-2 gba:rounded-full gba:transition-all gba:duration-300"
              style={{ width: `${filePercent}%` }}
            />
          </div>
          {progress.currentFile && (
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:truncate">{progress.currentFile}</p>
          )}
        </div>
      )
    }

    // Show status badge if repo exists
    if (repoStatus && repoStatus !== 'pending') {
      const statusColors: Record<string, string> = {
        indexed: 'gba:bg-success/10 gba:text-success',
        indexing: 'gba:bg-primary/10 gba:text-primary',
        failed: 'gba:bg-destructive/10 gba:text-destructive'
      }

      return (
        <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border">
          <span
            className={`gba:text-xs gba:px-2 gba:py-1 gba:rounded-full ${statusColors[repoStatus] || 'gba:bg-muted gba:text-muted-foreground'}`}
          >
            {repoStatus === 'indexed' ? 'Ready' : repoStatus === 'indexing' ? 'Indexing...' : repoStatus}
          </span>
        </div>
      )
    }

    // Show "not initialized" if no repo
    if (!status.repoId) {
      return (
        <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border">
          <span className="gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:bg-amber-100 gba:text-amber-700 dark:gba:bg-amber-900/30 dark:gba:text-amber-400">
            Not initialized
          </span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="gba:min-h-screen gba:relative gba:p-6 gba:overflow-hidden">
      {/* AI-themed animated background */}
      <div className="gba:absolute gba:inset-0 gba:-z-10 gba:bg-gradient-to-br gba:from-blue-50 gba:via-purple-50 gba:to-pink-50 dark:gba:from-blue-950/20 dark:gba:via-purple-950/20 dark:gba:to-pink-950/20" />

      {/* Animated gradient orbs */}
      <div className="gba:absolute gba:top-0 gba:left-1/4 gba:w-96 gba:h-96 gba:bg-gradient-to-r gba:from-blue-400 gba:to-purple-400 gba:rounded-full gba:mix-blend-multiply gba:filter gba:blur-3xl gba:opacity-20 gba:animate-blob" />
      <div className="gba:absolute gba:top-0 gba:right-1/4 gba:w-96 gba:h-96 gba:bg-gradient-to-r gba:from-purple-400 gba:to-pink-400 gba:rounded-full gba:mix-blend-multiply gba:filter gba:blur-3xl gba:opacity-20 gba:animate-blob gba:animation-delay-2000" />
      <div className="gba:absolute gba:-bottom-32 gba:left-1/3 gba:w-96 gba:h-96 gba:bg-gradient-to-r gba:from-pink-400 gba:to-blue-400 gba:rounded-full gba:mix-blend-multiply gba:filter gba:blur-3xl gba:opacity-20 gba:animate-blob gba:animation-delay-4000" />

      {/* Grid pattern overlay */}
      <div
        className="gba:absolute gba:inset-0 gba:-z-10 gba:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="gba:max-w-4xl gba:mx-auto gba:space-y-6 gba:relative">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-4">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="gba:gap-2">
                <ArrowLeft className="gba:w-4 gba:h-4" />
                <span className="gba:hidden md:gba:inline">Back</span>
              </Button>
            )}
            <div>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center gba:shadow-lg">
                  <Settings className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
                </div>
                <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">Repository Configuration</h1>
              </div>
              <p className="gba:text-muted-foreground gba:mt-1 gba:ml-14">
                Configure repositories for auto-initialization
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="gba:h-4 gba:w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="gba:bg-success-secondary gba:border-success">
            <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
            <AlertDescription className="gba:text-success-secondary-foreground">{success}</AlertDescription>
          </Alert>
        )}

        {/* Add New Config Button */}
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="gba:gap-2">
            <Plus className="gba:w-4 gba:h-4" />
            Add Repository
          </Button>
        )}

        {/* Add New Config Form */}
        {showAddForm && (
          <Card className="gba:shadow-lg">
            <CardHeader>
              <CardTitle className="gba:text-lg">Add New Repository</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              <div className="gba:space-y-2">
                <Label htmlFor="url">Repository URL</Label>
                <Input
                  id="url"
                  placeholder="https://github.com/owner/repo or https://bitbucket.org/owner/repo"
                  value={newConfig.url}
                  onChange={e => setNewConfig({ ...newConfig, url: e.target.value })}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder="e.g. main, develop, feature/..."
                  value={newConfig.branch}
                  onChange={e => setNewConfig({ ...newConfig, branch: e.target.value })}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="blockedBranches">Blocked Branches (comma-separated)</Label>
                <Input
                  id="blockedBranches"
                  placeholder="production, master, main"
                  value={blockedBranchesInput}
                  onChange={e => setBlockedBranchesInput(e.target.value)}
                />
                <p className="gba:text-xs gba:text-muted-foreground">Branches that should not be cloned or modified</p>
              </div>
              <div className="gba:flex gba:items-center gba:gap-3 gba:pt-2">
                <Switch
                  checked={newConfig.autoInitOnStartup}
                  onCheckedChange={checked => setNewConfig({ ...newConfig, autoInitOnStartup: checked })}
                />
                <Label className="gba:cursor-pointer">Auto-initialize on startup</Label>
              </div>
              <div className="gba:flex gba:gap-3 gba:pt-4">
                <Button onClick={handleCreate} className="gba:gap-2">
                  <Save className="gba:w-4 gba:h-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config List */}
        {loading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Loader2 className="gba:w-8 gba:h-8 gba:animate-spin gba:text-muted-foreground" />
          </div>
        ) : configs.length === 0 ? (
          <Card className="gba:shadow-lg">
            <CardContent className="gba:py-12 gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-4">
                <Settings className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
              </div>
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">
                No repository configurations found
              </h3>
              <p className="gba:text-sm gba:text-muted-foreground">Add a repository to get started with AI Builder</p>
            </CardContent>
          </Card>
        ) : (
          <div className="gba:space-y-4">
            {configs.map(config => (
              <Card
                key={config.id}
                className={`gba:shadow-lg gba:transition-all ${!config.enabled ? 'gba:opacity-60' : ''}`}
              >
                <CardContent className="gba:py-4">
                  {editingId === config.id ? (
                    // Edit Mode
                    <div className="gba:space-y-4">
                      <div className="gba:space-y-2">
                        <Label>Branch</Label>
                        <Input
                          value={editForm.branch || ''}
                          onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                        />
                      </div>
                      <div className="gba:space-y-2">
                        <Label>Blocked Branches (comma-separated)</Label>
                        <Input value={editBlockedBranches} onChange={e => setEditBlockedBranches(e.target.value)} />
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Switch
                          checked={editForm.autoInitOnStartup ?? config.autoInitOnStartup}
                          onCheckedChange={checked => setEditForm({ ...editForm, autoInitOnStartup: checked })}
                        />
                        <Label className="gba:cursor-pointer">Auto-initialize on startup</Label>
                      </div>
                      <div className="gba:flex gba:gap-3 gba:pt-2">
                        <Button size="sm" onClick={() => handleUpdate(config.id)} className="gba:gap-2">
                          <Save className="gba:w-4 gba:h-4" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                        <div className="gba:space-y-2 gba:flex-1 gba:min-w-0">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                            <Github className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:flex-shrink-0" />
                            <span className="gba:font-semibold gba:text-foreground">
                              {config.owner}/{config.name}
                            </span>
                            <Badge variant={config.enabled ? 'default' : 'secondary'}>
                              {config.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            {config.autoInitOnStartup && <Badge variant="outline">Auto-init</Badge>}
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-muted-foreground">
                            <GitBranch className="gba:w-4 gba:h-4" />
                            <span>{config.branch}</span>
                          </div>
                          {config.blockedBranches.length > 0 && (
                            <div className="gba:text-sm gba:text-muted-foreground">
                              <span className="gba:text-destructive gba:font-medium">Blocked: </span>
                              {config.blockedBranches.join(', ')}
                            </div>
                          )}
                          <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{config.url}</div>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(config)}
                            disabled={syncingId === config.id}
                            title="Sync repository"
                            className="gba:gap-1"
                          >
                            <RefreshCw
                              className={`gba:w-4 gba:h-4 ${syncingId === config.id ? 'gba:animate-spin' : ''}`}
                            />
                            <span className="gba:hidden sm:gba:inline">Sync</span>
                          </Button>
                          <Switch checked={config.enabled} onCheckedChange={() => toggleEnabled(config)} />
                          <Button size="sm" variant="ghost" onClick={() => startEdit(config)}>
                            <Edit className="gba:w-4 gba:h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gba:text-destructive hover:gba:text-destructive"
                            onClick={() => handleDelete(config.id, `${config.owner}/${config.name}`)}
                          >
                            <Trash2 className="gba:w-4 gba:h-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Indexing Progress */}
                      {renderProgress(config.id)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {configs.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
            <span>
              {configs.length} {configs.length === 1 ? 'repository' : 'repositories'} configured
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
