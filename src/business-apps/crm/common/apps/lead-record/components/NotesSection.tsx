import React, { useState, useEffect, useRef } from 'react'
import { PlusCircleOutlined, UserOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons'
import { Button, Spin, Alert, Empty, Timeline, Typography, message, Modal } from 'antd'
import { startProcess } from '@/common/utils/start-process'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetCrmNotes, CrmNoteData } from '../queries/CrmNoteQueries'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { NoteDeletePopup } from '@/common/components/common-relations/popups/note-delete-popup'
import { env } from '@/common/env/EnvUtils'
import dayjs from 'dayjs'
import { LanguageDropdown } from './LanguageDropdown'
import { translateMultipleTexts } from '../utils/translationService'
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData'

const { Text } = Typography

interface NotesSectionProps {
  leadId?: string
  context: BusinessAppContextProps
}

interface TranslatedNote extends CrmNoteData {
  translatedTitle?: string
  translatedText?: string
  isTranslating?: boolean
}

export const NotesSection: React.FC<NotesSectionProps> = ({ leadId, context }) => {
  const [notes, setNotes] = useState<TranslatedNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('Original')
  const [translating, setTranslating] = useState(false)
  const originalNotesRef = useRef<CrmNoteData[]>([])
  const { fetchCrmNotes } = useGetCrmNotes(context)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; note?: CrmNoteData }>({ open: false })
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken)

  const loadNotes = async () => {
    if (!leadId) return

    setLoading(true)
    setError(null)

    try {
      const result = await fetchCrmNotes({ leadId })
      // Sort notes by createdAt in descending order (newest first)
      const sortedNotes = (result.CrmNote || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Store original notes for translation reference
      originalNotesRef.current = sortedNotes
      setNotes(sortedNotes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [leadId])

  // Handle language change and translate notes
  useEffect(() => {
    const translateNotes = async () => {
      const originalNotes = originalNotesRef.current

      if (selectedLanguage === 'Original' || originalNotes.length === 0) {
        // Reset to original text for Original language or no notes
        setNotes(originalNotes)
        return
      }

      setTranslating(true)

      try {
        // Collect all text to translate from original notes
        const textsToTranslate: string[] = []
        const noteMapping: Array<{ noteIndex: number; titleIndex: number; textIndex: number }> = []

        originalNotes.forEach((note, noteIndex) => {
          const titleIndex = textsToTranslate.length
          textsToTranslate.push(note.noteTitle)

          const textIndex = textsToTranslate.length
          textsToTranslate.push(note.noteText)

          noteMapping.push({ noteIndex, titleIndex, textIndex })
        })

        // Translate all texts at once
        const translatedTexts = await translateMultipleTexts(textsToTranslate, selectedLanguage, context.accessToken)

        // Create translated notes based on original notes
        const translatedNotes: TranslatedNote[] = originalNotes.map((originalNote, noteIndex) => {
          const mapping = noteMapping[noteIndex]
          return {
            ...originalNote,
            translatedTitle: translatedTexts[mapping.titleIndex],
            translatedText: translatedTexts[mapping.textIndex],
            isTranslating: false
          }
        })

        setNotes(translatedNotes)
      } catch (err) {
        console.error('Translation error:', err)
        message.error('Failed to translate notes')
        // Fallback to original notes
        setNotes(originalNotes)
      } finally {
        setTranslating(false)
      }
    }

    translateNotes()
  }, [selectedLanguage, context.accessToken])

  // Listen for process completion events to refresh notes
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('Notes: Process completion event received:', event)
        const response = event.detail?.response
        console.log('Notes: Event response:', response)

        if (response?.crmNote) {
          console.log('Notes: Refreshing notes...')
          // Refresh notes when a new note is added
          loadNotes()
        }
      } catch (err) {
        console.error('Error handling process completion:', err)
      }
    }

    // Listen to multiple possible event names
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'processCompletion',
      'taskCompletion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [leadId])

  const handleDeleteNote = (note: CrmNoteData) => {
    setDeletePopup({ open: true, note })
  }

  const handleAddNote = () => {
    if (leadId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveCrmNote',
        payload: {
          leadId
        },
        builderType: 'NATIVE_SCREEN'
      })
    }
  }

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode)
  }

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
          <div className="gba:notes-title" style={{ fontSize: '18px', fontWeight: '500' }}>
            Notes
          </div>
          <LanguageDropdown selectedLanguage={selectedLanguage} onChange={handleLanguageChange} />
          {translating && <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} size="small" />}
        </div>
        <AppAction
          contextsArray={[FlowContextName.customerNoteCreate]}
          externalContextData={{
            leadId,
            lead: leadId,
            crmNote: { lead: leadId }
          }}
          staticFlowData={
            leadId
              ? [
                  {
                    key: 'create-crm-note-fallback',
                    label: 'Add Note',
                    onClick: () =>
                      startProcess({
                        domain: 'customer-relations',
                        processName: 'saveCrmNote',
                        payload: { leadId },
                        builderType: 'NATIVE_SCREEN'
                      })
                  }
                ]
              : []
          }
          prefixDataTestId="add-note"
          accessToken={context.accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
        >
          <Button type="primary" icon={<PlusCircleOutlined />} data-testid="add-note-button">
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
              <Button size="small" onClick={loadNotes}>
                Retry
              </Button>
            }
          />
        )}

        {!loading && !error && notes.length === 0 && (
          <Empty description="No notes yet" style={{ padding: '40px 0' }} data-testid="empty-notes">
            <div style={{ fontSize: '14px', color: '#8c8c8c' }}>Start by adding your first note</div>
          </Empty>
        )}

        {!loading && !error && notes.length > 0 && (
          <Timeline>
            {notes.map((note, index) => (
              <Timeline.Item key={note.id || index} color="blue">
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{note.translatedTitle || note.noteTitle}</Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      {dayjs(note.createdAt).format('MMM D, YYYY [at] h:mm A')} -{' '}
                      {getEmployeeDisplayName(note.createdBy)}
                    </Text>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div>{note.translatedText || note.noteText}</div>
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

      {deletePopup.open && deletePopup.note && (
        <NoteDeletePopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          noteId={deletePopup.note.id}
          noteVersion={deletePopup.note.version}
          noteTitle={deletePopup.note.noteTitle}
          domain="crm"
          onSuccess={() => {
            const id = deletePopup.note!.id
            setNotes(prev => prev.filter(n => n.id !== id))
            originalNotesRef.current = originalNotesRef.current.filter(n => n.id !== id)
            setDeletePopup({ open: false })
          }}
          onError={() => setDeletePopup({ open: false })}
        />
      )}
    </div>
  )
}
