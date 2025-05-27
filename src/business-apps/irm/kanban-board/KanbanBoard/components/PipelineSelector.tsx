import { useState } from "react";
import { useKanbanStore } from "../lib/kanban-store";
import { DownOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Tooltip, Popconfirm } from "antd";
import { currentUser } from "../lib/data";

export function PipelineSelector() {
  const { 
    pipelines, 
    selectedPipelineId, 
    selectPipeline,
    deletePipeline,
    setIsAddingPipeline,
    setEditingPipeline
  } = useKanbanStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const selectedPipeline = pipelines.find((p: any) => p.id === selectedPipelineId);
  const isSalesManager = currentUser.role === 'sales_manager';

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectPipeline = (pipelineId: string) => {
    selectPipeline(pipelineId);
    setIsOpen(false);
  };

  const handleAddPipeline = () => {
    setIsAddingPipeline(true);
  };

  const handleEditPipeline = () => {
    setEditingPipeline(selectedPipelineId);
  };

  const handleDeletePipeline = () => {
    deletePipeline(selectedPipelineId);
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="relative">
        <button
          onClick={toggleDropdown}
          className="flex items-center justify-between w-64 px-4 py-2 text-sm font-medium text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          style={{ minWidth: '240px' }}
        >
          <div className="flex-1 mr-4">
            <span className="block font-medium">{selectedPipeline?.name}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">{selectedPipeline?.category}</span>
          </div>
          <DownOutlined style={{ fontSize: '14px' }} />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
            <ul className="py-1 max-h-60 overflow-auto">
              {pipelines.map((pipeline: any) => (
                <li key={pipeline.id}>
                  <button
                    onClick={() => handleSelectPipeline(pipeline.id)}
                    className={`flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${pipeline.id === selectedPipelineId ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                  >
                    <div className="flex-1 mr-4">
                      <span className="block font-medium">{pipeline.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{pipeline.category}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isSalesManager && (
        <div className="flex gap-1">
          <Tooltip title="Add Pipeline">
            <Button 
              icon={<PlusOutlined />} 
              size="small" 
              type="primary" 
              onClick={handleAddPipeline}
            />
          </Tooltip>
          <Tooltip title="Edit Pipeline">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={handleEditPipeline}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Pipeline"
            description="Are you sure you want to delete this pipeline?"
            onConfirm={handleDeletePipeline}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Pipeline">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </div>
      )}
    </div>
  );
}

export default PipelineSelector;
