import React, { useState, useEffect } from 'react'
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Badge,
  Alert,
  AlertDescription,
  Switch
} from '@newwork/nw-design-system'
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  Save,
  GitBranch,
  Github as GithubIcon,
  AlertCircle,
  CheckCircle,
  Settings,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AutoInitConfig, CreateAutoInitConfigRequest, UpdateAutoInitConfigRequest } from '../../../types/admin'
import {
  builderClient,
  type IndexingStatus,
  type AutoInitConfig as ApiAutoInitConfig,
  type CreateAutoInitConfigRequest as ApiCreateAutoInitConfigRequest
} from '@/common/network/ai/builder'

function mapApiConfigToAdmin(api: ApiAutoInitConfig): AutoInitConfig {
  const source = api.url.includes('bitbucket') ? 'bitbucket' : 'github'
  const extended = api as ApiAutoInitConfig & Partial<AutoInitConfig>
  return {
    id: api.id,
    url: api.url,
    branch: api.branch,
    source,
    owner: api.owner,
    name: api.name,
    repoId: api.repoId ?? null,
    enabled: api.enabled,
    autoInitOnStartup: extended.autoInitOnStartup ?? false,
    blockedBranches: extended.blockedBranches ?? [],
    supportsPublish: extended.supportsPublish ?? false,
    publishBasePath: extended.publishBasePath ?? null,
    publishAssetsPath: extended.publishAssetsPath ?? null,
    publishAzureEnabled: extended.publishAzureEnabled ?? false,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt
  }
}

