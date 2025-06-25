import React from 'react';
import { Card, List, Typography, Avatar, Divider } from 'antd';
import { ExpensePlanComment } from '../types/expensePlanRecord.types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { UserOutlined, CommentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface ExpensePlanCommentsProps {
  comments: ExpensePlanComment[];
}

const { Text, Paragraph } = Typography;

const ExpensePlanComments: React.FC<ExpensePlanCommentsProps> = ({ comments }) => {
  // Format date helper function
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD.MM.YYYY HH:mm');
  };

  // Sort comments by date (newest first)
  const sortedComments = [...comments].sort(
    (a, b) => dayjs(b.commentDate).unix() - dayjs(a.commentDate).unix()
  );

  return (
    <Card 
      title={getTranslationFromI18nKeyAndLabel('expense.plan.comments.title', 'Comments')} 
      
      data-testid="expense-plan-comments"
    >
      {sortedComments.length === 0 ? (
        <div className="gba:text-center gba:py-8">
          <CommentOutlined className="gba:text-4xl gba:text-gray-300" />
          <Paragraph className="gba:mt-2 gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel('expense.plan.comments.empty', 'No comments available')}
          </Paragraph>
        </div>
      ) : (
        <List
          itemLayout="vertical"
          dataSource={sortedComments}
          renderItem={(comment, index) => (
            <List.Item key={`comment-${index}`}>
              <div className="gba:flex gba:items-start gba:gap-4">
                <Avatar 
                  icon={<UserOutlined />} 
                  className="gba:bg-blue-500"
                  size="large"
                />
                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                    <Text strong>{getTranslationFromI18nKeyAndLabel('expense.plan.comments.system', 'System')}</Text>
                    <Text type="secondary">{formatDate(comment.commentDate)}</Text>
                  </div>
                  
                  <Paragraph>{comment.comment}</Paragraph>
                  
                  <div className="gba:mt-2">
                    <Text type="secondary">
                      {getTranslationFromI18nKeyAndLabel('expense.plan.comments.type', 'Type')}: {' '}
                      <Text strong>{comment.commentType}</Text>
                    </Text>
                  </div>
                </div>
              </div>
              <Divider className="gba:my-4" />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default ExpensePlanComments;
