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
  type: 'deadline' | 'scheduled';
  priority: 'high' | 'medium' | 'urgent' | 'low';
  status: 'in_progress' | 'pending' | 'completed' | 'overdue';
  reference: TaskReference;
  dueDate: string;
  scheduleDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStatistics {
  totalTasks: number;
  inProgress: number;
  completed: number;
  overdue: number;
} 