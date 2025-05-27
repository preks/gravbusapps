import { create } from "zustand";
import {
  type Pipeline,
  type Stage,
  type Opportunity,
  pipelines as initialPipelines,
  stages as initialStages,
  opportunities as initialOpportunities,
  currentUser
} from "./data";

interface KanbanState {
  // Data
  pipelines: Pipeline[];
  stages: Stage[];
  opportunities: Opportunity[];

  // UI state
  selectedPipelineId: string;
  isEditingStage: boolean;
  editingStageId: string | null;
  isAddingStage: boolean;
  isAddingOpportunity: boolean;
  addingOpportunityStageId: string | null;
  isAddingPipeline: boolean;
  isEditingPipeline: boolean;
  editingPipelineId: string | null;

  // Actions
  selectPipeline: (pipelineId: string) => void;
  moveOpportunity: (opportunityId: string, targetStageId: string) => void;
  addStage: (stage: Omit<Stage, "id" | "order">) => void;
  updateStage: (stageId: string, updates: Partial<Omit<Stage, "id" | "pipelineId">>) => void;
  deleteStage: (stageId: string) => void;
  reorderStages: (activeId: string, overId: string) => void;
  addOpportunity: (opportunity: Omit<Opportunity, "id" | "createdAt" | "updatedAt" | "lastActivityAt" | "assignedTo">) => void;
  addPipeline: (pipeline: Omit<Pipeline, "id">) => void;
  updatePipeline: (pipelineId: string, updates: Partial<Omit<Pipeline, "id">>) => void;
  deletePipeline: (pipelineId: string) => void;

  // UI actions
  setEditingStage: (stageId: string | null) => void;
  setIsAddingStage: (isAdding: boolean) => void;
  setIsAddingOpportunity: (isAdding: boolean, stageId: string | null) => void;
  setIsAddingPipeline: (isAdding: boolean) => void;
  setEditingPipeline: (pipelineId: string | null) => void;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  // Initial data
  pipelines: initialPipelines,
  stages: initialStages,
  opportunities: initialOpportunities,

  // Initial UI state
  selectedPipelineId: initialPipelines.find(p => p.isDefault)?.id || initialPipelines[0].id,
  isEditingStage: false,
  editingStageId: null,
  isAddingStage: false,
  isAddingOpportunity: false,
  addingOpportunityStageId: null,
  isAddingPipeline: false,
  isEditingPipeline: false,
  editingPipelineId: null,

  // Actions
  selectPipeline: (pipelineId) => {
    set({ selectedPipelineId: pipelineId });
  },

  moveOpportunity: (opportunityId, targetStageId) => {
    const now = new Date().toISOString();
    set((state) => ({
      opportunities: state.opportunities.map((opportunity) =>
        opportunity.id === opportunityId
          ? { 
              ...opportunity, 
              stageId: targetStageId,
              stageEnteredAt: now, // Reset the stage entry time when moved
              updatedAt: now,
              lastActivityAt: now
            }
          : opportunity
      ),
    }));
  },

  addStage: (stageData) => {
    const { stages } = get();
    const pipelineStages = stages.filter((s) => s.pipelineId === stageData.pipelineId);
    const newOrder = pipelineStages.length > 0 ? Math.max(...pipelineStages.map((s) => s.order)) + 1 : 0;

    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      order: newOrder,
      ...stageData,
    };

