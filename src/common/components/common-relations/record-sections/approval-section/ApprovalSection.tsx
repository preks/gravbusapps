import React from 'react';
import { Button, TimelineLayout } from '@newwork/nw-design-system';
import { AppAction } from '@/components/app-action';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

type ApprovalDemoItem = { id: string | number; title: string; status?: string; date?: string; actor?: string };

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
              size="sm"
              items={demoApprovals.map((a, idx) => {
                const status = (a.status || '').toLowerCase();
                const color = status === 'approved' || status === 'success' ? 'success'
                  : status === 'pending' || status === 'in progress' || status === 'waiting' ? 'pending'
                  : status === 'rejected' || status === 'declined' || status === 'failed' || status === 'error' ? 'error'
                  : undefined;
                return {
                  id: a.id ?? idx,
                  date: a.date,
                  title: a.title,
                  actor: a.actor || (a.status ? a.status : undefined),
                  description: '',
                  color,
                } as any;
              })}
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


