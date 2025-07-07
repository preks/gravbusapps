import React from 'react';
import { Input } from 'antd';
import { PlusCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';

export const TasksSection: React.FC = () => {
  const {
    tasks,
    newTaskTitle,
    isAddingTask,
    setNewTaskTitle,
    setIsAddingTask,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
    getPriorityColor
  } = useTasks();

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        marginBottom: '24px'
      }}
    >
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #f0f0f0'
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: '500' }}>
          Tasks
        </div>
        <button 
          onClick={() => setIsAddingTask(true)}
          style={{
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
          data-testid="add-task-button"
        >
          <PlusCircleOutlined style={{ marginRight: '4px' }} />
          Add Task
        </button>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {/* Add Task Form */}
        {isAddingTask && (
          <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
            <div style={{ marginBottom: '8px' }}>
              <Input
                placeholder="Enter task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onPressEnter={handleAddTask}
                style={{ marginBottom: '8px' }}
                data-testid="new-task-input"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAddTask}
                style={{
                  backgroundColor: '#1890ff',
                  color: 'white',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                data-testid="save-task-button"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskTitle('');
                }}
                style={{
                  backgroundColor: 'white',
                  color: '#666',
                  border: '1px solid #d9d9d9',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                data-testid="cancel-task-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {tasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.map((task) => (
              <div 
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  backgroundColor: task.completed ? '#f6ffed' : 'white'
                }}
                data-testid={`task-item-${task.id}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: task.completed ? '#52c41a' : '#d9d9d9',
                      fontSize: '16px'
                    }}
                    data-testid={`task-toggle-${task.id}`}
                  >
                    {task.completed ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                  </button>
                  
                  <div style={{ flex: 1 }}>
                    <div 
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? '#8c8c8c' : '#000'
                      }}
                    >
                      {task.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: getPriorityColor(task.priority),
                        marginRight: '6px'
                      }} />
                      {task.priority} priority • {task.assignedTo} • {dayjs(task.createdAt).format('MMM D, YYYY')}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ff4d4f',
                    fontSize: '14px',
                    padding: '4px'
                  }}
                  data-testid={`task-delete-${task.id}`}
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No tasks yet</div>
            <div style={{ fontSize: '14px' }}>Add tasks to track your progress with this lead</div>
          </div>
        )}
      </div>
    </div>
  );
}; 