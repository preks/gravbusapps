import { useEffect } from 'react'
import { useKanbanStore } from '../lib/kanban-store'
import { Form, Input, Modal } from 'antd'

export function PipelineDialog() {
  const {
    isAddingPipeline,
    isEditingPipeline,
    editingPipelineId,
    pipelines,
    addPipeline,
    updatePipeline,
    setIsAddingPipeline,
    setEditingPipeline
  } = useKanbanStore()

  const [form] = Form.useForm()
  const isOpen = isAddingPipeline || isEditingPipeline
  const isEditing = isEditingPipeline
  const title = isEditing ? 'Edit Pipeline' : 'Add Pipeline'

  const editingPipeline = isEditing && editingPipelineId ? pipelines.find(p => p.id === editingPipelineId) : null

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingPipeline) {
        form.setFieldsValue({
          name: editingPipeline.name,
          isDefault: editingPipeline.isDefault || false
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          isDefault: false
        })
      }
    }
  }, [isOpen, isEditing, editingPipeline, form])

  const handleCancel = () => {
    if (isEditing) {
      setEditingPipeline(null)
    } else {
      setIsAddingPipeline(false)
    }
    form.resetFields()
  }

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (isEditing && editingPipelineId) {
        updatePipeline(editingPipelineId, values)
      } else {
        addPipeline(values)
      }
      form.resetFields()
    })
  }

  return (
    <Modal title={title} open={isOpen} onCancel={handleCancel} onOk={handleSubmit} destroyOnClose>
      <Form form={form} layout="vertical" name="pipeline_form">
        <Form.Item
          name="name"
          label="Pipeline Name"
          rules={[{ required: true, message: 'Please enter a pipeline name' }]}
        >
          <Input placeholder="Enter pipeline name" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default PipelineDialog
