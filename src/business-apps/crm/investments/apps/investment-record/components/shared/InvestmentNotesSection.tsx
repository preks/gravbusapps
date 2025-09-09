import React, { useState, useEffect } from 'react';
import { Spin, Alert, Button, Timeline, Typography, message } from 'antd';
import { PlusCircleOutlined, CloseOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { formatDate } from '@/common/data/investment';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { NoteDeletionPopup } from '@/common/components';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { useGetInvestmentNotesByInvestmentId } from '../../hooks/useInvestmentNotesByInvestmentId';
import type { InvestmentNote } from '@/common/data/investment/types';

const { Text } = Typography;

interface InvestmentNotesSectionProps {
  investmentId?: string;
  context: BusinessAppContextProps;
  showHeader?: boolean;
}

// Use the actual investment note type
type SimpleNoteData = InvestmentNote;

export const InvestmentNotesSection: React.FC<InvestmentNotesSectionProps> = ({ investmentId, context, showHeader = true }) => {
  const [notes, setNotes] = useState<SimpleNoteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; note?: SimpleNoteData }>({ open: false });
  
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  const { fetchInvestmentNotesByInvestmentId } = useGetInvestmentNotesByInvestmentId(context);

  const loadNotes = async () => {
    if (!investmentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const notesData = await fetchInvestmentNotesByInvestmentId(investmentId);
      setNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [investmentId]);

  // Listen for process completion events to refresh notes
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadNotes();
          return;
        }
        
        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success') {
          loadNotes();
        }
      } catch (err) {
        console.error('Error handling process completion in NotesSection:', err);
      }
    };

    // Listen to multiple possible event names for note updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion',
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [investmentId]);

  // Use central formatDate function with custom format for notes
  const formatNoteDate = (dateString: string | null | undefined): string => {
    return formatDate(dateString, 'DD.MM.YYYY HH:mm', 'N/A');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spin size="large" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="Error Loading Notes"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadNotes}>
              Retry
            </Button>
          }
          style={{ margin: '16px 0' }}
        />
      );
    }

    if (notes.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          <EditOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No notes found</p>
          <p style={{ fontSize: '14px' }}>Notes related to this investment will appear here</p>
        </div>
      );
    }

    return (
      <Timeline mode="left" style={{ marginTop: '16px' }}>
        {notes.map((note) => (
          <Timeline.Item
            key={note.id}
            dot={<EditOutlined />}
            color="blue"
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '14px' }}>
                    {note.title || 'Untitled Note'}
                  </h4>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatNoteDate(note.createdAt)} • {getEmployeeDisplayName(note.authorEmployee?.id)}
                  </Text>
                  {note.reminderDate && (
                    <Text type="warning" style={{ fontSize: '12px', marginLeft: '16px' }}>
                      Reminder: {formatNoteDate(note.reminderDate)}
                    </Text>
                  )}
                </div>
                <div>
                <AppAction
                  contextsArray={[FlowContextName.investmentNoteEntity]}
                  externalContextData={{
                    investmentId,
                    investment: investmentId,
                    noteId: note.id,
                    investmentNote: { investment: investmentId },
                  }}
                  prefixDataTestId={`investment-note-edit-${note.id}`}
                  accessToken={context.accessToken}
                  emptyStateBehavior="enable"
                  deferMainContextRequestsUntilClick
                >
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    style={{ marginLeft: '8px' }}
                    data-testid={`edit-note-${note.id}`}
                  />
                </AppAction>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => setDeletePopup({ open: true, note })}
                  style={{ marginLeft: '8px' }}
                  data-testid={`delete-note-${note.id}`}
                />
                </div>
              </div>
              {note.text && (
                <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                  {note.text}
                </p>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  return (
    <div data-testid="investment-notes-section">
      {showHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Notes ({notes.length})
          </h3>
          <AppAction
            contextsArray={[FlowContextName.investmentNoteEntity]}
            externalContextData={{
              investmentId,
              investment: investmentId,
              investmentNote: { investment: investmentId },
            }}
            staticFlowData={investmentId ? [{
              key: 'create-investment-note-fallback',
              label: 'Add Note',
              onClick: () => startProcess({
                domain: 'investments',
                processName: 'createInvestmentNote',
                payload: { investmentId },
                builderType: 'NATIVE_SCREEN',
              })
            }] : []}
            prefixDataTestId="add-note"
            accessToken={context.accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          >
            <Button
              size="small"
              icon={<PlusCircleOutlined />}
              data-testid="investment-create-note-button"
            >
              Add Note
            </Button>
          </AppAction>
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {/* Flow-driven create/edit via AppAction; no local modal */}

      {deletePopup.open && deletePopup.note && (
        <NoteDeletionPopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          noteId={deletePopup.note.id}
          noteVersion={deletePopup.note.version}
          noteTitle={deletePopup.note.title || 'Untitled Note'}
          domain="investments"
          onSuccess={() => {
            const id = deletePopup.note!.id;
            setNotes(prev => prev.filter(n => n.id !== id));
            setDeletePopup({ open: false });
          }}
          onError={() => setDeletePopup({ open: false })}
        />
      )}
    </div>
  );
};

export default InvestmentNotesSection;
