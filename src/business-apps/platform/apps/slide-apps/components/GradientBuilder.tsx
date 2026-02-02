/**
 * GradientBuilder - Custom gradient creator component
 */

import React, { useState, useCallback } from 'react'
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Separator
} from '@newwork/nw-design-system'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import type { GradientConfig, GradientStop } from './slideElements'
import { gradientToCss, PRESET_GRADIENTS, COLOR_PRESETS } from './slideElements'

interface GradientBuilderProps {
  gradient?: GradientConfig
  onChange: (gradient: GradientConfig | undefined) => void
  onClose?: () => void
}

const DEFAULT_GRADIENT: GradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#3b82f6', position: 0 },
    { color: '#8b5cf6', position: 100 }
  ]
}

export const GradientBuilder: React.FC<GradientBuilderProps> = ({
  gradient,
  onChange,
  onClose
}) => {
  const [localGradient, setLocalGradient] = useState<GradientConfig>(
    gradient || DEFAULT_GRADIENT
  )

  const updateGradient = useCallback((updates: Partial<GradientConfig>) => {
    const newGradient = { ...localGradient, ...updates }
    setLocalGradient(newGradient)
    onChange(newGradient)
  }, [localGradient, onChange])

  const updateStop = useCallback((index: number, updates: Partial<GradientStop>) => {
    const newStops = localGradient.stops.map((stop, i) => 
      i === index ? { ...stop, ...updates } : stop
    )
    updateGradient({ stops: newStops })
  }, [localGradient.stops, updateGradient])

  const addStop = useCallback(() => {
    if (localGradient.stops.length >= 6) return
    const lastStop = localGradient.stops[localGradient.stops.length - 1]
    const newPosition = Math.min(100, lastStop.position + 20)
    const newStops = [...localGradient.stops, { color: '#ffffff', position: newPosition }]
      .sort((a, b) => a.position - b.position)
    updateGradient({ stops: newStops })
  }, [localGradient.stops, updateGradient])

  const removeStop = useCallback((index: number) => {
    if (localGradient.stops.length <= 2) return
    const newStops = localGradient.stops.filter((_, i) => i !== index)
    updateGradient({ stops: newStops })
  }, [localGradient.stops, updateGradient])

  const applyPreset = useCallback((preset: GradientConfig) => {
    setLocalGradient(preset)
    onChange(preset)
  }, [onChange])

  const clearGradient = useCallback(() => {
    onChange(undefined)
    onClose?.()
  }, [onChange, onClose])

  return (
    <div className="gba:space-y-4">
      {/* Preview */}
      <div 
        className="gba:h-20 gba:rounded-lg gba:border gba:shadow-inner"
        style={{ background: gradientToCss(localGradient) }}
      />

      {/* Presets */}
      <div>
        <Label className="gba:text-xs gba:font-semibold gba:mb-2 gba:block">Quick Presets</Label>
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {PRESET_GRADIENTS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.gradient)}
              className="gba:w-8 gba:h-8 gba:rounded gba:border gba:border-muted hover:gba:scale-110 gba:transition-transform hover:gba:shadow-md"
              style={{ background: gradientToCss(preset.gradient) }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Gradient Type */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <div>
          <Label className="gba:text-xs">Type</Label>
          <Select
            value={localGradient.type}
            onValueChange={(value: 'linear' | 'radial') => updateGradient({ type: value })}
          >
            <SelectTrigger className="gba:text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {localGradient.type === 'linear' && (
          <div>
            <Label className="gba:text-xs">Angle: {localGradient.angle}°</Label>
            <Slider
              value={[localGradient.angle]}
              min={0}
              max={360}
              step={15}
              onValueChange={([value]) => updateGradient({ angle: value })}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Color Stops */}
      <div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <Label className="gba:text-xs gba:font-semibold">Color Stops</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addStop}
            disabled={localGradient.stops.length >= 6}
            className="gba:h-7"
          >
            <Plus className="gba:w-3 gba:h-3 gba:mr-1" />
            Add
          </Button>
        </div>

        <div className="gba:space-y-3">
          {localGradient.stops.map((stop, index) => (
            <div key={index} className="gba:flex gba:items-center gba:gap-2">
              {/* Color Picker */}
              <input
                type="color"
                value={stop.color}
                onChange={(e) => updateStop(index, { color: e.target.value })}
                className="gba:w-10 gba:h-8 gba:rounded gba:border gba:cursor-pointer"
              />
              
              {/* Quick Colors */}
              <div className="gba:flex gba:gap-1">
                {COLOR_PRESETS.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    onClick={() => updateStop(index, { color })}
                    className="gba:w-4 gba:h-4 gba:rounded-sm gba:border gba:border-muted/50 hover:gba:scale-125 gba:transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Position */}
              <div className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                <Slider
                  value={[stop.position]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => updateStop(index, { position: value })}
                  className="gba:flex-1"
                />
                <span className="gba:text-xs gba:text-muted-foreground gba:w-8">{stop.position}%</span>
              </div>

              {/* Remove */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeStop(index)}
                disabled={localGradient.stops.length <= 2}
                className="gba:h-6 gba:w-6"
              >
                <Trash2 className="gba:w-3 gba:h-3 gba:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="gba:flex gba:justify-between">
        <Button variant="ghost" size="sm" onClick={clearGradient}>
          <RotateCcw className="gba:w-3 gba:h-3 gba:mr-1" />
          Remove Gradient
        </Button>
      </div>
    </div>
  )
}

export default GradientBuilder
