import React from 'react';
import { Button, TimelineLayout } from '@newwork/nw-design-system';
import { PlusCircleOutlined } from '@ant-design/icons';
import { AppAction } from '@/components/app-action';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';

type TaskDemoItem = {
  id: string;
  title: string;
  due?: string;
  assignee?: string;
  statusCode?: 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED';
};

interface TaskSectionProps extends BusinessAppContextProps {
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  demo?: boolean;
  demoTasks?: TaskDemoItem[];
  'data-testid'?: string;
}

const TaskSection: React.FC<TaskSectionProps> = ({ accessToken, accountId, contactId, opportunityId, leadId, demo, demoTasks }) => {
  const entityContext = accountId ? FlowContextName.customerAccountEntity
    : contactId ? FlowContextName.customerAccountEntity
    : opportunityId ? FlowContextName.customerOpportunityEntity
    : leadId ? FlowContextName.customerLeadEntity
    : FlowContextName.customerAccountEntity;

  const externalContextData = accountId ? { accountId } : contactId ? { contactId } : opportunityId ? { opportunityId } : leadId ? { leadId } : {};

  if (demo || !entityContext || Object.keys(externalContextData).length === 0) {
    return (
      <div data-testid="task-section">
        <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:pt-6 gba:pb-4">
          <div className="gba:text-[18px] gba:font-medium">Tasks</div>
          <AppAction
            accessToken={accessToken}
            contextsArray={[FlowContextName.createCustomerTask]}
            externalContextData={externalContextData}
            prefixDataTestId="tasks"
            emptyStateBehavior="enable"
          >
            <Button data-testid="add-task-button">
              <span className="gba:flex gba:items-center gba:gap-2"><PlusCircleOutlined /> Add Task</span>
            </Button>
          </AppAction>
        </div>
        <div className="gba:px-6 gba:pb-6">
          {demoTasks && demoTasks.length > 0 ? (
            <TimelineLayout
              className="gba:w-full"
              size="sm"
              items={demoTasks.map((t, idx) => {
                const due = t.due ? (dayjs(t.due).isValid() ? dayjs(t.due).format('MMM D, YYYY [at] h:mm A') : t.due) : '';
                const descParts: string[] = [];
                if (due) descParts.push(`Due ${due}`);
                const code = t.statusCode;
                const color = code === 'COMPLETED' ? 'success'
                  : code === 'OVERDUE' ? 'error'
                  : code === 'PENDING' || code === 'IN_PROGRESS' ? 'pending'
                  : undefined;
                return {
                  id: idx,
                  date: due,
                  title: t.title,
                  actor: t.assignee,
                  description: descParts.join(' • '),
                  color,
                } as any;
              })}
            />
          ) : (
            <div className="gba:text-center">No tasks yet. Create your first task.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="task-section">
      <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:pt-6 gba:pb-4">
        <div className="gba:text-[18px] gba:font-medium">Tasks</div>
        <AppAction
          accessToken={accessToken}
          contextsArray={[FlowContextName.createCustomerTask]}
          externalContextData={externalContextData}
          prefixDataTestId="tasks"
          emptyStateBehavior="enable"
        >
          <Button data-testid="add-task-button">
            <span className="gba:flex gba:items-center gba:gap-2"><PlusCircleOutlined /> Add Task</span>
          </Button>
        </AppAction>
      </div>
      <div className="gba:px-6 gba:pb-6">
        <div className="gba:text-center gba:text-sm gba:text-muted-foreground">No tasks yet. Create your first task.</div>
      </div>
    </div>
  );
};

export default TaskSection;


