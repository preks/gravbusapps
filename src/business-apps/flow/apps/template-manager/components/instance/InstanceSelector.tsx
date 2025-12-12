/**
 * InstanceSelector Component
 * Dropdown selector for flow engine instances
 */

import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Label } from '@newwork/nw-design-system'
import { FlowEngineInstance } from '../../types/instance'
import { Badge } from '@newwork/nw-design-system'

interface InstanceSelectorProps {
  value: string
  onChange: (value: string) => void
  instances: FlowEngineInstance[]
  label: string
  placeholder?: string
}

export const InstanceSelector: React.FC<InstanceSelectorProps> = ({
  value,
  onChange,
  instances,
  label,
  placeholder = 'Select instance...'
}) => {
  return (
    <div className="gba:space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="gba:w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {instances.map(instance => (
            <SelectItem key={instance.id} value={instance.id}>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>{instance.icon}</span>
                <span>{instance.name}</span>
                {instance.description && (
                  <Badge
                    variant="secondary"
                    style={{ backgroundColor: instance.color + '20', color: instance.color }}
                    className="gba:text-xs"
                  >
                    {instance.environment}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
