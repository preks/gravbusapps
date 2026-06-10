import React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@newwork/nw-design-system'
import { TaskDetailContent } from '@/business-apps/core/every/apps/every-box'
import type { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

const TEST_ID = 'digital-workplace-task-dialog'

export interface EveryBoxTaskDialogProps {
  open: boolean
  task: UnifiedTask | null
  context: BusinessAppContextProps
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
}

/**
 * Opens a single EveryBox task inline so the user can execute it without leaving
 * the Digital Workplace. We reuse EveryBox's own `TaskDetailContent` dispatcher,
 * which renders the right UI for every task type — generic cFlow forms, native
 * remote/Lowcoder process screens and Kogito tasks — along with their claim /
 * complete / reject actions. The scroll container keeps the `px-6` gutter the
 * task header/footer expect for their edge-to-edge sticky layout.
 */
const EveryBoxTaskDialog: React.FC<EveryBoxTaskDialogProps> = ({
  open,
  task,
  context,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => (
  <Dialog open={open} onOpenChange={value => !value && onClose()}>
    <DialogContent
      showCloseButton={false}
      className="gba:flex gba:max-h-[88vh] gba:w-full gba:max-w-3xl gba:flex-col gba:overflow-hidden gba:p-0"
      data-testid={`${TEST_ID}-content`}
    >
      <DialogTitle className="gba:sr-only">{task?.title || task?.name || 'Task'}</DialogTitle>
      <div className="gba:min-h-0 gba:flex-1 gba:overflow-auto gba:px-6 gba:py-4">
        {task ? (
          <TaskDetailContent
            task={task}
            onClose={onClose}
            onTaskUpdated={onTaskUpdated}
            onTaskCompleted={onTaskCompleted}
            accessToken={context.accessToken}
            userId={context.userInfo?.id}
            userInfo={context.userInfo}
            showActions
          />
        ) : null}
      </div>
    </DialogContent>
  </Dialog>
)

export default EveryBoxTaskDialog
export { EveryBoxTaskDialog }
