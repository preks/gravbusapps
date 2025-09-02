export interface GuardianNode {
  id: string;
  type: 'user' | 'department' | 'company' | 'location' | 'capability' | 'workflow' | 'task';
  label: string;
  data: {
    // Common properties
    name?: string;
    description?: string;
    status?: 'active' | 'inactive' | 'completed' | 'in-progress' | 'pending';
    
    // User-specific
    email?: string;
    role?: string;
    managerId?: string;
    
    // Organizational properties
    organizationalUnits?: string[];
    matrixTeams?: string[];
    companies?: string[];
    siteLocations?: string[];
    costCenters?: string[];
    capabilities?: string[];
    
    // Workflow-specific
    workflowId?: string;
    templateName?: string;
    templateId?: string;
    currentStep?: number;
    totalSteps?: number;
    initiator?: string;
    
    // Task-specific
    taskId?: string;
    assignmentMode?: 'CLAIM' | 'ASSIGN';
    dueDate?: string;
    completedAt?: string;
    assignedTo?: string[];
    
    // Statistics
    activeTaskCount?: number;
    completedTaskCount?: number;
    workflowCount?: number;
    
    // Visual properties
    size?: number;
    color?: string;
    opacity?: number;
    // Governance/quality halo (0..1) - higher means better adherence
    halo?: number;
  };
  position: { x: number; y: number };
  style?: React.CSSProperties;
}

export interface GuardianEdge {
  id: string;
  source: string;
  target: string;
  type: 'assignment' | 'reporting' | 'workflow-flow' | 'dependency' | 'capability' | 'location';
  data: {
    // Relationship properties
    relationshipType?: string;
    weight?: number; // For animation intensity and line thickness
    direction?: 'unidirectional' | 'bidirectional';
    
    // Assignment-specific
    assignmentMode?: 'CLAIM' | 'ASSIGN';
    allowReassignment?: boolean;
    
    // Workflow-specific
    workflowId?: string;
    stepIndex?: number;
    taskId?: string;
    
    // Status and timing
    status?: 'active' | 'completed' | 'pending' | 'scheduled';
    createdAt?: string;
    completedAt?: string;
    dueDate?: string;
    
    // Animation properties
    animationDuration?: number;
    animationDelay?: number;
    flowDirection?: 'forward' | 'backward' | 'bidirectional';
    
    // Visual properties
    color?: string;
    strokeWidth?: number;
    dashArray?: string;
    // Latency metrics for coloring/bucketing
    latencyMinutes?: number;
    latencyBucket?: 'fast' | 'normal' | 'slow' | 'very-slow' | 'pending';
  };
  animated?: boolean;
  style?: React.CSSProperties;
}

export interface GuardianNetworkData {
  nodes: GuardianNode[];
  edges: GuardianEdge[];
  metadata: {
    totalWorkflows: number;
    activeWorkflows: number;
    totalUsers: number;
    totalDepartments: number;
    lastUpdated: string;
    viewMode: GuardianViewMode;
  };
}

export type GuardianViewMode = 
  | 'sankey'           // Sankey diagram: workflow flow through departments/steps
  | 'force-directed'   // Force-directed network: relationships and clustering
  | 'hierarchical'     // Hierarchical tree: organizational structure
  | 'chord'           // Chord diagram: department interactions
  | 'geographic'       // Geographic distribution and location-based routing
  | 'realtime'        // Real-time activity heatmap
  | 'timeline';        // Timeline view: audit log chronological visualization

export interface GuardianFilter {
  // Entity filters
  showActiveWorkflows: boolean;
  showCompleted: boolean;
  showDepartments: boolean;
  showUsers: boolean;
  showCapabilities: boolean;
  showLocations: boolean;
  
  // Status filters
  workflowStatuses: Array<'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'QUEUED'>;
  
  // Time-based filters
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | 'all';
  
  // Specific entity filters
  selectedDepartments: string[];
  selectedWorkflowTemplates: string[];
  selectedUsers: string[];
  
  // Visual filters
  minNodeSize: number;
  maxNodeSize: number;
  showLabels: boolean;
  showAnimations: boolean;
  showDensityTrails?: boolean;
  
  // Advanced filters
  assignmentModes: Array<'CLAIM' | 'ASSIGN'>;
  taskStatuses: string[];
}

export interface GuardianStatistics {
  overview: {
    totalWorkflows: number;
    activeWorkflows: number;
    completedToday: number;
    averageCompletionTime: number;
  };
  
  organizational: {
    totalUsers: number;
    activeDepartments: number;
    topBusiestDepartments: Array<{
      id: string;
      name: string;
      activeTaskCount: number;
      completionRate: number;
    }>;
  };
  
  workflow: {
    topTemplates: Array<{
      templateId: string;
      name: string;
      activeCount: number;
      completionRate: number;
    }>;
    averageStepsPerWorkflow: number;
    bottleneckSteps: Array<{
      stepTitle: string;
      averageTimeInStep: number;
      templateName: string;
    }>;
  };
  
  realtime: {
    tasksCompletedLast24h: number;
    currentlyActive: number;
    peakHours: Array<{
      hour: number;
      taskCount: number;
    }>;
  };
}

export interface GuardianDataHookParams {
  accessToken: string;
  viewMode: GuardianViewMode;
  filters: GuardianFilter;
  isRealTime: boolean;
  refreshInterval?: number; // milliseconds
  userId?: string;
}

export interface GuardianDataHookResult {
  networkData: GuardianNetworkData | null;
  statistics: GuardianStatistics | null;
  auditData?: any;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Layout algorithms for different view modes
export type GuardianLayoutAlgorithm = 
  | 'hierarchical'     // Top-down hierarchy for organizational view
  | 'force-directed'   // Force-directed layout for workflow view
  | 'circular'         // Circular layout for capability networks
  | 'geographic'       // Geographic positioning
  | 'timeline';        // Time-based linear layout

export interface GuardianLayoutConfig {
  algorithm: GuardianLayoutAlgorithm;
  spacing: {
    nodeSpacing: number;
    levelSpacing: number;
    clusterSpacing: number;
  };
  forces: {
    repulsion: number;
    attraction: number;
    gravity: number;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

// Animation configuration for flow visualization
export interface GuardianAnimationConfig {
  speed: number; // 0.1 to 3.0 multiplier
  showFlowDirection: boolean;
  particleCount: number;
  particleSize: number;
  trailLength: number;
  pulseEffect: boolean;
  colorMode: 'status' | 'department' | 'workflow' | 'assignment';
}

// Real-time event types for live updates
export interface GuardianRealtimeEvent {
  type: 'task_assigned' | 'task_completed' | 'workflow_started' | 'workflow_completed' | 'user_joined' | 'user_left';
  timestamp: string;
  data: {
    taskId?: string;
    workflowId?: string;
    userId?: string;
    fromStep?: number;
    toStep?: number;
    assignmentChange?: {
      from: string[];
      to: string[];
    };
  };
}
