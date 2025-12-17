import { ProjectArea } from '../types'
import { KanbanIcon, ListBulletsIcon } from '@phosphor-icons/react'

export const projectAreas: ProjectArea[] = [
  {
    id: 'project-setup',
    title: 'Project Setup',
    description: 'Create and manage project configurations, types, and basic project information',
    icon: ListBulletsIcon,
    category: 'setup',
    buttonLabel: 'Manage Projects'
  },
  {
    id: 'project-allocation',
    title: 'Project Allocation',
    description: 'Assign team members, allocate resources, and manage project assignments',
    icon: KanbanIcon,
    category: 'allocation',
    buttonLabel: 'View Allocations'
  }
]

export const categoryLabels: Record<string, string> = {
  setup: 'Project Configuration',
  allocation: 'Resource Management',
  management: 'Project Management'
}

export const getProjectAreasByCategory = (category: string): ProjectArea[] => {
  return projectAreas.filter(area => area.category === category)
}
