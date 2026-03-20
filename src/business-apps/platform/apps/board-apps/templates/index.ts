export type { TemplateConfig, TemplateSheetConfig } from './boardTemplateTypes'
export { buildBoardFromTemplate } from './boardTemplateTypes'

import { PROJECT_TRACKER, CRM_PIPELINE, SPRINT_BOARD, CONTENT_CALENDAR, BUG_TRACKER } from './existingTemplates'
import {
  EVENT_PLANNING,
  RECRUITMENT_PIPELINE,
  PRODUCT_ROADMAP,
  INVENTORY_TRACKER,
  PRODUCTION_BOARD
} from './newTemplates'
import type { TemplateConfig } from './boardTemplateTypes'

export const ALL_TEMPLATES: TemplateConfig[] = [
  PROJECT_TRACKER,
  CRM_PIPELINE,
  SPRINT_BOARD,
  CONTENT_CALENDAR,
  BUG_TRACKER,
  EVENT_PLANNING,
  RECRUITMENT_PIPELINE,
  PRODUCT_ROADMAP,
  INVENTORY_TRACKER,
  PRODUCTION_BOARD
]
