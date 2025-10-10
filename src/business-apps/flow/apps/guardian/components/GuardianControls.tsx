import React from 'react'
import { Card, Button, Select, Slider, Switch, Checkbox, Input } from '@newwork/nw-design-system'
import { GuardianViewMode, GuardianFilter } from '../types/guardianTypes'

interface GuardianControlsProps {
  viewMode: GuardianViewMode
  filters: GuardianFilter
  animationSpeed: number
  onFiltersChange: (filters: Partial<GuardianFilter>) => void
  onAnimationSpeedChange: (speed: number) => void
  prefixDataTestId: string
}

export const GuardianControls: React.FC<GuardianControlsProps> = ({
  viewMode,
  filters,
  animationSpeed,
  onFiltersChange,
  onAnimationSpeedChange,
  prefixDataTestId
}) => {
  return (
    <div
      style={{
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)'
      }}
      data-testid={`${prefixDataTestId}-container`}
    >
      {/* Filters Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0,
            marginBottom: '8px'
          }}
        >
          Visualization Controls
        </h3>
        <p
          style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
          }}
        >
          Customize the {viewMode.replace('-', ' ')} view
        </p>
      </div>

      {/* Entity Filters */}
      <div style={{ marginBottom: '24px' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}
        >
          Show Elements
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox
              checked={filters.showActiveWorkflows}
              onCheckedChange={checked => onFiltersChange({ showActiveWorkflows: checked })}
              data-testid={`${prefixDataTestId}-active-workflows-checkbox`}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>Active Workflows</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox
              checked={filters.showCompleted}
              onCheckedChange={checked => onFiltersChange({ showCompleted: checked })}
              data-testid={`${prefixDataTestId}-completed-checkbox`}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>Completed Tasks</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox
              checked={filters.showDepartments}
              onCheckedChange={checked => onFiltersChange({ showDepartments: checked })}
              data-testid={`${prefixDataTestId}-departments-checkbox`}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>Departments</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox
              checked={filters.showUsers}
              onCheckedChange={checked => onFiltersChange({ showUsers: checked })}
              data-testid={`${prefixDataTestId}-users-checkbox`}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>Users</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox
              checked={filters.showCapabilities}
              onCheckedChange={checked => onFiltersChange({ showCapabilities: checked })}
              data-testid={`${prefixDataTestId}-capabilities-checkbox`}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>Capabilities</span>
          </label>
        </div>
      </div>

      {/* Time Range Filter */}
      <div style={{ marginBottom: '24px' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}
        >
          Time Range
        </h4>

        <Select
          value={filters.timeRange}
          onValueChange={value => onFiltersChange({ timeRange: value as any })}
          data-testid={`${prefixDataTestId}-time-range-select`}
        >
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </Select>
      </div>

      {/* Animation Controls */}
      <div style={{ marginBottom: '24px' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}
        >
          Animation
        </h4>

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '8px'
            }}
          >
            Speed: {animationSpeed.toFixed(1)}x
          </label>
          <Slider
            value={[animationSpeed]}
            onValueChange={([value]) => onAnimationSpeedChange(value)}
            min={0.1}
            max={3.0}
            step={0.1}
            data-testid={`${prefixDataTestId}-animation-speed-slider`}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Checkbox
            checked={filters.showAnimations}
            onCheckedChange={checked => onFiltersChange({ showAnimations: checked })}
            data-testid={`${prefixDataTestId}-animations-checkbox`}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>Show Animations</span>
        </label>
      </div>

      {/* Visual Options */}
      <div style={{ marginBottom: '24px' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}
        >
          Visual Options
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox
              checked={filters.showLabels}
              onCheckedChange={checked => onFiltersChange({ showLabels: checked })}
              data-testid={`${prefixDataTestId}-labels-checkbox`}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>Show Labels</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Checkbox
              checked={!!filters.showDensityTrails}
              onCheckedChange={checked => onFiltersChange({ showDensityTrails: checked })}
              data-testid={`${prefixDataTestId}-density-trails-checkbox`}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>Density Trails</span>
          </label>
        </div>
      </div>

      {/* Node Size Range */}
      <div style={{ marginBottom: '24px' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}
        >
          Node Size
        </h4>

        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '8px'
            }}
          >
            Min Size: {filters.minNodeSize}
          </label>
          <Slider
            value={[filters.minNodeSize]}
            onValueChange={([value]) => onFiltersChange({ minNodeSize: value })}
            min={2}
            max={20}
            step={1}
            data-testid={`${prefixDataTestId}-min-node-size-slider`}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '8px'
            }}
          >
            Max Size: {filters.maxNodeSize}
          </label>
          <Slider
            value={[filters.maxNodeSize]}
            onValueChange={([value]) => onFiltersChange({ maxNodeSize: value })}
            min={10}
            max={50}
            step={1}
            data-testid={`${prefixDataTestId}-max-node-size-slider`}
          />
        </div>
      </div>

      {/* View-specific Controls */}
      {viewMode === 'force-directed' && (
        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '12px'
            }}
          >
            Network Options
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                /* Reset layout */
              }}
              data-testid={`${prefixDataTestId}-reset-layout-button`}
            >
              Reset Layout
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                /* Center view */
              }}
              data-testid={`${prefixDataTestId}-center-view-button`}
            >
              Center View
            </Button>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}
        >
          Export
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              /* Export as PNG */
            }}
            data-testid={`${prefixDataTestId}-export-png-button`}
          >
            Export as PNG
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              /* Export data */
            }}
            data-testid={`${prefixDataTestId}-export-data-button`}
          >
            Export Data
          </Button>
        </div>
      </div>
    </div>
  )
}
