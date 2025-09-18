import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge
} from '@newwork/nw-design-system';
import { 
  CheckCircle, 
  AlertCircle, 
  Activity
} from 'lucide-react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface FlowStep {
  id: string;
  title: string;
  status: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  completionTimeMinutes?: number;
}

interface WorkflowTabProps {
  flowSteps: FlowStep[];
}

// Modern custom node component for React Flow
const FlowStepNode = ({ data }: { data: any }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'SCHEDULED': return '#f59e0b';
      default: return '#e5e7eb';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="gba:w-5 gba:h-5" />;
      case 'IN_PROGRESS': return <Activity className="gba:w-5 gba:h-5" />;
      case 'SCHEDULED': return <Activity className="gba:w-5 gba:h-5" />;
      default: return <AlertCircle className="gba:w-5 gba:h-5" />;
    }
  };

  return (
    <div className="gba:bg-white gba:rounded-lg gba:border gba:border-gray-200 gba:shadow-sm gba:p-6 gba:min-w-[320px] gba:max-w-[400px]">
      {/* Step Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2">{data.title}</h3>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant="outline" 
                   style={{
                     borderColor: getStatusColor(data.status),
                     color: getStatusColor(data.status)
                   }}>
              {data.status}
            </Badge>
            <Badge variant="secondary">
              {data.assignmentMode}
            </Badge>
          </div>
        </div>
        
        {/* Status Icon */}
        <div style={{ color: getStatusColor(data.status) }}>
          {getStatusIcon(data.status)}
        </div>
      </div>
      
      {/* Step Details */}
      <div className="gba:space-y-3 gba:text-sm">
        {/* Due Date */}
        {data.dueDate && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600">
            <Activity className="gba:w-4 gba:h-4" />
            <span>Due: <span className="gba:font-medium">{new Date(data.dueDate).toLocaleDateString()}</span></span>
          </div>
        )}
        
        {/* Completion Time */}
        {data.completionTimeMinutes && data.completionTimeMinutes > 0 && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-green-600">
            <CheckCircle className="gba:w-4 gba:h-4" />
            <span>Completed in: <span className="gba:font-medium">{formatDuration(data.completionTimeMinutes)}</span></span>
          </div>
        )}
        
        {/* Completion Date */}
        {data.completedAt && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600">
            <CheckCircle className="gba:w-4 gba:h-4" />
            <span>Completed: <span className="gba:font-medium">{new Date(data.completedAt).toLocaleDateString()}</span></span>
          </div>
        )}
      </div>
    </div>
  );
};

// Register the custom node type
const nodeTypes = {
  flowStep: FlowStepNode,
};



// Helper function to format minutes into human-readable time
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
};



export const WorkflowTab: React.FC<WorkflowTabProps> = ({
  flowSteps
}) => {
  // Create React Flow nodes and edges with vertical positioning
  const { nodes, edges } = useMemo(() => {
    const nodeHeight = 250; // Height including spacing between nodes
    const nodes: Node[] = flowSteps.map((step, index) => ({
      id: step.id,
      type: 'flowStep',
      position: { x: 50, y: index * nodeHeight }, // Vertical positioning
      data: step,
    }));

    const edges: Edge[] = flowSteps.slice(0, -1).map((step, index) => ({
      id: `${step.id}-${flowSteps[index + 1].id}`,
      source: step.id,
      target: flowSteps[index + 1].id,
      type: 'straight', // Use straight edges for vertical flow
      style: { 
        strokeWidth: 4, 
        stroke: step.status === 'COMPLETED' ? '#10b981' : '#6b7280'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 25,
        height: 25,
        color: step.status === 'COMPLETED' ? '#10b981' : '#6b7280',
      },
      animated: step.status === 'IN_PROGRESS',
      sourcePosition: 'bottom' as const,
      targetPosition: 'top' as const,
    }));

    return { nodes, edges };
  }, [flowSteps]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  React.useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div className="gba:mt-0">
      {/* ReactFlow with Vertical Layout */}
      <Card className="gba:h-[800px]">
        <CardHeader>
          <CardTitle className="gba:text-base">Flow Definition</CardTitle>
        </CardHeader>
        <CardContent className="gba:h-full gba:p-0">
          <div className="gba:h-full">
            <ReactFlow
              nodes={nodesState}
              edges={edgesState}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Strict}
              fitView
              fitViewOptions={{
                padding: 0.2,
                minZoom: 0.5,
                maxZoom: 1.5,
              }}
              className="gba:bg-gray-50"
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
            >
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};