/**
 * PropertyPanel - Styling panel for selected elements
 */

import React, { useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Separator,
  Switch,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@newwork/nw-design-system'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  Lock,
  Unlock,
  MoveUp,
  MoveDown,
  RotateCcw,
  ChevronDown,
  Palette
} from 'lucide-react'
import type { AnySlideElement, TextElement, ShapeElement, ImageElement, VideoElement, GradientConfig } from './slideElements'
import { FONT_FAMILIES, FONT_SIZES, COLOR_PRESETS, PRESET_GRADIENTS, gradientToCss } from './slideElements'
import { GradientBuilder } from './GradientBuilder'

interface PropertyPanelProps {
  element: AnySlideElement | null
  onUpdate: (updates: Partial<AnySlideElement>) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringForward: () => void
  onSendBackward: () => void
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward
}) => {
  const [showGradientBuilder, setShowGradientBuilder] = useState(false)

  if (!element) {
    return (
      <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
        <p className="gba:text-sm">Select an element to edit its properties</p>
      </div>
    )
  }

  const textElement = element.type === 'text' ? element as TextElement : null
  const shapeElement = element.type === 'shape' ? element as ShapeElement : null
  const imageElement = element.type === 'image' ? element as ImageElement : null
  const videoElement = element.type === 'video' ? element as VideoElement : null

  const ColorPicker = ({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) => (
    <div className="gba:space-y-2">
      <Label className="gba:text-xs">{label}</Label>
      <div className="gba:flex gba:gap-2 gba:items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="gba:w-8 gba:h-8 gba:rounded gba:border gba:cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="gba:flex-1 gba:text-xs"
        />
      </div>
      <div className="gba:flex gba:flex-wrap gba:gap-1">
        {COLOR_PRESETS.slice(0, 12).map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className="gba:w-5 gba:h-5 gba:rounded gba:border gba:border-muted hover:gba:scale-110 gba:transition-transform"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  )

  const GradientSection = ({ 
    gradient, 
    onChange 
  }: { 
    gradient?: GradientConfig
    onChange: (gradient: GradientConfig | undefined) => void 
  }) => (
    <Collapsible open={showGradientBuilder} onOpenChange={setShowGradientBuilder}>
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <Label className="gba:text-xs gba:font-semibold">Gradient Fill</Label>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gba:h-7">
              <Palette className="gba:w-3 gba:h-3 gba:mr-1" />
              {showGradientBuilder ? 'Close' : 'Custom'}
              <ChevronDown className={`gba:w-3 gba:h-3 gba:ml-1 gba:transition-transform ${showGradientBuilder ? 'gba:rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Quick Presets */}
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <button
            onClick={() => onChange(undefined)}
            className={`gba:w-8 gba:h-8 gba:rounded gba:border-2 gba:flex gba:items-center gba:justify-center gba:text-xs ${!gradient ? 'gba:border-primary gba:bg-muted' : 'gba:border-muted'}`}
            title="No gradient"
          >
            ✕
          </button>
          {PRESET_GRADIENTS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onChange(preset.gradient)}
              className={`gba:w-8 gba:h-8 gba:rounded gba:border-2 hover:gba:scale-110 gba:transition-transform ${gradient && gradientToCss(gradient) === gradientToCss(preset.gradient) ? 'gba:border-primary gba:shadow-md' : 'gba:border-muted'}`}
              style={{ background: gradientToCss(preset.gradient) }}
              title={preset.name}
            />
          ))}
        </div>

        {/* Current gradient preview */}
        {gradient && (
          <div 
            className="gba:h-8 gba:rounded gba:border gba:shadow-inner"
            style={{ background: gradientToCss(gradient) }}
          />
        )}

        {/* Custom Gradient Builder */}
        <CollapsibleContent>
          <div className="gba:mt-3 gba:p-3 gba:border gba:rounded-lg gba:bg-muted/30">
            <GradientBuilder
              gradient={gradient}
              onChange={onChange}
              onClose={() => setShowGradientBuilder(false)}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )

  return (
    <div className="gba:p-4 gba:space-y-4 gba:overflow-y-auto gba:h-full">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:font-semibold gba:capitalize">{element.type}</span>
        <div className="gba:flex gba:gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onUpdate({ locked: !element.locked })} title={element.locked ? 'Unlock' : 'Lock'}>
            {element.locked ? <Lock className="gba:w-4 gba:h-4" /> : <Unlock className="gba:w-4 gba:h-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDuplicate} title="Duplicate">
            <Copy className="gba:w-4 gba:h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} title="Delete" className="gba:text-destructive">
            <Trash2 className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Position & Size */}
      <div className="gba:space-y-3">
        <Label className="gba:text-xs gba:font-semibold">Position & Size</Label>
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <div>
            <Label className="gba:text-xs">X</Label>
            <Input
              type="number"
              value={Math.round(element.position.x)}
              onChange={(e) => onUpdate({ position: { ...element.position, x: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
          <div>
            <Label className="gba:text-xs">Y</Label>
            <Input
              type="number"
              value={Math.round(element.position.y)}
              onChange={(e) => onUpdate({ position: { ...element.position, y: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
          <div>
            <Label className="gba:text-xs">Width</Label>
            <Input
              type="number"
              value={Math.round(element.size.width)}
              onChange={(e) => onUpdate({ size: { ...element.size, width: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
          <div>
            <Label className="gba:text-xs">Height</Label>
            <Input
              type="number"
              value={Math.round(element.size.height)}
              onChange={(e) => onUpdate({ size: { ...element.size, height: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
        </div>
      </div>

      {/* Rotation & Opacity */}
      <div className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Label className="gba:text-xs gba:flex-1">Rotation</Label>
          <Input
            type="number"
            value={element.rotation}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
            className="gba:w-16 gba:text-xs"
          />
          <span className="gba:text-xs">°</span>
          <Button variant="ghost" size="icon-sm" onClick={() => onUpdate({ rotation: 0 })} title="Reset rotation">
            <RotateCcw className="gba:w-3 gba:h-3" />
          </Button>
        </div>
        <div>
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
            <Label className="gba:text-xs">Opacity</Label>
            <span className="gba:text-xs gba:text-muted-foreground">{Math.round(element.opacity * 100)}%</span>
          </div>
          <Slider
            value={[element.opacity * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => onUpdate({ opacity: value / 100 })}
          />
        </div>
      </div>

      {/* Layer Order */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <Label className="gba:text-xs gba:flex-1">Layer</Label>
        <Button variant="outlined" size="sm" onClick={onBringForward}>
          <MoveUp className="gba:w-3 gba:h-3 gba:mr-1" />
          Forward
        </Button>
        <Button variant="outlined" size="sm" onClick={onSendBackward}>
          <MoveDown className="gba:w-3 gba:h-3 gba:mr-1" />
          Back
        </Button>
      </div>

      <Separator />

      {/* TEXT PROPERTIES */}
      {textElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">Text Formatting</Label>
          
          {/* Font Family */}
          <div>
            <Label className="gba:text-xs">Font Family</Label>
            <Select
              value={textElement.fontFamily}
              onValueChange={(value) => onUpdate({ fontFamily: value })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div>
            <Label className="gba:text-xs">Font Size</Label>
            <Select
              value={String(textElement.fontSize)}
              onValueChange={(value) => onUpdate({ fontSize: Number(value) })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Style Buttons */}
          <div className="gba:flex gba:gap-1">
            <Button
              variant={textElement.fontWeight === 'bold' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ fontWeight: textElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
            >
              <Bold className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.fontStyle === 'italic' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ fontStyle: textElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
            >
              <Italic className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textDecoration === 'underline' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textDecoration: textElement.textDecoration === 'underline' ? 'none' : 'underline' })}
            >
              <Underline className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textDecoration === 'line-through' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textDecoration: textElement.textDecoration === 'line-through' ? 'none' : 'line-through' })}
            >
              <Strikethrough className="gba:w-4 gba:h-4" />
            </Button>
          </div>

          {/* Text Alignment */}
          <div className="gba:flex gba:gap-1">
            <Button
              variant={textElement.textAlign === 'left' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textAlign: 'left' })}
            >
              <AlignLeft className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textAlign === 'center' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textAlign: 'center' })}
            >
              <AlignCenter className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textAlign === 'right' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textAlign: 'right' })}
            >
              <AlignRight className="gba:w-4 gba:h-4" />
            </Button>
          </div>

          {/* Text Color */}
          <ColorPicker
            value={textElement.color}
            onChange={(color) => onUpdate({ color })}
            label="Text Color"
          />

          {/* Background Color */}
          <ColorPicker
            value={textElement.backgroundColor === 'transparent' ? '#ffffff' : textElement.backgroundColor}
            onChange={(color) => onUpdate({ backgroundColor: color })}
            label="Background Color"
          />

          {/* Gradient */}
          <GradientSection
            gradient={textElement.gradient}
            onChange={(gradient) => onUpdate({ gradient })}
          />

          {/* Line Height */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">Line Height</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{textElement.lineHeight}</span>
            </div>
            <Slider
              value={[textElement.lineHeight * 100]}
              min={80}
              max={200}
              step={10}
              onValueChange={([value]) => onUpdate({ lineHeight: value / 100 })}
            />
          </div>

          {/* Letter Spacing */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">Letter Spacing</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{textElement.letterSpacing}px</span>
            </div>
            <Slider
              value={[textElement.letterSpacing]}
              min={-5}
              max={20}
              step={1}
              onValueChange={([value]) => onUpdate({ letterSpacing: value })}
            />
          </div>
        </div>
      )}

      {/* SHAPE PROPERTIES */}
      {shapeElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">Shape Styling</Label>

          {/* Fill Color */}
          <ColorPicker
            value={shapeElement.fill}
            onChange={(fill) => onUpdate({ fill })}
            label="Fill Color"
          />

          {/* Gradient */}
          <GradientSection
            gradient={shapeElement.gradient}
            onChange={(gradient) => onUpdate({ gradient })}
          />

          {/* Stroke Color */}
          <ColorPicker
            value={shapeElement.strokeColor}
            onChange={(strokeColor) => onUpdate({ strokeColor })}
            label="Stroke Color"
          />

          {/* Stroke Width */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">Stroke Width</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{shapeElement.strokeWidth}px</span>
            </div>
            <Slider
              value={[shapeElement.strokeWidth]}
              min={0}
              max={20}
              step={1}
              onValueChange={([value]) => onUpdate({ strokeWidth: value })}
            />
          </div>

          {/* Stroke Style */}
          <div>
            <Label className="gba:text-xs">Stroke Style</Label>
            <Select
              value={shapeElement.strokeStyle}
              onValueChange={(value: 'solid' | 'dashed' | 'dotted') => onUpdate({ strokeStyle: value })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Corner Radius */}
          {(shapeElement.shapeType === 'rectangle' || shapeElement.shapeType === 'rounded-rectangle') && (
            <div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                <Label className="gba:text-xs">Corner Radius</Label>
                <span className="gba:text-xs gba:text-muted-foreground">{shapeElement.cornerRadius}px</span>
              </div>
              <Slider
                value={[shapeElement.cornerRadius]}
                min={0}
                max={50}
                step={1}
                onValueChange={([value]) => onUpdate({ cornerRadius: value })}
              />
            </div>
          )}

          {/* Shadow */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">Drop Shadow</Label>
            <Switch
              checked={shapeElement.shadow}
              onCheckedChange={(shadow) => onUpdate({ shadow })}
            />
          </div>
        </div>
      )}

      {/* IMAGE PROPERTIES */}
      {imageElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">Image Styling</Label>

          {/* Object Fit */}
          <div>
            <Label className="gba:text-xs">Object Fit</Label>
            <Select
              value={imageElement.objectFit}
              onValueChange={(value: 'cover' | 'contain' | 'fill' | 'none') => onUpdate({ objectFit: value })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Border Radius */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">Border Radius</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{imageElement.borderRadius}px</span>
            </div>
            <Slider
              value={[imageElement.borderRadius]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => onUpdate({ borderRadius: value })}
            />
          </div>

          {/* Border Width */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">Border Width</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{imageElement.borderWidth}px</span>
            </div>
            <Slider
              value={[imageElement.borderWidth]}
              min={0}
              max={20}
              step={1}
              onValueChange={([value]) => onUpdate({ borderWidth: value })}
            />
          </div>

          {/* Border Color */}
          <ColorPicker
            value={imageElement.borderColor}
            onChange={(borderColor) => onUpdate({ borderColor })}
            label="Border Color"
          />

          {/* Shadow */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">Drop Shadow</Label>
            <Switch
              checked={imageElement.shadow}
              onCheckedChange={(shadow) => onUpdate({ shadow })}
            />
          </div>
        </div>
      )}

      {/* VIDEO PROPERTIES */}
      {videoElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">Video Styling</Label>

          {/* Object Fit */}
          <div>
            <Label className="gba:text-xs">Object Fit</Label>
            <Select
              value={videoElement.objectFit}
              onValueChange={(value: 'cover' | 'contain' | 'fill') => onUpdate({ objectFit: value })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Playback Options */}
          <div className="gba:space-y-2">
            <Label className="gba:text-xs gba:font-semibold">Playback</Label>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-xs">Autoplay</Label>
              <Switch
                checked={videoElement.autoplay}
                onCheckedChange={(autoplay) => onUpdate({ autoplay })}
              />
            </div>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-xs">Loop</Label>
              <Switch
                checked={videoElement.loop}
                onCheckedChange={(loop) => onUpdate({ loop })}
              />
            </div>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-xs">Muted</Label>
              <Switch
                checked={videoElement.muted}
                onCheckedChange={(muted) => onUpdate({ muted })}
              />
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">Border Radius</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{videoElement.borderRadius}px</span>
            </div>
            <Slider
              value={[videoElement.borderRadius]}
              min={0}
              max={50}
              step={1}
              onValueChange={([value]) => onUpdate({ borderRadius: value })}
            />
          </div>

          {/* Shadow */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">Drop Shadow</Label>
            <Switch
              checked={videoElement.shadow}
              onCheckedChange={(shadow) => onUpdate({ shadow })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyPanel
