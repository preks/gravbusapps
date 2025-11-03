/**
 * EveryAI - Premium AI Assistant
 *
 * The most advanced AI-powered assistant for NEWWORK ERP platform.
 *
 * Features:
 * - Real-time AI conversations with streaming responses
 * - Context-aware assistance based on current page/entity
 * - Advanced document analysis and file processing
 * - Intelligent workflow automation and task execution
 * - Beautiful, modern UI with smooth animations
 * - Persistent conversation history
 * - Multi-format data visualization
 *
 * @module every-ai
 */

export { EveryAI as default, EveryAI } from './EveryAI'
export type { EveryAIProps } from './EveryAI'

// Export types for external use
export type {
  ConversationTurn,
  UserTurn,
  AgentTurn,
  OutputItem,
  AnswerOutput,
  ToolOutput,
  LoadingOutput,
  ErrorOutput,
  FlowProposalOutput,
  DisplayData,
  TextBlockData,
  TableData,
  BarGraphData,
  EntityData,
  FileData,
  CurrentPageContext,
  FileMeta,
  Mention
} from './types/models'
