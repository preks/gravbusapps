import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { Spin, Alert, Empty, Timeline, Typography } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { NoteDeletePopup } from '@/common/components/common-relations/popups/note-delete-popup';
// import { startProcess } from '@/common/utils/start-process';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentNotesByAccountId } from '@/common/data/investment/hooks/useInvestmentAccounts';
import type { InvestmentNote } from '@/common/data/investment/types';
// import { useRestClient } from '@/common/network/rest/useRestClient';
// import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';

const { Text } = Typography;

interface NotesSectionProps {
  accountId?: string;
  context: BusinessAppContextProps;
}

type TranslatedNote = InvestmentNote & {
  translatedTitle?: string;
  translatedText?: string;
  isTranslating?: boolean;
};

export const NotesSection: React.FC<NotesSectionProps> = ({ accountId, context }) => {
  const [notes, setNotes] = useState<TranslatedNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalNotesRef = useRef<InvestmentNote[]>([]);
  const { fetchInvestmentNotesByAccountId } = useGetInvestmentNotesByAccountId(context);
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; note?: InvestmentNote }>({ open: false });

  const loadNotes = async () => {
    if (!accountId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const notes = await fetchInvestmentNotesByAccountId(accountId);
      // Sort notes by createdAt in descending order (newest first)
      const sortedNotes = notes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Store original notes for translation reference
      originalNotesRef.current = sortedNotes;
      setNotes(sortedNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [accountId]);

  // Listen for process completion events to refresh notes
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('Notes: Process completion event received:', event.type, event);
        
        // Check for successful completion first
        if (event.detail?.resolution === 'success') {
          console.log('Notes: Process completed successfully, refreshing notes...');
          loadNotes();
          return;
        }
        
        // Also check for specific note creation response
        const response = event.detail?.response;
        console.log('Notes: Event response:', response);
        
        if (response?.investmentNote) {
          console.log('Notes: InvestmentNote detected in response, refreshing notes...');
          loadNotes();
        }
        
        // Also check for different event structure
        if (response?.detail?.resolution === 'success') {
          console.log('Notes: Success in nested response, refreshing notes...');
          loadNotes();
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('Notes: Detected process/task event:', event.type, event);
        handleProcessCompletion(event);
      }
    };

    // Listen to multiple possible event names (comprehensive list from lead-record)
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
      'process-completion'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    // Add universal dispatcher override to catch all events
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('Notes: Custom Event dispatched:', event.type, event);
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    console.log('Notes: Added comprehensive event listeners for process completion');

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      
      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [accountId]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('Notes: Window gained focus, refreshing notes...');
      loadNotes();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [accountId]);

  const handleDeleteNote = (note: InvestmentNote) => {
    setDeletePopup({ open: true, note });
  };

  // Add note handled by AppAction component

  return (
    <div className="gba:notes-content" data-testid="notes-content">
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            className="gba:notes-title" 
            style={{ fontSize: '18px', fontWeight: '500' }}
          >
            Notes
          </div>
        </div>
        <AppAction
          contextsArray={[FlowContextName.investmentNoteCreate]}
          externalContextData={{
            accountId,
            account: accountId,
            investmentNote: { account: accountId }
          }}
          staticFlowData={[]}
          prefixDataTestId="add-note"
          accessToken={context.accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
        >
          <Button 
            variant="default"
            data-testid="add-note-button"
          >
            <PlusCircleOutlined />
            Add Note
          </Button>
        </AppAction>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <Alert
            message="Error Loading Notes"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
            action={
              <Button size="sm" onClick={loadNotes}>
                Retry
              </Button>
            }
          />
        )}

        {!loading && !error && notes.length === 0 && (
          <Empty
            description="No notes yet"
            style={{ padding: '40px 0' }}
            data-testid="empty-notes"
          >
            <AppAction
              contextsArray={[FlowContextName.investmentNoteEntity]}
              externalContextData={{
                accountId,
                account: accountId,
                investmentNote: { account: accountId }
              }}
              staticFlowData={[]}
              prefixDataTestId="add-first-note"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button 
                variant="default"
              >
                <PlusCircleOutlined />
                Add First Note
              </Button>
            </AppAction>
          </Empty>
        )}

        {!loading && !error && notes.length > 0 && (
          <Timeline>
            {notes.map((note, index) => (
              <Timeline.Item key={note.id || index} color="green">
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
                      {note.title}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {dayjs(note.createdAt).format('MMM D, YYYY [at] h:mm A')} - {note.authorDisplayName || 'Unknown'}
                    </Text>
                  </div>
                  <div style={{ marginTop: '4px', color: '#374151' }}>
                    {note.text}
                  </div>
                  <Button 
                    variant="ghost"
                    size="icon"
                    style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: 0,
                      padding: '4px',
                      lineHeight: 1
                    }}
                    onClick={() => handleDeleteNote(note)}
                    data-testid={`delete-note-${note.id}`}
                  >
                    <CloseOutlined />
                  </Button>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </div>

      {deletePopup.open && deletePopup.note && (
        <NoteDeletePopup
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
            originalNotesRef.current = originalNotesRef.current.filter(n => n.id !== id);
            setDeletePopup({ open: false });
          }}
          onError={() => setDeletePopup({ open: false })}
        />
      )}
    </div>
  );
}; 