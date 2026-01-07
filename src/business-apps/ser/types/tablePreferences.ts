import { ColumnConfig } from '@/components/dataController';

export interface TableSortPreferences {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface DeskTablePreferences {
  search: string;
  sorting: TableSortPreferences;
  filters: string[];
  columns: ColumnConfig[];
  lastUsed: string;
  version: string;
}

// Storage adapter interface - easy to switch between localStorage and API
export interface TablePreferencesStorage {
  getPreferences(tableId: string): Promise<DeskTablePreferences | null>;
  savePreferences(tableId: string, preferences: DeskTablePreferences): Promise<void>;
}

// Default preferences factory
export const getDefaultDeskTablePreferences = (): DeskTablePreferences => ({
  search: '',
  sorting: {
    field: 'updatedAt',
    order: 'DESC'
  },
  filters: [],
  columns: [
    { id: "requestId", label: "Request ID", visible: true },
    { id: "stepName", label: "Ticket Title", visible: true },
    { id: "requester", label: "Requester", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "urgency", label: "Urgency", visible: true },
    { id: "slaDue", label: "SLA Due", visible: true },
    { id: "assignee", label: "Assignee", visible: true },
    { id: "updated", label: "Updated", visible: true },
    { id: "debug", label: "Debug", visible: false },
    { id: "actions", label: "Actions", visible: true, disabled: true },
  ],
  lastUsed: new Date().toISOString(),
  version: '1.0'
});
