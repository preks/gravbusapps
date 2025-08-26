export interface TaskEmployee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  avatar?: string;
  initials: string;
}

export interface TaskReference {
  type: 'opportunity' | 'account' | 'lead' | 'contact';
  id: string;
  name: string;
  description?: string;
}

export interface Task {
  id: string;
  name: string;
  assignedTo: TaskEmployee;
  type: string;
  priority: 'high' | 'medium' | 'urgent' | 'low';
  status: 'in_progress' | 'pending' | 'completed' | 'overdue';
  reference: TaskReference;
  dueDate: string;
  scheduleDate?: string;
  timingType?: 'DEADLINE' | 'SCHEDULED' | 'UNKNOWN_TIMING_TYPE';
  createdAt: string;
  updatedAt: string;
  version?: number;
  rawSalesTask?: any;
}

export interface TaskStatisticItem {
  value: number;
  previousValue?: number;
  growth?: number;
  growthDirection?: 'up' | 'down' | 'stable';
}

export interface TaskStatistics {
  totalTasks: TaskStatisticItem;
  inProgress: TaskStatisticItem;
  completed: TaskStatisticItem;
  overdue: TaskStatisticItem;
}