    set((state) => ({
      stages: [...state.stages, newStage],
      isAddingStage: false,
    }));
  },

  updateStage: (stageId, updates) => {
    set((state) => ({
      stages: state.stages.map((stage) => (stage.id === stageId ? { ...stage, ...updates } : stage)),
      isEditingStage: false,
      editingStageId: null,
    }));
  },

  deleteStage: (stageId) => {
    // Check if there are opportunities in this stage
    const { opportunities } = get();
    const hasOpportunities = opportunities.some((opp) => opp.stageId === stageId);

    if (hasOpportunities) {
      alert(
        "The column cannot be deleted as long as there are data in it. In order to delete the data, move all items to another stage first.",
      );
      return;
    }

    set((state) => ({
      stages: state.stages.filter((stage) => stage.id !== stageId),
    }));
  },

  // UI actions
  setEditingStage: (stageId) => {
    set({
      isEditingStage: stageId !== null,
      editingStageId: stageId,
    });
  },

  setIsAddingStage: (isAdding) => {
    set({ isAddingStage: isAdding });
  },
  
  reorderStages: (activeId, overId) => {
    set((state) => {
      const { stages, selectedPipelineId } = state;
      
      // Get only stages from the current pipeline
      const pipelineStages = stages.filter(stage => stage.pipelineId === selectedPipelineId);
      
      // Find the active and over stages
      const activeStage = pipelineStages.find(stage => stage.id === activeId);
      const overStage = pipelineStages.find(stage => stage.id === overId);
      
      if (!activeStage || !overStage || activeStage.id === overStage.id) {
        return state;
      }
      
      // Create a new array with updated orders
      const updatedStages = stages.map(stage => {
        // Skip stages from other pipelines
        if (stage.pipelineId !== selectedPipelineId) {
          return stage;
        }
        
        if (stage.id === activeId) {
          // Set the active stage to the over stage's order
          return { ...stage, order: overStage.order };
        } else if (
          // If moving right, decrement order of stages between over and active
          activeStage.order < overStage.order && 
          stage.order <= overStage.order && 
          stage.order > activeStage.order
        ) {
          return { ...stage, order: stage.order - 1 };
        } else if (
          // If moving left, increment order of stages between active and over
          activeStage.order > overStage.order && 
          stage.order >= overStage.order && 
          stage.order < activeStage.order
        ) {
          return { ...stage, order: stage.order + 1 };
        }
        
        return stage;
      });
      
      return { stages: updatedStages };
    });
  },
  
  addOpportunity: (opportunityData) => {
    const now = new Date().toISOString();
    const newOpportunity: Opportunity = {
      id: `opportunity-${Date.now()}`,
      ...opportunityData,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      stageEnteredAt: now, // Track when the opportunity entered this stage
      assignedTo: currentUser.id,
    };

    set((state) => ({
      opportunities: [...state.opportunities, newOpportunity],
      isAddingOpportunity: false,
      addingOpportunityStageId: null,
    }));
  },
  
  setIsAddingOpportunity: (isAdding, stageId = null) => {
    set({ 
      isAddingOpportunity: isAdding,
      addingOpportunityStageId: stageId
    });
  },
  
  addPipeline: (pipelineData) => {
    const newPipeline: Pipeline = {
      id: `pipeline-${Date.now()}`,
      ...pipelineData,
    };

    set((state) => ({
      pipelines: [...state.pipelines, newPipeline],
      isAddingPipeline: false,
      selectedPipelineId: newPipeline.id,
    }));
    
    // Add a default stage for the new pipeline
    const defaultStage = {
      name: 'New Stage',
      pipelineId: newPipeline.id,
      probability: 50,
      rotting: true,
      rottingDays: 7,
    };
    
    // Use the existing addStage function
    get().addStage(defaultStage);
  },
  
  updatePipeline: (pipelineId, updates) => {
    // If setting this pipeline as default, unset default for all other pipelines
    const updatedPipelines = [...get().pipelines];
    
    if (updates.isDefault) {
      // First, set all pipelines to non-default
      updatedPipelines.forEach(pipeline => {
        pipeline.isDefault = false;
      });
    }
    
    // Then update the specific pipeline
    const updatedPipelinesWithChanges = updatedPipelines.map(pipeline => 
      pipeline.id === pipelineId ? { ...pipeline, ...updates } : pipeline
    );
    
    set({
      pipelines: updatedPipelinesWithChanges,
      isEditingPipeline: false,
      editingPipelineId: null,
    });
  },
  
  deletePipeline: (pipelineId) => {
    // Check if there are opportunities in this pipeline
    const { opportunities, pipelines } = get();
    const hasOpportunities = opportunities.some((opp) => opp.pipelineId === pipelineId);

    if (hasOpportunities) {
      alert(
        'The pipeline cannot be deleted as long as there are opportunities in it. Move all opportunities to another pipeline first.'
      );
      return;
    }

    // Check if this is the last pipeline
    if (pipelines.length <= 1) {
      alert('You cannot delete the last pipeline.');
      return;
    }

    // If this is the selected pipeline, select another one
    const { selectedPipelineId } = get();
    let newSelectedPipelineId = selectedPipelineId;

    if (selectedPipelineId === pipelineId) {
      const otherPipeline = pipelines.find((p) => p.id !== pipelineId);
      if (otherPipeline) {
        newSelectedPipelineId = otherPipeline.id;
      }
    }

    set((state) => ({
      pipelines: state.pipelines.filter((pipeline) => pipeline.id !== pipelineId),
      stages: state.stages.filter((stage) => stage.pipelineId !== pipelineId),
      selectedPipelineId: newSelectedPipelineId,
    }));
  },
  
  setIsAddingPipeline: (isAdding) => {
    set({ isAddingPipeline: isAdding });
  },
  
  setEditingPipeline: (pipelineId) => {
    set({
      isEditingPipeline: pipelineId !== null,
      editingPipelineId: pipelineId,
    });
  },
}));