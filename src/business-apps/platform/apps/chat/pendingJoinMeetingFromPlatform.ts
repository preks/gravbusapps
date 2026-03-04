/**
 * Stores meetingId + conversationId when user joins or opens a meeting from calendar.
 * useChatRejoinCall uses this so the rejoin modal can show the transcription message
 * even when the conversation object doesn't have metadata.meetingId yet.
 */

let pending: { meetingId: string; conversationId: string } | null = null

export function setPendingJoinMeeting(meetingId: string, conversationId: string): void {
  pending = { meetingId, conversationId }
}

export function getPendingJoinMeetingForConversation(conversationId: string): string | null {
  if (!pending || pending.conversationId !== conversationId) return null
  return pending.meetingId
}

export function takePendingJoinMeetingForConversation(conversationId: string): string | null {
  const meetingId = getPendingJoinMeetingForConversation(conversationId)
  if (meetingId) pending = null
  return meetingId
}
