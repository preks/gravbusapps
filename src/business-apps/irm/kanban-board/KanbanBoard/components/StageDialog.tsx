import { useState, useEffect } from "react";
import { useKanbanStore } from "../lib/kanban-store";

export function StageDialog() {
  const { 
    isAddingStage, 
    isEditingStage, 
    editingStageId, 
    selectedPipelineId, 
    stages, 
    addStage, 
    updateStage, 
    setIsAddingStage, 
    setEditingStage 
  } = useKanbanStore();

  const [name, setName] = useState("");
  const [probability, setProbability] = useState(50);
  const [rotting, setRotting] = useState(true);
  const [rottingDays, setRottingDays] = useState(7);

  const isOpen = isAddingStage || isEditingStage;
  const isEditing = isEditingStage && editingStageId;
  const title = isEditing ? "Edit Column" : "Add Column";

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingStageId) {
        const stage = stages.find((s: any) => s.id === editingStageId);
        if (stage) {
          setName(stage.name);
          setProbability(stage.probability);
          setRotting(stage.rotting);
          setRottingDays(stage.rottingDays);
        }
      } else {
        setName("");
        setProbability(50);
        setRotting(true);
        setRottingDays(7);
      }
    }
  }, [isOpen, isEditing, editingStageId, stages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && editingStageId) {
      updateStage(editingStageId, {
        name,
        probability,
        rotting,
        rottingDays,
      });
    } else {
      addStage({
        name,
        pipelineId: selectedPipelineId,
        probability,
        rotting,
        rottingDays,
      });
    }
  };

  const handleClose = () => {
    if (isEditing) {
      setEditingStage(null);
    } else {
      setIsAddingStage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Column Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="probability" className="block text-sm font-medium mb-1">
                  Probability ({probability}%)
                </label>
                <input
                  id="probability"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={probability}
                  onChange={(e) => setProbability(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="rotting"
                  type="checkbox"
                  checked={rotting}
                  onChange={(e) => setRotting(e.target.checked)}
                  className="h-4 w-4 mr-2"
                />
                <label htmlFor="rotting" className="text-sm font-medium">
                  Enable Deal Rotting
                </label>
              </div>

              {rotting && (
                <div>
                  <label htmlFor="rottingDays" className="block text-sm font-medium mb-1">
                    Days until rotting: {rottingDays}
                  </label>
                  <input
                    id="rottingDays"
                    type="range"
                    min="1"
                    max="30"
                    value={rottingDays}
                    onChange={(e) => setRottingDays(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  {isEditing ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default StageDialog;
