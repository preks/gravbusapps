import { useState, useEffect, useCallback } from 'react'
import { ContactData, useGetContactById } from '../queries/ContactQueries'

export const useContactData = (contactId: string, accessToken?: string) => {
  const [contact, setContact] = useState<ContactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchContactById } = useGetContactById({
    accessToken: accessToken || ''
  })

  const refetchContactData = useCallback(async () => {
    if (!contactId || !accessToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const contactData = await fetchContactById(contactId)

      if (contactData) {
        setContact(contactData)
      } else {
        setError('Contact not found')
      }
    } catch (err) {
      console.error('Error fetching contact:', err)
      setError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }, [contactId, accessToken, fetchContactById])

  useEffect(() => {
    refetchContactData()
  }, [refetchContactData])

  return {
    contact,
    loading,
    error,
    refetchContactData
  }
}
