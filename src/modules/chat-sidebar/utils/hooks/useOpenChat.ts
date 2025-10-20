import { useCallback } from 'react'

export const useOpenChat = () => {
  /**
   * Attempts to open a Microsoft Teams chat with the specified user
   * @param userId - The user ID to use if email is not provided
   * @param email - The email address of the user to chat with (optional)
   */
  const openChatWithUser = useCallback((userId: string, email?: string) => {
    const contactIdentifier = email || userId

    if (!contactIdentifier) {
      console.error('No valid contact identifier (email or userId) provided')
      return
    }

    const teamsWebUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(contactIdentifier)}`
    window.open(teamsWebUrl)

    window.postMessage(
      {
        type: 'OPEN_CHAT',
        payload: { userId }
      },
      '*'
    )
  }, [])

  /**
   * Attempts to open a Microsoft Teams audio call with the specified user
   * @param userId - The user ID to use if email is not provided
   * @param email - The email address of the user to call (optional)
   */
  const openAudioConferenceWithUser = useCallback((userId: string, email?: string) => {
    const contactIdentifier = email || userId

    if (!contactIdentifier) {
      console.error('No valid contact identifier (email or userId) provided')
      return
    }

    const teamsAudioUrl = `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(contactIdentifier)}`
    window.open(teamsAudioUrl)

    // Keep original window message functionality
    window.postMessage(
      {
        type: 'OPEN_AUDIO_CONFERENCE',
        payload: { userId }
      },
      '*'
    )
  }, [])

  /**
   * Popen a Microsoft Teams video call with the specified user
   * @param userId - The user ID to use if email is not provided
   * @param email - The email address of the user to video call
   */
  const openVideoConferenceWithUser = useCallback((userId: string, email?: string) => {
    // Determine which identifier to use - prefer email if available
    const contactIdentifier = email || userId

    if (!contactIdentifier) {
      console.error('No valid contact identifier (email or userId) provided')
      return
    }
    const teamsVideoUrl = `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(contactIdentifier)}&withVideo=true`
    window.open(teamsVideoUrl)
    // Keep original window message functionality
    window.postMessage(
      {
        type: 'OPEN_VIDEO_CONFERENCE',
        payload: { userId }
      },
      '*'
    )
  }, [])

  return {
    openChatWithUser,
    openAudioConferenceWithUser,
    openVideoConferenceWithUser
  }
}
