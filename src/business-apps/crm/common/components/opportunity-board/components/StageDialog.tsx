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
    <div className="gba:fixed gba:inset-0 gba:bg-black/50 gba:flex gba:items-center gba:justify-center gba:p-4 gba:z-50">
      <div className="gba:bg-white gba:dark:bg-gray-800 gba:rounded-lg gba:shadow-lg gba:max-w-md gba:w-full">
        <div className="gba:p-6">
          <h2 className="gba:text-xl gba:font-semibold gba:mb-4">{title}</h2>
          <form onSubmit={handleSubmit}>
            <div className="gba:space-y-4">
              <div>
                <label htmlFor="name" className="gba:block gba:text-sm gba:font-medium gba:mb-1">
                  Column Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="gba:w-full gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:dark:border-gray-600 gba:rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="probability" className="gba:block gba:text-sm gba:font-medium gba:mb-1">
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
                  className="gba:w-full"
                />
              </div>

              <div className="gba:flex gba:items-center">
                <input
                  id="rotting"
                  type="checkbox"
                  checked={rotting}
                  onChange={(e) => setRotting(e.target.checked)}
                  className="gba:h-4 gba:w-4 gba:mr-2"
                />
                <label htmlFor="rotting" className="gba:text-sm gba:font-medium">
                  Enable Deal Rotting
                </label>
              </div>

              {rotting && (
                <div>
                  <label htmlFor="rottingDays" className="gba:block gba:text-sm gba:font-medium gba:mb-1">
                    Days until rotting: {rottingDays}
                  </label>
                  <input
                    id="rottingDays"
                    type="range"
                    min="1"
                    max="30"
                    value={rottingDays}
                    onChange={(e) => setRottingDays(parseInt(e.target.value))}
                    className="gba:w-full"
                  />
                </div>
              )}

              <div className="gba:flex gba:justify-end gba:space-x-2 gba:pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="gba:px-4 gba:py-2 gba:border gba:border-gray-300 gba:dark:border-gray-600 gba:rounded-md gba:text-sm gba:font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded-md gba:text-sm gba:font-medium gba:hover:bg-blue-700"
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