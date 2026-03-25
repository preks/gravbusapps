/**
 * NEWWORK Desktop App - API Exports
 */

export { ApiClient, getBaseUrl } from './client'
export { getFlowEngineClient, type FlowEngineClient } from './flowEngine'
export { getFlowBotClient, type FlowBotClient, type ChatMessage, type ChatRequest } from './flowbot'
export {
  getChatServiceClient,
  type ChatServiceClient,
  type CreateConversationRequest,
  type SendMessageRequest
} from './chatService'
export {
  getCalendarClient,
  type CalendarClient,
  type CreateEventRequest,
  type UpdateEventRequest,
  type RespondToEventRequest
} from './calendar'
export { default as TimeTrackingApi } from './timeTracking'
