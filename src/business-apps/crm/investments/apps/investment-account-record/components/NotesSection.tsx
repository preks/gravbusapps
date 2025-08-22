import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, UserOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { Button, Spin, Alert, Empty, Timeline, Typography, message, Modal } from 'antd';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentNotesByAccountId } from '@/common/data/investment/hooks/useInvestmentAccounts';
import type { InvestmentNote } from '@/common/data/investment/types';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';

const { Text } = Typography;

interface NotesSectionProps {
  accountId?: string;
  context: BusinessAppContextProps;
}

interface TranslatedNote extends InvestmentNote {
  translatedTitle?: string;
  translatedText?: string;
  isTranslating?: boolean;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ accountId, context }) => {
  const [notes, setNotes] = useState<TranslatedNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalNotesRef = useRef<InvestmentNote[]>([]);
  const { fetchInvestmentNotesByAccountId } = useGetInvestmentNotesByAccountId(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

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
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the note "${note.noteTitle}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/investments/saveInvestmentNote', {
            changeMode: "DELETE",
            investmentNote: {
              id: note.id,
              version: note.version,
              account: accountId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          
          // Remove the note from both states
          setNotes(prevNotes => 
            prevNotes.filter(n => n.id !== note.id)
          );
          
          // Also remove from original notes ref
          originalNotesRef.current = originalNotesRef.current.filter(n => n.id !== note.id);
          
          message.success('Note deleted successfully');
        } catch (error) {
          console.error('Error deleting note:', error);
          message.error('Failed to delete note');
        }
      },
    });
  };

  const handleAddNote = () => {
    if (accountId) {
      startProcess({
        domain: 'investments',
        processName: 'saveInvestmentNote',
        payload: {
          accountId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

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
        <Button 
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={handleAddNote}
          data-testid="add-note-button"
        >
          Add Note
        </Button>
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
              <Button size="small" onClick={loadNotes}>
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
            <Button 
              type="primary" 
              icon={<PlusCircleOutlined />} 
              onClick={handleAddNote}
            >
              Add First Note
            </Button>
          </Empty>
        )}

        {!loading && !error && notes.length > 0 && (
          <Timeline>
            {notes.map((note, index) => (
              <Timeline.Item key={note.id || index} color="green">
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
                      {note.noteTitle}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {dayjs(note.createdAt).format('MMM D, YYYY [at] h:mm A')} - {note.authorDisplayName || 'Unknown'}
                    </Text>
                  </div>
                  <div style={{ marginTop: '4px', color: '#374151' }}>
                    {note.noteText}
                  </div>
                  <Button 
                    type="text" 
                    icon={<CloseOutlined />} 
                    size="small"
                    style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: 0,
                      padding: '4px',
                      lineHeight: 1
                    }}
                    onClick={() => handleDeleteNote(note)}
                    data-testid={`delete-note-${note.id}`}
                  />
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </div>
    </div>
  );
}; 