function parseOwnerAndNameFromUrl(url: string): { owner: string; name: string } {
  try {
    const u = new URL(url)
    const pathParts = u.pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/')
      .filter(Boolean)
    const name = pathParts.pop() ?? 'repo'
    const owner = pathParts.pop() ?? 'owner'
    return { owner, name }
  } catch {
    return { owner: 'owner', name: 'repo' }
  }
}

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
    enabled: true,
    supportsPublish: false,
    publishBasePath: '',
    publishAssetsPath: '',
    publishAzureEnabled: false
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

  // Reference to track polling interval
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Load indexing status - only poll when actively indexing or after sync
  useEffect(() => {
    // Don't poll if no configs
    if (configs.length === 0) return

    let isMounted = true

    const loadStatus = async () => {
      if (!isMounted) return

      try {
        const statuses = await builderClient.getAllIndexingStatus()
        if (!isMounted) return

        const statusMap = new Map<string, IndexingStatus>()
        statuses.forEach(s => statusMap.set(s.configId, s))
        setIndexingStatus(statusMap)

        // Check if any indexing is in progress
        const hasActiveIndexing = statuses.some(
          s => s.progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(s.progress.status)
        )

        // If active indexing, poll more frequently
        if (hasActiveIndexing) {
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(loadStatus, 2000) // Poll every 2 seconds
          }
        } else if (pollIntervalRef.current) {
          // Stop polling when no active indexing
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } catch {
        // Failed to load indexing status, stop polling on error
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }

    // Initial load only (no continuous polling unless active indexing)
    loadStatus()

    return () => {
      isMounted = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [configs.length]) // Re-run when configs change

  // Reload status after sync completes and start polling if indexing begins
  const reloadIndexingStatus = async () => {
    if (configs.length === 0) return
    try {
      const statuses = await builderClient.getAllIndexingStatus()
      const statusMap = new Map<string, IndexingStatus>()
      statuses.forEach(s => statusMap.set(s.configId, s))
      setIndexingStatus(statusMap)

      // Check if indexing started and enable polling
      const hasActiveIndexing = statuses.some(
        s => s.progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(s.progress.status)
      )
      if (hasActiveIndexing && !pollIntervalRef.current) {
        // Start polling since indexing is now active
        const pollFn = async () => {
          try {
            const newStatuses = await builderClient.getAllIndexingStatus()
            const newStatusMap = new Map<string, IndexingStatus>()
            newStatuses.forEach(s => newStatusMap.set(s.configId, s))
            setIndexingStatus(newStatusMap)

            const stillIndexing = newStatuses.some(
              s => s.progress && ['scanning', 'parsing', 'embedding', 'storing'].includes(s.progress.status)
            )
            if (!stillIndexing && pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          } catch {
            // Stop polling on error
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        }
        pollIntervalRef.current = setInterval(pollFn, 2000)
      }
    } catch {
      // Ignore errors
    }
  }

  const loadConfigs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await builderClient.getAutoInitConfigs()
      setConfigs(data.map(mapApiConfigToAdmin))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.admin.load_configs_failed',
              'Failed to load configurations'
            )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setError(null)
      const blockedBranches = blockedBranchesInput
        .split(',')
        .map(b => b.trim())
        .filter(Boolean)
      const { owner, name } = parseOwnerAndNameFromUrl(newConfig.url)
      const apiRequest: ApiCreateAutoInitConfigRequest = {
        url: newConfig.url,
        owner,
        name,
        branch: newConfig.branch,
        enabled: newConfig.enabled ?? true,
        ...(newConfig.autoInitOnStartup !== undefined && { autoInitOnStartup: newConfig.autoInitOnStartup }),
        ...(blockedBranches.length > 0 && { blockedBranches }),
        ...(newConfig.supportsPublish !== undefined && { supportsPublish: newConfig.supportsPublish }),
        ...(newConfig.publishBasePath && { publishBasePath: newConfig.publishBasePath }),
        ...(newConfig.publishAssetsPath && { publishAssetsPath: newConfig.publishAssetsPath }),
        ...(newConfig.publishAzureEnabled !== undefined && { publishAzureEnabled: newConfig.publishAzureEnabled })
      }
      await builderClient.createAutoInitConfig(apiRequest)
      setSuccess(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.admin.config_created',
          'Configuration created successfully'
        )
      )
      setShowAddForm(false)
      setNewConfig({
        url: '',
        branch: '',
        autoInitOnStartup: true,
        blockedBranches: [],
        enabled: true,
        supportsPublish: false,
        publishBasePath: '',
        publishAssetsPath: '',
        publishAzureEnabled: false
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
      await builderClient.updateAutoInitConfig(id, update)
      setSuccess(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.admin.config_updated',
          'Configuration updated successfully'
        )
      )
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
    if (
      !confirm(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.admin.delete_confirm',
          `Are you sure you want to delete the configuration for "${name}"?`,
          { name }
        )
      )
    ) {
      return
    }
    try {
      setError(null)
      await builderClient.deleteAutoInitConfig(id)
      setSuccess(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.admin.config_deleted',
          'Configuration deleted successfully'
        )
      )
      await loadConfigs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.admin.delete_config_failed',
              'Failed to delete configuration'
            )
      )
    }
  }

  const startEdit = (config: AutoInitConfig) => {
    setEditingId(config.id)
    setEditForm({
      branch: config.branch,
      autoInitOnStartup: config.autoInitOnStartup,
      enabled: config.enabled,
      supportsPublish: config.supportsPublish,
      publishBasePath: config.publishBasePath || '',
      publishAssetsPath: config.publishAssetsPath || '',
      publishAzureEnabled: config.publishAzureEnabled
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
      await builderClient.updateAutoInitConfig(config.id, { enabled: !config.enabled })
      await loadConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle configuration')
    }
  }

  const handleSync = async (config: AutoInitConfig) => {
    try {
      setError(null)
      setSyncingId(config.id)
      const result = await builderClient.syncAutoInitConfig(config.id, false)
      setSuccess(result.message)
      setTimeout(() => setSuccess(null), 5000)
      // Reload indexing status after sync to check if indexing started
      await reloadIndexingStatus()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.sync_failed', 'Failed to sync repository')
      )
    } finally {
      setSyncingId(null)
    }
  }

  // Get status label for display
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'scanning':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.status_scanning', 'Scanning files...')
      case 'parsing':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.status_parsing', 'Parsing code...')
      case 'embedding':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.admin.status_embedding',
          'Generating embeddings...'
        )
      case 'storing':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.status_storing', 'Saving to database...')
      case 'completed':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.status_completed', 'Completed')
      case 'failed':
        return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.status_failed', 'Failed')
      default:
        return status
    }
  }

  const getRepoStatusLabel = (repoStatus: string): string => {
    if (repoStatus === 'indexed') {
      return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.status_ready', 'Ready')
    }
    if (repoStatus === 'indexing') {
      return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.status_indexing', 'Indexing...')
    }
    return repoStatus
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
            {getRepoStatusLabel(repoStatus)}
          </span>
        </div>
      )
    }

    // Show "not initialized" if no repo
    if (!status.repoId) {
      return (
        <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border">
          <span className="gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:bg-amber-100 gba:text-amber-700 dark:gba:bg-amber-900/30 dark:gba:text-amber-400">
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.not_initialized', 'Not initialized')}
          </span>
        </div>
      )
    }

    return null
  }

  function renderConfigList(): React.ReactNode {
    if (loading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Loader2 className="gba:w-8 gba:h-8 gba:animate-spin gba:text-muted-foreground" />
        </div>
      )
    }
    if (configs.length > 0) {
      return (
        <div className="gba:space-y-4">
          {configs.map(config => (
            <Card
              key={config.id}
              className={`gba:shadow-lg gba:transition-all ${!config.enabled ? 'gba:opacity-60' : ''}`}
            >
              <CardContent className="gba:py-4">
                {editingId === config.id ? (
                  <div className="gba:space-y-4">
                    <div className="gba:space-y-2">
                      <Label>{getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.branch', 'Branch')}</Label>
                      <Input
                        value={editForm.branch || ''}
                        onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                      />
                    </div>
                    <div className="gba:space-y-2">
                      <Label>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.admin.blocked_branches',
                          'Blocked Branches (comma-separated)'
                        )}
                      </Label>
                      <Input value={editBlockedBranches} onChange={e => setEditBlockedBranches(e.target.value)} />
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Switch
                        checked={editForm.autoInitOnStartup ?? config.autoInitOnStartup}
                        onCheckedChange={checked => setEditForm({ ...editForm, autoInitOnStartup: checked })}
                      />
                      <Label className="gba:cursor-pointer">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.admin.auto_init_startup',
                          'Auto-initialize on startup'
                        )}
                      </Label>
                    </div>
                    <div className="gba:border-t gba:pt-4 gba:mt-2">
                      <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:ai_builder.admin.publish_config',
                          'Publish Configuration'
                        )}
                      </h4>
                      <div className="gba:space-y-4">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <Switch
                            checked={editForm.supportsPublish ?? config.supportsPublish}
                            onCheckedChange={checked => setEditForm({ ...editForm, supportsPublish: checked })}
                          />
                          <Label className="gba:cursor-pointer">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.admin.supports_publish',
                              'Enable publishing for this repository'
                            )}
                          </Label>
                        </div>
                        {(editForm.supportsPublish ?? config.supportsPublish) && (
                          <div className="gba:ml-6 gba:pl-4 gba:border-l-2 gba:border-muted gba:space-y-4">
                            <div className="gba:space-y-2">
                              <Label>
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.admin.publish_base_path',
                                  'Publish Base Path'
                                )}
                              </Label>
                              <Input
                                placeholder="src/business-apps"
                                value={editForm.publishBasePath ?? config.publishBasePath ?? ''}
                                onChange={e => setEditForm({ ...editForm, publishBasePath: e.target.value })}
                              />
                              <p className="gba:text-xs gba:text-muted-foreground">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.admin.publish_base_path_help',
                                  'Source path prefix for target paths (leave empty for repo root)'
                                )}
                              </p>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-3">
                              <Switch
                                checked={editForm.publishAzureEnabled ?? config.publishAzureEnabled}
                                onCheckedChange={checked => setEditForm({ ...editForm, publishAzureEnabled: checked })}
                              />
                              <Label className="gba:cursor-pointer">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:ai_builder.admin.azure_upload',
                                  'Upload to Azure Blob Storage'
                                )}
                              </Label>
                            </div>
                            {(editForm.publishAzureEnabled ?? config.publishAzureEnabled) && (
                              <div className="gba:ml-6 gba:pl-4 gba:border-l-2 gba:border-muted gba:space-y-2">
                                <Label>
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:ai_builder.admin.publish_assets_path',
                                    'Assets Path (relative to dist/)'
                                  )}
                                </Label>
                                <Input
                                  placeholder="assets"
                                  value={editForm.publishAssetsPath ?? config.publishAssetsPath ?? ''}
                                  onChange={e => setEditForm({ ...editForm, publishAssetsPath: e.target.value })}
                                />
                                <p className="gba:text-xs gba:text-muted-foreground">
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:ai_builder.admin.publish_assets_path_help',
                                    'Directory containing CSS/assets to upload (e.g., "assets" for dist/assets/)'
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="gba:flex gba:gap-3 gba:pt-2">
                      <Button size="sm" onClick={() => handleUpdate(config.id)} className="gba:gap-2">
                        <Save className="gba:w-4 gba:h-4" />
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.save', 'Save')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.cancel', 'Cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                      <div className="gba:space-y-2 gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                          <GithubIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:flex-shrink-0" />
                          <span className="gba:font-semibold gba:text-foreground">
                            {config.owner}/{config.name}
                          </span>
                          <Badge variant={config.enabled ? 'default' : 'secondary'}>
                            {config.enabled
                              ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.enabled', 'Enabled')
                              : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.disabled', 'Disabled')}
                          </Badge>
                          {config.autoInitOnStartup && (
                            <Badge variant="outline">
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.auto_init', 'Auto-init')}
                            </Badge>
                          )}
                          {config.supportsPublish && (
                            <Badge
                              variant="outline"
                              className="gba:bg-blue-100 gba:text-blue-700 dark:gba:bg-blue-900/30 dark:gba:text-blue-400"
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.admin.publish_enabled',
                                'Publish'
                              )}
                            </Badge>
                          )}
                          {config.publishAzureEnabled && (
                            <Badge
                              variant="outline"
                              className="gba:bg-purple-100 gba:text-purple-700 dark:gba:bg-purple-900/30 dark:gba:text-purple-400"
                            >
                              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.azure', 'Azure')}
                            </Badge>
                          )}
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-muted-foreground">
                          <GitBranch className="gba:w-4 gba:h-4" />
                          <span>{config.branch}</span>
                        </div>
                        {config.blockedBranches.length > 0 && (
                          <div className="gba:text-sm gba:text-muted-foreground">
                            <span className="gba:text-destructive gba:font-medium">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:ai_builder.admin.blocked_label',
                                'Blocked:'
                              )}{' '}
                            </span>
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
                          title={getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.admin.sync_repository',
                            'Sync repository'
                          )}
                          className="gba:gap-1"
                        >
                          <RefreshCw
                            className={`gba:w-4 gba:h-4 ${syncingId === config.id ? 'gba:animate-spin' : ''}`}
                          />
                          <span className="gba:hidden sm:gba:inline">
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.sync', 'Sync')}
                          </span>
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
                    {renderProgress(config.id)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }
    return (
      <Card className="gba:shadow-lg">
        <CardContent className="gba:py-12 gba:text-center">
          <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-4">
            <Settings className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
          </div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.admin.no_configs_found',
              'No repository configurations found'
            )}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.admin.no_configs_help',
              'Add a repository to get started with AI Builder'
            )}
          </p>
        </CardContent>
      </Card>
    )
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
                <span className="gba:hidden md:gba:inline">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.back', 'Back')}
                </span>
              </Button>
            )}
            <div>
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center gba:shadow-lg">
                  <Settings className="gba:w-5 gba:h-5 gba:text-primary-foreground" />
                </div>
                <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.title', 'Repository Configuration')}
                </h1>
              </div>
              <p className="gba:text-muted-foreground gba:mt-1 gba:ml-14">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:ai_builder.admin.description',
                  'Configure repositories for auto-initialization'
                )}
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
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.add_repository', 'Add Repository')}
          </Button>
        )}

        {/* Add New Config Form */}
        {showAddForm && (
          <Card className="gba:shadow-lg">
            <CardHeader>
              <CardTitle className="gba:text-lg">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:ai_builder.admin.add_new_repository',
                  'Add New Repository'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              <div className="gba:space-y-2">
                <Label htmlFor="url">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.repository_url', 'Repository URL')}
                </Label>
                <Input
                  id="url"
                  placeholder="https://github.com/owner/repo or https://bitbucket.org/owner/repo"
                  value={newConfig.url}
                  onChange={e => setNewConfig({ ...newConfig, url: e.target.value })}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="branch">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.branch', 'Branch')}
                </Label>
                <Input
                  id="branch"
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.admin.branch_placeholder',
                    'e.g. main, develop, feature/...'
                  )}
                  value={newConfig.branch}
                  onChange={e => setNewConfig({ ...newConfig, branch: e.target.value })}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="blockedBranches">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.admin.blocked_branches',
                    'Blocked Branches (comma-separated)'
                  )}
                </Label>
                <Input
                  id="blockedBranches"
                  placeholder="production, master, main"
                  value={blockedBranchesInput}
                  onChange={e => setBlockedBranchesInput(e.target.value)}
                />
                <p className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.admin.blocked_branches_help',
                    'Branches that should not be cloned or modified'
                  )}
                </p>
              </div>
              <div className="gba:flex gba:items-center gba:gap-3 gba:pt-2">
                <Switch
                  checked={newConfig.autoInitOnStartup}
                  onCheckedChange={checked => setNewConfig({ ...newConfig, autoInitOnStartup: checked })}
                />
                <Label className="gba:cursor-pointer">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.admin.auto_init_startup',
                    'Auto-initialize on startup'
                  )}
                </Label>
              </div>

              {/* Publish Configuration Section */}
              <div className="gba:border-t gba:pt-4 gba:mt-4">
                <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.admin.publish_config',
                    'Publish Configuration'
                  )}
                </h4>
                <div className="gba:space-y-4">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <Switch
                      checked={newConfig.supportsPublish}
                      onCheckedChange={checked => setNewConfig({ ...newConfig, supportsPublish: checked })}
                    />
                    <Label className="gba:cursor-pointer">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.admin.supports_publish',
                        'Enable publishing for this repository'
                      )}
                    </Label>
                  </div>
                  {newConfig.supportsPublish && (
                    <div className="gba:ml-6 gba:pl-4 gba:border-l-2 gba:border-muted gba:space-y-4">
                      <div className="gba:space-y-2">
                        <Label htmlFor="publishBasePath">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.admin.publish_base_path',
                            'Publish Base Path'
                          )}
                        </Label>
                        <Input
                          id="publishBasePath"
                          placeholder="src/business-apps"
                          value={newConfig.publishBasePath || ''}
                          onChange={e => setNewConfig({ ...newConfig, publishBasePath: e.target.value })}
                        />
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.admin.publish_base_path_help',
                            'Source path prefix for target paths (leave empty for repo root)'
                          )}
                        </p>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <Switch
                          checked={newConfig.publishAzureEnabled}
                          onCheckedChange={checked => setNewConfig({ ...newConfig, publishAzureEnabled: checked })}
                        />
                        <Label className="gba:cursor-pointer">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:ai_builder.admin.azure_upload',
                            'Upload to Azure Blob Storage'
                          )}
                        </Label>
                      </div>
                      {newConfig.publishAzureEnabled && (
                        <div className="gba:ml-6 gba:pl-4 gba:border-l-2 gba:border-muted gba:space-y-2">
                          <Label htmlFor="publishAssetsPath">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.admin.publish_assets_path',
                              'Assets Path (relative to dist/)'
                            )}
                          </Label>
                          <Input
                            id="publishAssetsPath"
                            placeholder="assets"
                            value={newConfig.publishAssetsPath || ''}
                            onChange={e => setNewConfig({ ...newConfig, publishAssetsPath: e.target.value })}
                          />
                          <p className="gba:text-xs gba:text-muted-foreground">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.admin.publish_assets_path_help',
                              'Directory containing CSS/assets to upload (e.g., "assets" for dist/assets/)'
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="gba:flex gba:gap-3 gba:pt-4">
                <Button onClick={handleCreate} className="gba:gap-2">
                  <Save className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.save', 'Save')}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.admin.cancel', 'Cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Config List */}
        {renderConfigList()}
      </div>
    </div>
  )
}
