/**
 * useEmailDirectory - Provides company directory + provider contacts search.
 *
 * Data sources (in priority order):
 * 1. Recent recipients (localStorage) — instant
 * 2. Org directory (GraphQL EmployeePosition) — instant (pre-loaded on mount)
 * 3. Provider contacts (Microsoft People / Google People API) — async, debounced
 *
 * searchContacts is a stable function (does not change identity between renders)
 * to avoid infinite re-render loops in consumer useEffects.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailContact, EmailAccount } from '../types'

const RECENT_RECIPIENTS_KEY = 'email-recent-recipients'
const MAX_RECENT = 20
const MAX_RESULTS = 10
const PROVIDER_SEARCH_DEBOUNCE_MS = 400

interface DirectoryEntry {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface DirectoryUserMatch {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

function normalizeEmailForLookup(rawEmail: string): string {
  const trimmed = rawEmail.trim().toLowerCase()
  if (!trimmed) return ''

  // Handles formats like "User Name <user@company.com>".
  const startBracket = trimmed.indexOf('<')
  const endBracket = startBracket >= 0 ? trimmed.indexOf('>', startBracket + 1) : -1
  const bracketValue =
    startBracket >= 0 && endBracket > startBracket + 1 ? trimmed.slice(startBracket + 1, endBracket) : ''
  const candidate = (bracketValue || trimmed).replace(/^mailto:/, '').trim()
  return candidate.includes('@') ? candidate : ''
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

export function useEmailDirectory(accessToken: string | null, accounts: EmailAccount[] = []) {
  const [directory, setDirectory] = useState<DirectoryEntry[]>([])
  const [recentRecipients, setRecentRecipients] = useState<EmailContact[]>(loadRecentRecipients)
  const [isLoading, setIsLoading] = useState(false)
  // Incrementing counter to force consumers to re-call searchContacts when provider results arrive
  const [providerVersion, setProviderVersion] = useState(0)
  const directoryLoadedRef = useRef(false)
  const providerSearchTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const lastProviderQueryRef = useRef('')
  // Refs for data accessed inside searchContacts (avoids dependency cycles)
  const directoryRef = useRef<DirectoryEntry[]>([])
  const recentRecipientsRef = useRef<EmailContact[]>([])
  const providerResultsRef = useRef<EmailContact[]>([])
  const accountsRef = useRef<EmailAccount[]>(accounts)

  // Keep refs in sync with state
  directoryRef.current = directory
  recentRecipientsRef.current = recentRecipients
  accountsRef.current = accounts

  // Load company directory on mount (only once)
  useEffect(() => {
    if (!accessToken || directoryLoadedRef.current) return
    directoryLoadedRef.current = true

    const loadDirectory = async () => {
      setIsLoading(true)
      try {
        const client = new OrgDirectoryClient(accessToken)
        const users = await client.getAllUsersBasic()

        const entries: DirectoryEntry[] = users
          .filter(u => u.email)
          .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatarUrl: u.avatarUrl
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
   * Trigger async provider contacts search (debounced).
   * Does NOT use state in deps — reads from refs only.
   */
  const triggerProviderSearch = useCallback((query: string) => {
    if (providerSearchTimerRef.current) {
      clearTimeout(providerSearchTimerRef.current)
    }

    if (!query || query.trim().length < 2) {
      if (providerResultsRef.current.length > 0) {
        providerResultsRef.current = []
        setProviderVersion(v => v + 1)
      }
      lastProviderQueryRef.current = ''
      return
    }

    const q = query.trim()
    if (q === lastProviderQueryRef.current) return

    providerSearchTimerRef.current = setTimeout(async () => {
      lastProviderQueryRef.current = q

      const searchableAccounts = accountsRef.current.filter(
        a => (a.provider === 'microsoft' || a.provider === 'google') && a.status === 'active'
      )

      if (searchableAccounts.length === 0) return

      try {
        const promises = searchableAccounts.map(account =>
          EmailApiService.searchProviderContacts(account.id, q, 10).catch(() => [])
        )

        const allResults = (await Promise.all(promises)).flat()

        // Deduplicate by email
        const seen = new Set<string>()
        const deduped: EmailContact[] = []
        for (const r of allResults) {
          const emailLower = r.email.toLowerCase()
          if (seen.has(emailLower)) continue
          seen.add(emailLower)
          deduped.push({
            id: `provider_${emailLower}`,
            name: r.name,
            email: r.email,
            avatarUrl: r.avatarUrl,
            source: 'directory'
          })
        }

        // Only update if query hasn't changed while fetching
        if (lastProviderQueryRef.current === q) {
          providerResultsRef.current = deduped
          setProviderVersion(v => v + 1)
        }
      } catch {
        // Provider search is best-effort
      }
    }, PROVIDER_SEARCH_DEBOUNCE_MS)
  }, []) // No state dependencies — stable identity

  /**
   * Search contacts by name or email.
   * Returns instant results from recent recipients + org directory + cached provider results.
   * Also triggers async provider search in the background.
   *
   * IMPORTANT: This function has a stable identity (no state in deps).
   * It reads all data from refs to avoid dependency cycles.
   * The providerVersion counter in deps triggers consumers to re-call when provider data arrives.
   */
  const searchContacts = useCallback(
    (query: string): EmailContact[] => {
      // Fire-and-forget async provider search
      triggerProviderSearch(query)

      const recent = recentRecipientsRef.current
      const dir = directoryRef.current
      const provider = providerResultsRef.current

      if (!query || query.length < 1) {
        return recent.slice(0, MAX_RESULTS)
      }

      const q = query.toLowerCase().trim()
      const results: EmailContact[] = []
      const seenEmails = new Set<string>()

      // 1. Recent recipients
      for (const r of recent) {
        if (r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)) {
          if (!seenEmails.has(r.email.toLowerCase())) {
            seenEmails.add(r.email.toLowerCase())
            results.push(r)
          }
        }
        if (results.length >= MAX_RESULTS) break
      }

      // 2. Org directory
      if (results.length < MAX_RESULTS) {
        for (const entry of dir) {
          if (seenEmails.has(entry.email.toLowerCase())) continue

          if (entry.name.toLowerCase().includes(q) || entry.email.toLowerCase().includes(q)) {
            seenEmails.add(entry.email.toLowerCase())
            results.push({
              id: entry.id,
              name: entry.name,
              email: entry.email,
              avatarUrl: entry.avatarUrl,
              source: 'directory'
            })
          }

          if (results.length >= MAX_RESULTS) break
        }
      }

      // 3. Provider contacts (from previous async fetch)
      if (results.length < MAX_RESULTS && provider.length > 0) {
        for (const pr of provider) {
          if (seenEmails.has(pr.email.toLowerCase())) continue
          seenEmails.add(pr.email.toLowerCase())
          results.push(pr)
          if (results.length >= MAX_RESULTS) break
        }
      }

      return results
    },
    // providerVersion triggers re-creation so consumers re-call and see new provider data.
    // triggerProviderSearch is stable (no state deps). No other state in deps.
    [triggerProviderSearch, providerVersion]
  )

  /** Add an email to the recent recipients list (call after sending an email). */
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

  /** Add multiple recipients at once. */
  const addRecentRecipients = useCallback(
    (contacts: Array<{ name?: string; email: string }>) => {
      contacts.forEach(c => addRecentRecipient(c))
    },
    [addRecentRecipient]
  )

  const findDirectoryUserByEmail = useCallback((email: string): DirectoryUserMatch | null => {
    const normalizedEmail = normalizeEmailForLookup(email)
    if (!normalizedEmail) return null

    const match = directoryRef.current.find(entry => normalizeEmailForLookup(entry.email) === normalizedEmail)
    if (!match) return null

    return {
      id: match.id,
      name: match.name,
      email: match.email,
      avatarUrl: match.avatarUrl
    }
  }, [])

  const findDirectoryUserMatch = useCallback(
    (sender: { email?: string; name?: string }): DirectoryUserMatch | null => {
      const normalizedName = sender.name?.trim().toLowerCase() || ''

      if (sender.email) {
        const emailMatch = findDirectoryUserByEmail(sender.email)
        if (emailMatch) return emailMatch
      }

      if (!normalizedName) return null

      const nameMatches = directoryRef.current.filter(entry => entry.name.trim().toLowerCase() === normalizedName)
      if (nameMatches.length !== 1) return null

      const match = nameMatches[0]
      return {
        id: match.id,
        name: match.name,
        email: match.email,
        avatarUrl: match.avatarUrl
      }
    },
    [findDirectoryUserByEmail]
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (providerSearchTimerRef.current) {
        clearTimeout(providerSearchTimerRef.current)
      }
    }
  }, [])

  return {
    searchContacts,
    addRecentRecipient,
    addRecentRecipients,
    findDirectoryUserByEmail,
    findDirectoryUserMatch,
    isLoading,
    directorySize: directory.length
  }
}
