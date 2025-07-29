import React from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Alert,
  Spin
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useMarkAsLostFormContext } from '../context/MarkAsLostFormContext';
import { MarkAsLostFormValues } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MarkAsLostFormComponent: React.FC = () => {
  const {
    isLoading,
    error,
    leadData,
    isSubmitting,
    submitForm,
    cancelForm
  } = useMarkAsLostFormContext();

  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    if (!leadData) return;

    const formValues: MarkAsLostFormValues = {
      id: leadData.id,
      version: leadData.version,
      leadStatusRef: 'lost',
      lostReason: values.lostReason,
      lostComments: values.lostComments
    };

    await submitForm(formValues);
  };

  const handleCancel = async () => {
    await cancelForm();
  };

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="loading-container">
        <Spin size="large" />
        <div className="gba:mt-4">
          <Text>{getTranslationFromI18nKeyAndLabel("common:loading", "Loading...")}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="error-container">
        <Alert
          message={getTranslationFromI18nKeyAndLabel("common:error", "Error")}
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (!leadData) {
    return (
      <div className="gba:p-6" data-testid="no-lead-container">
        <Alert
          message={getTranslationFromI18nKeyAndLabel("crm:lead.notFound", "Lead Not Found")}
          description={getTranslationFromI18nKeyAndLabel("crm:lead.notFoundDescription", "The requested lead could not be found.")}
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="mark-as-lost-form-container">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        data-testid="mark-as-lost-form"
      >
        <Title
          level={3}
          className="gba:!font-bold gba:mb-6 gba:text-center gba:!text-[24px]"
        >
          {getTranslationFromI18nKeyAndLabel(
            "crm:markLeadAsLost.title",
            "Mark Lead as Lost"
          )}
        </Title>

        {/* Warning Alert */}
        <Alert
          message={getTranslationFromI18nKeyAndLabel(
            "crm:markLeadAsLost.warning",
            "Warning"
          )}
          description={getTranslationFromI18nKeyAndLabel(
            "crm:markLeadAsLost.warningDescription",
            "This action will mark the lead as lost. This action cannot be undone."
          )}
          type="warning"
          icon={<ExclamationCircleOutlined />}
          className="gba:mb-6"
          showIcon
        />

        {/* Lead Information Display */}
        <Card className="gba:mb-6" data-testid="lead-info-card">
          <Title level={4} className="gba:!mb-4">
            {getTranslationFromI18nKeyAndLabel(
              "crm:markLeadAsLost.leadInfo",
              "Lead Information"
            )}
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.name", "Name")}</Text>
                <br />
                <Text strong>{leadData.name || `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim()}</Text>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.email", "Email")}</Text>
                <br />
                <Text strong>{leadData.email || 'N/A'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.company", "Company")}</Text>
                <br />
                <Text strong>{leadData.companyName || 'N/A'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.currentStatus", "Current Status")}</Text>
                <br />
                <Text strong>{leadData.status?.value || 'N/A'}</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Lost Reason and Comments */}
        <Card className="gba:mb-6" data-testid="lost-details-card">
          <Title level={4} className="gba:!mb-4">
            {getTranslationFromI18nKeyAndLabel(
              "crm:markLeadAsLost.details",
              "Lost Details"
            )}
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item
                name="lostReason"
                label={getTranslationFromI18nKeyAndLabel("crm:markLeadAsLost.reason", "Reason for Loss")}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:markLeadAsLost.reasonRequired",
                      "Please provide a reason for marking this lead as lost"
                    )
                  }
                ]}
              >
                <Input
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    "crm:markLeadAsLost.reasonPlaceholder",
                    "e.g., Budget constraints, No longer interested, Competitor chosen"
                  )}
                  data-testid="lost-reason-input"
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="lostComments"
                label={getTranslationFromI18nKeyAndLabel("crm:markLeadAsLost.comments", "Additional Comments")}
              >
                <TextArea
                  rows={4}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    "crm:markLeadAsLost.commentsPlaceholder",
                    "Add any additional details about why this lead was lost..."
                  )}
                  data-testid="lost-comments-textarea"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Form Actions */}
        <div className="gba:flex gba:justify-end gba:gap-4 gba:mt-6">
          <Button
            onClick={handleCancel}
            size="large"
            className="gba:min-w-[120px]"
            data-testid="cancel-button"
            disabled={isSubmitting}
          >
            {getTranslationFromI18nKeyAndLabel("common:cancel", "Cancel")}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="gba:min-w-[120px]"
            danger
            data-testid="submit-button"
            loading={isSubmitting}
          >
            {getTranslationFromI18nKeyAndLabel(
              "crm:markLeadAsLost.submit",
              "Mark as Lost"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default MarkAsLostFormComponent; 