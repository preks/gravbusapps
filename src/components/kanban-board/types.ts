export interface KanbanStage {
  id: string;
  name: string;
  code?: string;
  order: number;
  probability?: number;
  rotting?: boolean;
  rottingDays?: number;
}

export interface KanbanItem {
  id: string;
  name: string;
  description?: string;
  stageId?: string;
  position?: number;
  // Generic fields that can be used by any implementation
  [key: string]: any;
}

export interface KanbanPipeline {
  id: string;
  code: string;
  value: string;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
}

export interface KanbanBoardProps {
  stages: KanbanStage[];
  items: KanbanItem[];
  onDragEnd?: (itemId: string, toStageId: string, position?: number) => void;
  renderCard?: (item: KanbanItem) => React.ReactNode;
  renderStageHeader?: (stage: KanbanStage, itemCount: number, totalAmount?: number) => React.ReactNode;

  // Generic props
  className?: string;
  emptyStateMessage?: string;
  loading?: boolean;
}

export interface KanbanColumnProps {
  stage: KanbanStage;
  items: KanbanItem[];
  renderCard?: (item: KanbanItem) => React.ReactNode;
  renderStageHeader?: (stage: KanbanStage, itemCount: number, totalAmount?: number) => React.ReactNode;
  isDraggedOver?: boolean;
  isDragging?: boolean;
  dragOverItem?: string | null;
  insertPosition?: 'before' | 'after' | null;
}

export interface KanbanCardProps {
  item: KanbanItem;
  onClick?: (id: string) => void;
  renderContent?: (item: KanbanItem) => React.ReactNode;
  className?: string;
}
