import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskExpertBuilder } from './task-expert-builder'

export interface TaskExpertEditorProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  promptId?: string | null
  onSaved: () => void
  onNameLoaded?: (name: string) => void
}

/**
 * TaskExpertEditor - Thin wrapper for backward compatibility
 * Delegates to the new TaskExpertBuilder component
 */
export const TaskExpertEditor: React.FC<TaskExpertEditorProps> = props => {
  return <TaskExpertBuilder {...props} />
}

export default TaskExpertEditor
