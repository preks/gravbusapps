import React from 'react'
import {
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@newwork/nw-design-system'
import { Settings2, FileJson } from 'lucide-react'
import type { TabProps } from './types'

export const AdvancedTab: React.FC<TabProps> = ({ state, actions, catalogs }) => {
  return (
    <div className="gba:space-y-6" data-testid="agent-builder-advanced-tab">
      {/* Model Configuration */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Settings2 className="gba:w-5 gba:h-5" />
            Model Configuration
          </CardTitle>
          <CardDescription>Configure the AI model and parameters</CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>Service</Label>
              <Select value={state.serviceId} onValueChange={actions.setServiceId}>
                <SelectTrigger data-testid="agent-builder-service">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.services.map(s => (
                    <SelectItem key={s._id || s.name} value={s._id || ''}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:space-y-2">
              <Label>
                Model <span className="gba:text-destructive">*</span>
              </Label>
              <Select value={state.modelId} onValueChange={actions.setModelId}>
                <SelectTrigger data-testid="agent-builder-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.models.map(m => (
                    <SelectItem key={m._id || m.name} value={m._id || ''}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label>Temperature</Label>
              <span className="gba:text-sm gba:font-medium">{state.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={state.temperature}
              onChange={e => actions.setTemperature(Number(e.target.value))}
              className="gba:w-full gba:accent-primary"
              data-testid="agent-builder-temperature"
            />
            <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
              <span>Precise (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Format */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileJson className="gba:w-5 gba:h-5" />
            Response Format
          </CardTitle>
          <CardDescription>Define how the agent should structure responses</CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:flex gba:gap-3">
            <Button
              variant={state.responseType === 'text' ? 'default' : 'outline'}
              onClick={() => actions.setResponseType('text')}
              data-testid="agent-builder-response-text"
            >
              Text
            </Button>
            <Button
              variant={state.responseType === 'json' ? 'default' : 'outline'}
              onClick={() => actions.setResponseType('json')}
              data-testid="agent-builder-response-json"
            >
              JSON
            </Button>
          </div>

          {state.responseType === 'json' && (
            <div className="gba:space-y-2">
              <Label>JSON Schema</Label>
              <Textarea
                rows={8}
                value={state.responseSchema}
                onChange={e => actions.setResponseSchema(e.target.value)}
                placeholder='{"type": "object", "properties": {...}}'
                className="gba:font-mono gba:text-sm"
                data-testid="agent-builder-response-schema"
              />
              <p className="gba:text-xs gba:text-muted-foreground">Define the expected JSON structure for responses</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdvancedTab
