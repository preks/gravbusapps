/**
 * useEmailDirectory - Provides company directory search for email recipient auto-suggest.
 * Fetches org directory users on mount, maintains recent recipients in localStorage,
 * and provides a fast client-side search function.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'
import type { EmailContact } from '../types'

const RECENT_RECIPIENTS_KEY = 'email-recent-recipients'
const MAX_RECENT = 20
const MAX_RESULTS = 10

interface DirectoryEntry {
  id: string
  name: string
  email: string
  avatarUrl?: string
  department?: string
}

/** Load recent recipients from localStorage */
function loadRecentRecipients(): EmailContact[] {
  try {
    const stored = localStorage.getItem(RECENT_RECIPIENTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/** Save recent recipients to localStorage */
function saveRecentRecipients(recipients: EmailContact[]): void {
  try {
    localStorage.setItem(RECENT_RECIPIENTS_KEY, JSON.stringify(recipients.slice(0, MAX_RECENT)))
  } catch {
    // Ignore storage errors
  }
}

export function useEmailDirectory(accessToken: string | null) {
  const [directory, setDirectory] = useState<DirectoryEntry[]>([])
  const [recentRecipients, setRecentRecipients] = useState<EmailContact[]>(loadRecentRecipients)
  const [isLoading, setIsLoading] = useState(false)
  const directoryLoadedRef = useRef(false)

  // Load company directory on mount (only once)
  useEffect(() => {
    if (!accessToken || directoryLoadedRef.current) return
    directoryLoadedRef.current = true

    const loadDirectory = async () => {
      setIsLoading(true)
      try {
        const client = new OrgDirectoryClient(accessToken)
        const users = await client.getAllUsers()

        const entries: DirectoryEntry[] = users
          .filter(u => u.email) // Only users with email
          .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            department: u.organizationalUnits?.[0] || undefined
          }))

        setDirectory(entries)
      } catch (err) {
        console.error('Failed to load email directory:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDirectory()
  }, [accessToken])

  /**
   * Search contacts by name or email.
   * Returns results prioritized: recent recipients first, then directory matches.
   */
  const searchContacts = useCallback(
    (query: string): EmailContact[] => {
      if (!query || query.length < 1) {
        // Return recent recipients when query is empty
        return recentRecipients.slice(0, MAX_RESULTS)
      }

      const q = query.toLowerCase().trim()
      const results: EmailContact[] = []
      const seenEmails = new Set<string>()

      // Search recent recipients first
      for (const r of recentRecipients) {
        if (r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)) {
          if (!seenEmails.has(r.email.toLowerCase())) {
            seenEmails.add(r.email.toLowerCase())
            results.push(r)
          }
        }
        if (results.length >= MAX_RESULTS) break
      }

      // Then search directory
      if (results.length < MAX_RESULTS) {
        for (const entry of directory) {
          if (seenEmails.has(entry.email.toLowerCase())) continue

          if (entry.name.toLowerCase().includes(q) || entry.email.toLowerCase().includes(q)) {
            seenEmails.add(entry.email.toLowerCase())
            results.push({
              id: entry.id,
              name: entry.name,
              email: entry.email,
              avatarUrl: entry.avatarUrl,
              department: entry.department,
              source: 'directory'
            })
          }

          if (results.length >= MAX_RESULTS) break
        }
      }

      return results
    },
    [directory, recentRecipients]
  )

  /**
   * Add an email to the recent recipients list (call after sending an email).
   */
  const addRecentRecipient = useCallback((contact: { name?: string; email: string }) => {
    setRecentRecipients(prev => {
      const filtered = prev.filter(r => r.email.toLowerCase() !== contact.email.toLowerCase())
      const newRecent: EmailContact = {
        id: `recent_${contact.email}`,
        name: contact.name || contact.email.split('@')[0],
        email: contact.email,
        source: 'recent'
      }
      const updated = [newRecent, ...filtered].slice(0, MAX_RECENT)
      saveRecentRecipients(updated)
      return updated
    })
  }, [])

  /**
   * Add multiple recipients at once (e.g., after sending an email with multiple To/Cc).
   */
  const addRecentRecipients = useCallback(
    (contacts: Array<{ name?: string; email: string }>) => {
      contacts.forEach(c => addRecentRecipient(c))
    },
    [addRecentRecipient]
  )

  return {
    searchContacts,
    addRecentRecipient,
    addRecentRecipients,
    isLoading,
    directorySize: directory.length
  }
}
