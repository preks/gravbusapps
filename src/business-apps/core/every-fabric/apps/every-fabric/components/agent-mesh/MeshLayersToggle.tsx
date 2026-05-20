import { Checkbox } from '@newwork/nw-design-system'
import { MESH_LAYERS, type MeshLayerKey } from './meshLayers'

interface MeshLayersToggleProps {
  activeLayers: ReadonlySet<MeshLayerKey>
  countsByLayer: Record<MeshLayerKey, number>
  showLabels: boolean
  mergeNodes: boolean
  onToggleLayer: (layer: MeshLayerKey) => void
  onToggleLabels: () => void
  onToggleMerge: () => void
}

interface LayerRowProps {
  id: string
  label: string
  count?: number
  checked: boolean
  testId: string
  onChange: () => void
}

const LayerRow: React.FC<LayerRowProps> = ({ id, label, count, checked, testId, onChange }) => {
  return (
    <label
      htmlFor={id}
      className="gba:flex gba:cursor-pointer gba:items-center gba:gap-2 gba:rounded-md gba:px-1.5 gba:py-1 gba:text-[12px] gba:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
      data-testid={testId}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <span className="gba:flex-1 gba:truncate">{label}</span>
      {typeof count === 'number' && (
        <span className="gba:inline-flex gba:items-center gba:justify-center gba:min-w-[18px] gba:h-[16px] gba:px-1 gba:rounded-full gba:bg-muted gba:text-[10px] gba:font-semibold gba:text-muted-foreground">
          {count}
        </span>
      )}
    </label>
  )
}

export const MeshLayersToggle: React.FC<MeshLayersToggleProps> = ({
  activeLayers,
  countsByLayer,
  showLabels,
  mergeNodes,
  onToggleLayer,
  onToggleLabels,
  onToggleMerge
}) => {
  return (
    <div
      className="gba:w-[180px] gba:rounded-[1rem] gba:border gba:border-border/60 gba:bg-card/95 gba:backdrop-blur gba:px-2.5 gba:py-2.5 gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-14px_rgba(15,23,42,0.18)]"
      data-testid="mesh-layers-toggle"
      role="group"
      aria-label="Mesh layers"
    >
      <p className="gba:px-1.5 gba:pb-1 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground">
        Layers
      </p>
      <div className="gba:flex gba:flex-col gba:gap-0.5">
        {MESH_LAYERS.map(layer => (
          <LayerRow
            key={layer.key}
            id={`mesh-layer-${layer.key}`}
            label={layer.label}
            count={countsByLayer[layer.key] ?? 0}
            checked={activeLayers.has(layer.key)}
            testId={`mesh-layers-toggle-${layer.key}`}
            onChange={() => onToggleLayer(layer.key)}
          />
        ))}
        <div className="gba:my-1 gba:h-px gba:bg-border/50" aria-hidden />
        <LayerRow
          id="mesh-layer-labels"
          label="Edge labels"
          checked={showLabels}
          testId="mesh-layers-toggle-labels"
          onChange={onToggleLabels}
        />
        <LayerRow
          id="mesh-layer-merge"
          label="Compact edges"
          checked={mergeNodes}
          testId="mesh-layers-toggle-merge"
          onChange={onToggleMerge}
        />
      </div>
    </div>
  )
}
