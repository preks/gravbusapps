import { useCallback, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import type { DocumentItem } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export function useFolderPrivacy() {

  const [open, setOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [documentId, setDocumentId] = useState<string>('')
  const [documentVersion, setDocumentVersion] = useState<number | undefined>(undefined)
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const openFor = useCallback(async (doc: DocumentItem) => {
    if (!doc.folder) return
    setFolderName(doc.name || 'Untitled Folder')
    setDocumentId(doc.id)
    setDocumentVersion(doc.version)
    setOpen(true)
    // Initialize roles from selected document directly
    try {
      setLoading(true)
      const initial = Array.isArray(doc.securityRoles) ? doc.securityRoles : []
      setRoles(initial)
    } catch (e) {
      console.error('Failed to initialize folder roles from document', e)
      toast.error(
        getTranslationFromI18nKeyAndLabel('document.privacy.load.error', 'Failed to load folder roles')
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const addRole = useCallback((role: string) => {
    const r = (role || '').trim()
    if (!r) return
    setRoles(prev => (prev.includes(r) ? prev : [...prev, r]))
  }, [])

  const removeRole = useCallback((idx: number) => {
    setRoles(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // Save is handled by consumer (DocumentSectionModals) using Flow action
  const save = useCallback(async () => {
    // no-op in hook; handled by modals via flow action
    setSaving(true)
    setSaving(false)
  }, [])

  return {
    dialog: {
      open,
      setOpen,
      folderName,
      documentId,
      documentVersion,
      roles,
      loading,
      saving
    },
    openFor,
    addRole,
    removeRole,
    save
  }
}
