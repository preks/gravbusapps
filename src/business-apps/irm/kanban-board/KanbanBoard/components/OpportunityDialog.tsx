import { useState } from "react";
import { useKanbanStore } from "../lib/kanban-store";
import { Input, InputNumber, Button, Form, Modal, Space, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";

export function OpportunityDialog() {
  const { 
    isAddingOpportunity, 
    addingOpportunityStageId, 
    selectedPipelineId,
    addOpportunity, 
    setIsAddingOpportunity 
  } = useKanbanStore();

  const [form] = Form.useForm();
  const [tags, setTags] = useState<string[]>([]);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleCancel = () => {
    setIsAddingOpportunity(false, null);
    form.resetFields();
    setTags([]);
  };

  const handleSubmit = (values: any) => {
    addOpportunity({
      title: values.title,
      description: values.description,
      value: values.value,
      pipelineId: selectedPipelineId,
      stageId: addingOpportunityStageId || '',
      company: values.company,
      contact: values.contact,
      tags: tags.length > 0 ? tags : undefined,
    });
    form.resetFields();
    setTags([]);
  };

  const handleTagClose = (removedTag: string) => {
    const newTags = tags.filter(tag => tag !== removedTag);
    setTags(newTags);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputConfirm = () => {
    if (inputValue && !tags.includes(inputValue)) {
      setTags([...tags, inputValue]);
    }
    setInputVisible(false);
    setInputValue('');
  };

  const showTagInput = () => {
    setInputVisible(true);
  };

  return (
    <Modal
      title="Add New Opportunity"
      open={isAddingOpportunity}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          value: 0,
        }}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="Opportunity title" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea rows={3} placeholder="Describe the opportunity" />
        </Form.Item>

        <Form.Item
          name="value"
          label="Value"
        >
          <InputNumber
            style={{ width: '100%' }}
            formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => {
              if (!value) return 0;
              const parsed = value.replace(/\$\s?|(,*)/g, '');
              const num = isNaN(Number(parsed)) ? 0 : Number(parsed);
              return num as 0;
            }}
            min={0}
          />
        </Form.Item>

        <Form.Item
          name="rottingDays"
          label="Rotting Days"
          tooltip="Number of days before this opportunity is considered stale in its current stage. Overrides the stage's default rotting days."
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            max={30}
            placeholder="Leave empty to use stage default"
          />
        </Form.Item>

        <Form.Item
          name="company"
          label="Company"
          rules={[{ required: true, message: 'Please enter a company name' }]}
        >
          <Input placeholder="Company name" />
        </Form.Item>

        <Form.Item
          name="contact"
          label="Contact Person"
        >
          <Input placeholder="Contact person's name" />
        </Form.Item>

        <Form.Item label="Tags">
          <Space size={[0, 8]} wrap>
            {tags.map(tag => (
              <Tag
                key={tag}
                closable
                onClose={() => handleTagClose(tag)}
              >
                {tag}
              </Tag>
            ))}
            {inputVisible ? (
              <Input
                type="text"
                size="small"
                style={{ width: 78 }}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputConfirm}
                onPressEnter={handleInputConfirm}
                autoFocus
              />
            ) : (
              <Tag onClick={showTagInput} style={{ borderStyle: 'dashed' }}>
                <PlusOutlined /> New Tag
              </Tag>
            )}
          </Space>
        </Form.Item>

        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit">Add Opportunity</Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default OpportunityDialog;
