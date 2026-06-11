import React from 'react'
import { BarChart3, BookOpen, CalendarCheck, ClipboardList, FileSearch } from 'lucide-react'

export enum LearningTabKey {
  Dashboard = 'dashboard',
  Library = 'library',
  Assignments = 'assignments',
  Analytics = 'analytics',
  Audit = 'audit'
}

export const LEARNING_TAB_KEYS = Object.values(LearningTabKey)

export const VIEW_OPTIONS = [
  {
    key: LearningTabKey.Dashboard,
    icon: React.createElement(ClipboardList, { className: 'gba:h-4 gba:w-4' }),
    labelKey: 'learning-tab-dashboard'
  },
  {
    key: LearningTabKey.Library,
    icon: React.createElement(BookOpen, { className: 'gba:h-4 gba:w-4' }),
    labelKey: 'learning-tab-library'
  },
  {
    key: LearningTabKey.Assignments,
    icon: React.createElement(CalendarCheck, { className: 'gba:h-4 gba:w-4' }),
    labelKey: 'learning-tab-assignments'
  },
  {
    key: LearningTabKey.Analytics,
    icon: React.createElement(BarChart3, { className: 'gba:h-4 gba:w-4' }),
    labelKey: 'learning-tab-analytics'
  },
  {
    key: LearningTabKey.Audit,
    icon: React.createElement(FileSearch, { className: 'gba:h-4 gba:w-4' }),
    labelKey: 'learning-tab-audit'
  }
] as const
