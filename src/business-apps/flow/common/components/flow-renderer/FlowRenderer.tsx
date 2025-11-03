import React, { useMemo } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { GripVertical, UserCheck, UserPlus } from 'lucide-react'

import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
  Handle,
  Position,
  OnConnect,
  addEdge
} from 'reactflow'
import 'reactflow/dist/style.css'
import { FlowStep } from '@/business-apps/flow/apps/creator/types/flowTemplate'

export interface FlowRendererProps {
  steps: FlowStep[]
  selectedStepIndex?: number | null
  onSelectStep?: (index: number) => void
  onReorderSteps?: (fromIndex: number, toIndex: number) => void
  mode?: 'view' | 'edit'
  'data-testid'?: string
}

// Custom node component for React Flow
const StepNode = ({ data }: { data: any }) => {
  const [isDragOver, setIsDragOver] = React.useState(false)

  const getSelectionBgClass = (selected: boolean) => {
    return selected ? 'gba:bg-blue-50 gba:border-blue-500' : 'gba:bg-gray-50 gba:border-gray-300'
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation() // Prevent React Flow from handling this
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('stepIndex', data.index.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent React Flow from handling this
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent React Flow from handling this
    setIsDragOver(false)
    const fromIndex = Number.parseInt(e.dataTransfer.getData('stepIndex'), 10)
    if (fromIndex !== data.index && data.onReorder) {
      data.onReorder(fromIndex, data.index)
    }
  }

  return (
    <button
      type="button"
      draggable={data.mode === 'edit'}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`nopan nodrag gba:border-2 gba:rounded-lg gba:p-3 gba:w-[240px] gba:h-[130px] gba:transition-all gba:duration-200 gba:shadow-sm gba:cursor-pointer ${getSelectionBgClass(data.selected)} ${
        data.selected ? 'gba:shadow-md gba:scale-105' : ''
      } ${isDragOver ? 'gba:opacity-50 gba:border-blue-400 gba:bg-blue-100' : ''}`}
      onClick={() => data?.onSelect?.(data.index)}
    >
      {/* Properly positioned handles for center connections */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          visibility: 'hidden',
          width: 10,
          height: 10,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          visibility: 'hidden',
          width: 10,
          height: 10,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />

      {/* Type Badge Header with Drag Handle */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          {data.mode === 'edit' && (
            <GripVertical className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-grab active:gba:cursor-grabbing" />
          )}
          <Badge
            variant="outline"
            className={`gba:text-xs gba:border-0 ${
              data.selected ? 'gba:bg-blue-500 gba:text-white' : 'gba:bg-gray-400 gba:text-white'
            }`}
          >
            {data.type}
          </Badge>
        </div>
        {/* Assignment Mode Badge - Aligned Right */}
        {data.assignmentMode && (
          <Badge
            variant="outline"
            className={`gba:text-xs gba:flex gba:items-center gba:gap-1 ${
              data.assignmentMode === 'ASSIGN'
                ? 'gba:bg-green-100 gba:text-green-700 gba:border-green-300'
                : 'gba:bg-purple-100 gba:text-purple-700 gba:border-purple-300'
            }`}
          >
            {data.assignmentMode === 'ASSIGN' ? (
              <>
                <UserPlus className="gba:h-3 gba:w-3" />
                Assign
              </>
            ) : (
              <>
                <UserCheck className="gba:h-3 gba:w-3" />
                Claim
              </>
            )}
          </Badge>
        )}
      </div>

      {/* Step Title - Single line with ellipsis */}
      <div className="gba:font-semibold gba:text-base gba:mb-1 gba:line-clamp-1 gba:text-gray-900">
        {data.title || `Step ${data.index + 1}`}
      </div>

      {/* Step Message - Single line with ellipsis */}
      {data.message && (
        <div className="gba:text-sm gba:text-gray-600 gba:line-clamp-1 gba:leading-relaxed">{data.message}</div>
      )}

      {/* Step Number */}
      <div
        className="gba:absolute gba:-top-2 gba:-left-2 gba:w-6 gba:h-6 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold gba:text-white"
        style={{
          backgroundColor: data.selected ? '#3b82f6' : '#6b7280'
        }}
      >
        {data.index + 1}
      </div>
    </button>
  )
}

export const FlowRenderer: React.FC<FlowRendererProps> = ({
  steps,
  selectedStepIndex = null,
  onSelectStep,
  onReorderSteps,
  mode = 'view',
  'data-testid': testId = 'flow-renderer'
}) => {
  // Convert steps to React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = steps.map((step, index) => ({
      id: `step-${index}`,
      type: 'default',
      position: { x: 20, y: index * 150 + 20 },
      data: {
        title: step.title,
        type: step.type || 'USER_TASK',
        message: step.message,
        assignmentMode: step.assignment?.assignmentMode,
        index,
        selected: selectedStepIndex === index,
        onSelect: (idx: number) => onSelectStep?.(idx),
        onReorder: onReorderSteps,
        mode
      },
      style: {
        background: 'transparent',
        border: 'none',
        padding: 0,
        width: 240,
        height: 130
      }
    }))

    const edges: Edge[] = steps.slice(0, -1).map((_, index) => ({
      id: `edge-${index}`,
      source: `step-${index}`,
      target: `step-${index + 1}`,
      type: 'straight',
      animated: false,
      style: {
        stroke: '#6b7280',
        strokeWidth: 2
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6b7280'
      }
    }))
    return { nodes, edges }
  }, [steps, selectedStepIndex, onSelectStep, onReorderSteps, mode])

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes)
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges)

  React.useEffect(() => {
    setNodes(nodes)
    setEdges(edges)
  }, [nodes, edges, setNodes, setEdges])

  // Custom node types - memoized to prevent React Flow warning
  const nodeTypes = React.useMemo(
    () => ({
      default: StepNode
    }),
    []
  )

  const onConnect: OnConnect = React.useCallback(
    connection => {
      if (mode !== 'edit') return
      setEdges(eds =>
        addEdge(
          {
            ...connection,
            type: 'straight',
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' }
          },
          eds
        )
      )
    },
    [mode, setEdges]
  )

  return (
    <div
      className="gba:h-full gba:w-full gba:border gba:rounded-lg gba:overflow-hidden gba:bg-gray-50"
      data-testid={testId}
    >
      <div className="gba:h-full gba:w-full">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Strict}
          fitViewOptions={{
            padding: 0.2,
            includeHiddenNodes: false,
            minZoom: 0.3,
            maxZoom: 1.2
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={mode === 'edit'}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          onNodeClick={(_, node) => {
            const idx = Number(node.id.replace('step-', ''))
            onSelectStep?.(idx)
          }}
        >
          <Background color="var(--color-border-default)" gap={16} size={1} />
          <Controls
            showZoom={true}
            showFitView={true}
            showInteractive={false}
            style={{
              backgroundColor: 'var(--color-surface-primary)',
              border: `1px solid var(--color-border-default)`,
              borderRadius: 'var(--border-radius-md)'
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
