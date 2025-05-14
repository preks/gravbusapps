// Types
export const LeadRating = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
} as const;

export type LeadRating = (typeof LeadRating)[keyof typeof LeadRating];

export interface LeadStatus {
  id: number;
  name: string;
  completed: boolean;
}

export interface TimelineActivity {
  id: string;
  type: "note" | "call" | "email" | "rating" | "position";
  content: string;
  date: string;
  time: string;
  note?: string;
}

export interface LeadTask {
  id: string;
  type: "task" | "reminder";
  title: string;
  reporter: string;
  priority: "Low" | "Medium" | "High";
  dueDate: string;
  note?: string;
}

export interface LeadDetailLabels {
  /**
   * Labels for lead information fields
   */
  nameLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  companyLabel?: string;
  positionLabel?: string;
  sourceLabel?: string;
  ratingLabel?: string;
  ownerLabel?: string;
  creationDateLabel?: string;

  /**
   * Tab labels
   */
  overviewTabLabel?: string;
  companyTabLabel?: string;
  documentsTabLabel?: string;

  /**
   * Activity timeline labels
   */
  activityTimelineTitle?: string;
  activityInputPlaceholder?: string;
  activityDateText?: string;
  activityUserInfo?: string;

  /**
   * Status labels
   */
  statusCheckLabel?: string;

  /**
   * Activity type labels
   */
  emailTypeLabel?: string;
  noteTypeLabel?: string;
  callTypeLabel?: string;
  ratingTypeLabel?: string;
  positionTypeLabel?: string;
  notePrefix?: string;

  /**
   * Tasks and reminders labels
   */
  tasksAndRemindersTitle?: string;
  activeTabLabel?: string;
  completedTabLabel?: string;
  taskPrefix?: string;
  reminderPrefix?: string;
  reporterLabel?: string;
  priorityLabel?: string;
  dueDateLabel?: string;
  taskNotePrefix?: string;

  /**
   * Empty state messages
   */
  noCompanyInfoMessage?: string;
  noDocumentsMessage?: string;
}
