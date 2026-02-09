import React from 'react'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { Loader2, Save } from 'lucide-react'
import type { McpToolAuthType, McpToolDraft } from './mcpToolDraft'

export interface McpToolConfigFormProps {
  toolId: string
  draft: McpToolDraft
  onChange: (patch: Partial<McpToolDraft>) => void
  error: string | null
  readOnly?: boolean
  canTest: boolean
  isTesting: boolean
  isSaving: boolean
  onTest: () => void
  onSave: () => void
}

export const McpToolConfigForm: React.FC<McpToolConfigFormProps> = props => {
  const { toolId, draft, onChange, error, readOnly, canTest, isTesting, isSaving, onTest, onSave } = props
  const disableInputs = !!readOnly || isSaving || isTesting

  return (
    <div className="gba:space-y-4">
      {error && <div className="gba:text-sm gba:text-destructive">{error}</div>}

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <div className="gba:space-y-2">
          <Label>Name</Label>
          <Input
            value={draft.name}
            onChange={e => onChange({ name: e.target.value })}
            disabled={disableInputs}
            data-testid={`agent-builder-mcp-tool-name-${toolId}`}
          />
        </div>
        <div className="gba:space-y-2">
          <Label>Transport</Label>
          <Select
            value={draft.transport}
            onValueChange={v => onChange({ transport: v as McpToolDraft['transport'] })}
            disabled={disableInputs}
            data-testid={`agent-builder-mcp-tool-transport-${toolId}`}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="sse">SSE</SelectItem>
              <SelectItem value="websocket">WebSocket</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="gba:space-y-2">
        <Label>Server URL</Label>
        <Input
          value={draft.url}
          onChange={e => onChange({ url: e.target.value })}
          disabled={disableInputs}
          placeholder="https://example.com/mcp"
          data-testid={`agent-builder-mcp-tool-url-${toolId}`}
        />
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <div className="gba:space-y-2">
          <Label>Auth</Label>
          <div className="gba:flex gba:items-center gba:gap-2 gba:pt-1">
            <Checkbox
              checked={draft.preferSession}
              onCheckedChange={() => onChange({ preferSession: !draft.preferSession })}
              disabled={disableInputs}
              data-testid={`agent-builder-mcp-tool-prefer-session-${toolId}`}
            />
            <div className="gba:text-xs gba:text-muted-foreground">Prefer session token (if available)</div>
          </div>
          <Select
            value={draft.authType}
            onValueChange={v => onChange({ authType: v as McpToolAuthType })}
            disabled={disableInputs}
            data-testid={`agent-builder-mcp-tool-auth-type-${toolId}`}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer token</SelectItem>
              <SelectItem value="basic">Basic auth</SelectItem>
              <SelectItem value="header">Custom header</SelectItem>
              <SelectItem value="oauth_client_credentials">OAuth client credentials</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {draft.authType === 'bearer' && (
          <div className="gba:space-y-2">
            <Label>Bearer Token</Label>
            <Input
              type="password"
              value={draft.bearerToken}
              onChange={e => onChange({ bearerToken: e.target.value })}
              disabled={disableInputs}
              data-testid={`agent-builder-mcp-tool-bearer-token-${toolId}`}
            />
          </div>
        )}

        {draft.authType === 'basic' && (
          <div className="gba:space-y-2">
            <Label>Basic Auth</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              <Input
                value={draft.basicUsername}
                onChange={e => onChange({ basicUsername: e.target.value })}
                disabled={disableInputs}
                placeholder="Username"
                data-testid={`agent-builder-mcp-tool-basic-username-${toolId}`}
              />
              <Input
                type="password"
                value={draft.basicPassword}
                onChange={e => onChange({ basicPassword: e.target.value })}
                disabled={disableInputs}
                placeholder="Password"
                data-testid={`agent-builder-mcp-tool-basic-password-${toolId}`}
              />
            </div>
          </div>
        )}

        {draft.authType === 'header' && (
          <div className="gba:space-y-2">
            <Label>Header</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              <Input
                value={draft.headerName}
                onChange={e => onChange({ headerName: e.target.value })}
                disabled={disableInputs}
                placeholder="Header name"
                data-testid={`agent-builder-mcp-tool-header-name-${toolId}`}
              />
              <Input
                value={draft.headerValue}
                onChange={e => onChange({ headerValue: e.target.value })}
                disabled={disableInputs}
                placeholder="Header value"
                data-testid={`agent-builder-mcp-tool-header-value-${toolId}`}
              />
            </div>
          </div>
        )}

        {draft.authType === 'oauth_client_credentials' && (
          <div className="gba:space-y-2">
            <Label>OAuth Client Credentials</Label>
            <div className="gba:space-y-2">
              <Input
                value={draft.oauthTokenUrl}
                onChange={e => onChange({ oauthTokenUrl: e.target.value })}
                disabled={disableInputs}
                placeholder="Token URL"
                data-testid={`agent-builder-mcp-tool-oauth-token-url-${toolId}`}
              />
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                <Input
                  value={draft.oauthClientId}
                  onChange={e => onChange({ oauthClientId: e.target.value })}
                  disabled={disableInputs}
                  placeholder="Client ID"
                  data-testid={`agent-builder-mcp-tool-oauth-client-id-${toolId}`}
                />
                <Input
                  type="password"
                  value={draft.oauthClientSecret}
                  onChange={e => onChange({ oauthClientSecret: e.target.value })}
                  disabled={disableInputs}
                  placeholder="Client Secret"
                  data-testid={`agent-builder-mcp-tool-oauth-client-secret-${toolId}`}
                />
              </div>
              <Input
                value={draft.oauthScope}
                onChange={e => onChange({ oauthScope: e.target.value })}
                disabled={disableInputs}
                placeholder="Scope (optional)"
                data-testid={`agent-builder-mcp-tool-oauth-scope-${toolId}`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="gba:space-y-2">
        <Label>Additional Headers (JSON)</Label>
        <Textarea
          rows={4}
          value={draft.headersJson}
          onChange={e => onChange({ headersJson: e.target.value })}
          disabled={disableInputs}
          className="gba:font-mono gba:text-sm"
          placeholder='{\"X-Header\":\"value\"}'
          data-testid={`agent-builder-mcp-tool-headers-json-${toolId}`}
        />
      </div>

      <div className="gba:space-y-2">
        <Label>Environment (JSON)</Label>
        <Textarea
          rows={4}
          value={draft.envJson}
          onChange={e => onChange({ envJson: e.target.value })}
          disabled={disableInputs}
          className="gba:font-mono gba:text-sm"
          placeholder='{\"KEY\":\"value\"}'
          data-testid={`agent-builder-mcp-tool-env-json-${toolId}`}
        />
      </div>

      <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={!canTest || isTesting}
          data-testid={`agent-builder-mcp-tool-test-${toolId}`}
        >
          {isTesting ? <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" /> : 'Test'}
        </Button>
        {!readOnly && (
          <Button
            size="sm"
            variant="default"
            onClick={onSave}
            disabled={isSaving}
            data-testid={`agent-builder-mcp-tool-save-${toolId}`}
          >
            <Save className="gba:w-4 gba:h-4 gba:mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default McpToolConfigForm
