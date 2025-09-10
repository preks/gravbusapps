import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { Spin, Alert, Empty, Timeline, Typography, message } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { NoteDeletionPopup } from '@/common/components';
import { startProcess } from '@/common/utils/start-process';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentNotesByContactId } from '@/common/data/investment/hooks/useInvestmentContacts';
import type { InvestmentNote } from '@/common/data/investment/types';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
// import { useRestClient } from '@/common/network/rest/useRestClient';
// import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { LanguageDropdown } from './LanguageDropdown';
import { translateMultipleTexts } from '../utils/translationService';

const { Text } = Typography;

interface NotesSectionProps {
  contactId?: string;
  context: BusinessAppContextProps;
}

interface TranslatedNote extends InvestmentNote {
  translatedTitle?: string;
  translatedText?: string;
  isTranslating?: boolean;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ contactId, context }) => {
  const [notes, setNotes] = useState<TranslatedNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('Original');
  const [translating, setTranslating] = useState(false);
  const originalNotesRef = useRef<InvestmentNote[]>([]);
  const { fetchInvestmentNotesByContactId } = useGetInvestmentNotesByContactId(context);
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  // const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; note?: InvestmentNote }>({ open: false });

  const loadNotes = async () => {
    if (!contactId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestmentNotesByContactId(contactId);
      const sortedNotes = (result || []).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
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
  }, [contactId]);

  useEffect(() => {
    const translateNotes = async () => {
      const originalNotes = originalNotesRef.current;
      
      if (selectedLanguage === 'Original' || originalNotes.length === 0) {
        setNotes(originalNotes);
        return;
      }

      setTranslating(true);
      
      try {
        const textsToTranslate: string[] = [];
        const noteMapping: Array<{ noteIndex: number, titleIndex: number, textIndex: number }> = [];
        
        originalNotes.forEach((note, noteIndex) => {
          const titleIndex = textsToTranslate.length;
          textsToTranslate.push(note.noteTitle);
          
          const textIndex = textsToTranslate.length;
          textsToTranslate.push(note.noteText);
          
          noteMapping.push({ noteIndex, titleIndex, textIndex });
        });

        const translatedTexts = await translateMultipleTexts(textsToTranslate, selectedLanguage, context.accessToken);
        
        const translatedNotes: TranslatedNote[] = originalNotes.map((originalNote, noteIndex) => {
          const mapping = noteMapping[noteIndex];
          return {
            ...originalNote,
            translatedTitle: translatedTexts[mapping.titleIndex],
            translatedText: translatedTexts[mapping.textIndex],
            isTranslating: false
          };
        });
        
        setNotes(translatedNotes);
      } catch (err) {
        console.error('Translation error:', err);
        message.error('Failed to translate notes');
        setNotes(originalNotes);
      } finally {
        setTranslating(false);
      }
    };

    translateNotes();
  }, [selectedLanguage, context.accessToken]);

  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadNotes();
          return;
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

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

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [contactId]);

  const handleDeleteNote = (note: InvestmentNote) => {
    setDeletePopup({ open: true, note });
  };

  // handled by AppAction staticFlowData fallback

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  return (
    <div>
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
          <LanguageDropdown
            selectedLanguage={selectedLanguage}
            onChange={handleLanguageChange}
          />
          {translating && (
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} 
              size="small" 
            />
          )}
        </div>
        <AppAction
          contextsArray={[FlowContextName.investmentNoteEntity]}
          externalContextData={{
            contactId,
            contact: contactId,
            investmentNote: { contact: contactId }
          }}
          staticFlowData={contactId ? [{
            key: 'create-investment-note-fallback',
            label: 'Add Note',
            onClick: () => startProcess({
              domain: 'investments',
              processName: 'createInvestmentNote',
              payload: { contactId },
              builderType: 'NATIVE_SCREEN'
            })
          }] : []}
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
            <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
              Start by adding your first note
            </div>
          </Empty>
        )}

        {!loading && !error && notes.length > 0 && (
          <Timeline>
            {notes.map((note, index) => (
              <Timeline.Item key={note.id || index} color="orange">
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>
                      {note.translatedTitle || note.noteTitle}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {dayjs(note.createdAt).format('MMM D, YYYY [at] h:mm A')} - {getEmployeeDisplayName(note.createdBy)}
                    </Text>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div>{note.translatedText || note.noteText}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
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
        <NoteDeletionPopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          noteId={deletePopup.note.id}
          noteVersion={deletePopup.note.version}
          noteTitle={deletePopup.note.noteTitle}
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