import { Task, TaskStatistics, TaskEmployee, TaskReference } from '../types/TaskTypes';

// Mock employees
const mockEmployees: TaskEmployee[] = [
  {
    id: 'js',
    firstName: 'John',
    lastName: 'Smith',
    displayName: 'John Smith',
    department: 'Sales',
    initials: 'JS'
  },
  {
    id: 'sj',
    firstName: 'Sarah',
    lastName: 'Johnson',
    displayName: 'Sarah Johnson',
    department: 'Marketing',
    initials: 'SJ'
  },
  {
    id: 'md',
    firstName: 'Mike',
    lastName: 'Davis',
    displayName: 'Mike Davis',
    department: 'Sales',
    initials: 'MD'
  },
  {
    id: 'lw',
    firstName: 'Lisa',
    lastName: 'Wilson',
    displayName: 'Lisa Wilson',
    department: 'Support',
    initials: 'LW'
  },
  {
    id: 'tb',
    firstName: 'Tom',
    lastName: 'Brown',
    displayName: 'Tom Brown',
    department: 'Sales',
    initials: 'TB'
  }
];

// Mock references
const mockReferences: TaskReference[] = [
  {
    type: 'opportunity',
    id: 'opp-1',
    name: 'Acme Corp - Software License',
    description: 'Software License'
  },
  {
    type: 'account',
    id: 'acc-1',
    name: 'TechStart Solutions'
  },
  {
    type: 'lead',
    id: 'lead-1',
    name: 'John Anderson - Enterprise Lead'
  },
  {
    type: 'opportunity',
    id: 'opp-2',
    name: 'Global Industries - CRM Implementation'
  },
  {
    type: 'contact',
    id: 'contact-1',
    name: 'Sarah Mitchell - Marketing Director'
  }
];

// Mock tasks matching the wireframe
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    name: 'Prepare Q4 Sales Report',
    assignedTo: mockEmployees[0], // John Smith
    type: 'deadline',
    priority: 'high',
    status: 'in_progress',
    reference: mockReferences[0], // Acme Corp - Software License
    dueDate: '2024-12-15',
    createdAt: '2024-12-01',
    updatedAt: '2024-12-10'
  },
  {
    id: 'task-2',
    name: 'Update CRM Customer Data',
    assignedTo: mockEmployees[1], // Sarah Johnson
    type: 'deadline',
    priority: 'medium',
    status: 'pending',
    reference: mockReferences[1], // TechStart Solutions
    dueDate: '2024-12-20',
    createdAt: '2024-12-05',
    updatedAt: '2024-12-10'
  },
  {
    id: 'task-3',
    name: 'Client Follow-up Calls',
    assignedTo: mockEmployees[2], // Mike Davis
    type: 'scheduled',
    priority: 'high',
    status: 'completed',
    reference: mockReferences[2], // John Anderson - Enterprise Lead
    dueDate: '2024-11-30',
    scheduleDate: '2024-11-30',
    createdAt: '2024-11-25',
    updatedAt: '2024-11-30'
  },
  {
    id: 'task-4',
    name: 'Product Demo Preparation',
    assignedTo: mockEmployees[3], // Lisa Wilson
    type: 'scheduled',
    priority: 'urgent',
    status: 'overdue',
    reference: mockReferences[3], // Global Industries - CRM Implementation
    dueDate: '2024-11-25',
    scheduleDate: '2024-11-25',
    createdAt: '2024-11-20',
    updatedAt: '2024-11-25'
  },
  {
    id: 'task-5',
    name: 'Market Research Analysis',
    assignedTo: mockEmployees[4], // Tom Brown
    type: 'deadline',
    priority: 'medium',
    status: 'in_progress',
    reference: mockReferences[4], // Sarah Mitchell - Marketing Director
    dueDate: '2024-12-25',
    createdAt: '2024-12-01',
    updatedAt: '2024-12-10'
  }
];

// Calculate statistics from mock tasks
export const mockStatistics: TaskStatistics = {
  totalTasks: mockTasks.length,
  inProgress: mockTasks.filter(task => task.status === 'in_progress').length,
  completed: mockTasks.filter(task => task.status === 'completed').length,
  overdue: mockTasks.filter(task => task.status === 'overdue').length
}; 