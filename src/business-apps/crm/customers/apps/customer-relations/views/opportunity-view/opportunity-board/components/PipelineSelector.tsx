import { useState, useEffect } from 'react'
import { useKanbanStore } from '../lib/kanban-store'
import { DownOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { Button, Tooltip, Popconfirm } from 'antd'
import { getPlatformContext } from '@/common/utils/windowUtils'

interface BusinessAppContextProps {
  accessToken: string
  userInfo?: any
  employeeId?: string
  structureId?: string
}

export function PipelineSelector({ accessToken }: BusinessAppContextProps) {
  const {
    pipelines,
    selectedPipelineId,
    selectPipeline,
    fetchPipelines,
    setIsAddingPipeline,
    setEditingPipelineId: setEditingPipeline,
    deleteStage: deletePipeline
  } = useKanbanStore()

  const [isOpen, setIsOpen] = useState(false)
  const selectedPipeline = pipelines.find((p: any) => p.id === selectedPipelineId)

  // Check if user is a manager - simplified permission check
  const platformContext = getPlatformContext()
  // In a real implementation, you would check specific roles/permissions
  // For now just check if platform context exists - type check to handle the union type
  const isSalesManager = !!platformContext && 'employeeId' in platformContext

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleSelectPipeline = (pipelineId: string) => {
    selectPipeline(pipelineId)
    setIsOpen(false)
  }

  const handleAddPipeline = () => {
    setIsAddingPipeline(true)
  }

  const handleEditPipeline = () => {
    setEditingPipeline(selectedPipelineId)
  }

  const handleDeletePipeline = () => {
    deletePipeline(selectedPipelineId)
  }

  useEffect(() => {
    const loadPipelines = async () => {
      if (accessToken) {
        console.log('PipelineSelector: Loading pipelines with accessToken')
        const fetchedPipelines = await fetchPipelines(accessToken)
        if (fetchedPipelines.length > 0 && !selectedPipelineId) {
          selectPipeline(fetchedPipelines[0].id)
        }
      } else {
        console.error('PipelineSelector: No accessToken provided')
      }
    }
    loadPipelines()
  }, [accessToken, fetchPipelines, selectPipeline, selectedPipelineId])

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
      <div className="gba:relative">
        <button
          onClick={toggleDropdown}
          className="gba:flex gba:items-center gba:justify-between gba:w-64 gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-left gba:bg-white gba:dark:bg-gray-800 gba:border gba:border-gray-300 gba:dark:border-gray-700 gba:rounded-md gba:shadow-sm gba:hover:bg-gray-50 gba:dark:hover:bg-gray-700"
          style={{ minWidth: '240px' }}
        >
          <div className="gba:flex-1 gba:mr-4">
            <span className="gba:block gba:font-medium">{selectedPipeline?.name}</span>
            <span className="gba:block gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
              {selectedPipeline?.category}
            </span>
          </div>
          <DownOutlined style={{ fontSize: '14px' }} />
        </button>

        {isOpen && (
          <div className="gba:absolute gba:z-10 gba:mt-1 gba:w-full gba:bg-white gba:dark:bg-gray-800 gba:shadow-lg gba:rounded-md gba:border gba:border-gray-200 gba:dark:border-gray-700">
            <ul className="gba:py-1 gba:max-h-60 gba:overflow-auto">
              {pipelines.map((pipeline: any) => (
                <li key={pipeline.id}>
                  <button
                    onClick={() => handleSelectPipeline(pipeline.id)}
                    className={`gba:flex gba:items-center gba:justify-between gba:w-full gba:px-4 gba:py-2 gba:text-sm gba:hover:bg-gray-100 gba:dark:hover:bg-gray-700 ${pipeline.id === selectedPipelineId ? 'gba:bg-gray-100 gba:dark:bg-gray-700' : ''}`}
                  >
                    <div className="gba:flex-1 gba:mr-4">
                      <span className="gba:block gba:font-medium">{pipeline.name}</span>
                      <span className="gba:block gba:text-xs gba:text-gray-500 gba:dark:text-gray-400">
                        {pipeline.category}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isSalesManager && (
        <div className="gba:flex gba:gap-1">
          <Tooltip title="Add Pipeline">
            <Button icon={<PlusOutlined />} size="small" type="primary" onClick={handleAddPipeline} />
          </Tooltip>
          <Tooltip title="Edit Pipeline">
            <Button icon={<EditOutlined />} size="small" onClick={handleEditPipeline} />
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
  )
}

export default PipelineSelector
