import React from 'react';
import { Button, TimelineLayout } from '@newwork/nw-design-system';
import { AppAction } from '@/components/app-action';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { CheckIcon, ClockIcon, XIcon, QuestionIcon } from '@phosphor-icons/react';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';

type ApprovalDemoItem = { 
  id: string | number; 
  title: string; 
  status?: string; 
  date?: string; 
  actor?: string;
  actorEmployee?: {
    id: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  };
};

interface ApprovalSectionProps extends BusinessAppContextProps {
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  demo?: boolean;
  demoApprovals?: ApprovalDemoItem[];
  'data-testid'?: string;
  approvalActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
}

const ApprovalSection: React.FC<ApprovalSectionProps> = ({ accountId, contactId, opportunityId, leadId, accessToken, demo, demoApprovals, approvalActionProps, ...rest }) => {
  const externalContextData = approvalActionProps?.externalContextData
    || (accountId ? { accountId } : contactId ? { contactId } : opportunityId ? { opportunityId } : leadId ? { leadId } : {});

  const demoItems = demo || Object.keys(externalContextData).length === 0;

  return (
    <div data-testid={rest['data-testid'] || 'approval-section'}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--nw-spacing-lg) var(--nw-spacing-xl)'
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 500 }}>Approval Tasks</div>
        <AppAction
          accessToken={accessToken}
          contextsArray={approvalActionProps?.contextsArray}
          externalContextData={externalContextData}
          prefixDataTestId={approvalActionProps?.prefixDataTestId || 'approvals'}
          emptyStateBehavior={approvalActionProps?.emptyStateBehavior || 'enable'}
        >
          <Button data-testid="request-approval-button">Request Approval</Button>
        </AppAction>
      </div>

      <div className="gba:px-6 gba:pb-6">
        {demoItems ? (
          demoApprovals && demoApprovals.length > 0 ? (
            <TimelineLayout
              items={demoApprovals.map((a, idx) => {
                const status = (a.status || '').toLowerCase();
                
                // Determine color and icon based on status
                const getStatusColorAndIcon = (status: string) => {
                  if (status === 'approved' || status === 'success') {
                    return { 
                      color: 'success', 
                      icon: (props: any) => <CheckIcon weight="bold" {...props} />
                    };
                  }
                  if (status === 'pending' || status === 'in progress' || status === 'waiting') {
                    return { 
                      color: 'info', 
                      icon: (props: any) => <ClockIcon weight="bold" {...props} />
                    };
                  }
                  if (status === 'rejected' || status === 'declined' || status === 'failed' || status === 'error') {
                    return { 
                      color: 'destructive', 
                      icon: (props: any) => <XIcon weight="bold" {...props} />
                    };
                  }
                  return { 
                    color: 'warning', 
                    icon: (props: any) => <QuestionIcon weight="bold" {...props} />
                  };
                };
                
                const { color, icon } = getStatusColorAndIcon(status);
                
                // Create clickable actor link if actorEmployee has ID
                const getEmployeeDisplayName = (emp: any) => 
                  emp?.displayName || (emp?.firstName && emp?.lastName ? `${emp.firstName} ${emp.lastName}` : 'Unknown User');
                
                const actorName = a.actorEmployee ? getEmployeeDisplayName(a.actorEmployee) : (a.actor || (a.status ? a.status : undefined));
                const actorId = a.actorEmployee?.id;
                
                return {
                  id: a.id ?? idx,
                  date: a.date,
                  title: a.title,
                  actor: actorName
                    ? actorId
                      ? (
                          <a
                            href={buildPlatformUrl('/platform/employee-record', { employeeId: actorId })}
                            className="gba:underline gba:text-inherit hover:gba:text-primary"
                            data-testid={`approval-actor-link-${actorId}`}
                          >
                            {actorName}
                          </a>
                        )
                      : actorName
                    : undefined,
                  description: '',
                  color,
                  icon,
                } as any;
              })}
              variant="default"
              orientation="vertical"
              datePosition="inline"
            />
          ) : (
            <div className="gba:text-center gba:text-sm gba:text-muted-foreground">No approval tasks</div>
          )
        ) : (
          <div className="gba:text-center gba:text-sm gba:text-muted-foreground">No approval tasks</div>
        )}
      </div>
    </div>
  );
};

export default ApprovalSection;


