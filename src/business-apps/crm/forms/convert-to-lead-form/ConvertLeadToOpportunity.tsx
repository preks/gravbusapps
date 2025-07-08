import React, { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Radio,
  Checkbox,
  Select,
  DatePicker,
  Typography,
  InputNumber,
  Spin,
  Divider,
  Card
} from "antd";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";

const { Title, Text } = Typography;

export interface ConvertLeadToOpportunityProps
  extends BusinessAppContextProps {}

const LEAD_QUERY = `
  query GetLead($leadId: uuid!) {
    Lead(where: {id: {_eq: $leadId}}) {
        id
        name
        email
        leadSource {
            value
        }
        status {
            value
        }
        academicTitle {
            value
        }
        academicTitleRef
        firstName
        lastName
        position
        companyName
        companyEmail
        companyPhone
        addresses {
        addressLine
        city
        country {
            value
        }
        postalCode
        }
    }
  }
`;

const ACCOUNTS_AND_CONTACTS_QUERY = `
  query GetAccountsAndContacts {
    Account(limit: 20) { id name }
    Contact(limit: 20) { id firstName lastName email }
  }
`;

export const ConvertLeadToOpportunity: React.FC<
  ConvertLeadToOpportunityProps
> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accountOption, setAccountOption] = useState("match");
  const [contactOption, setContactOption] = useState("match");
  const [createOpportunity, setCreateOpportunity] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(undefined);
  const [selectedContact, setSelectedContact] = useState<string | undefined>(undefined);
  const graphQLClient = useGraphqlClient(accessToken);

  useEffect(() => {
    async function fetchLead() {
      setLoading(true);
      try {
        const data = await graphQLClient.request(LEAD_QUERY, {
          leadId: additionalData?.leadId
        });
        setLeadData(data?.Lead?.[0] || null);
      } catch (e) {
        setLeadData(null);
      } finally {
        setLoading(false);
      }
    }
    if (additionalData?.leadId) fetchLead();
  }, [additionalData?.leadId, graphQLClient]);

  useEffect(() => {
    async function fetchAccountsAndContacts() {
      try {
        const data = await graphQLClient.request(ACCOUNTS_AND_CONTACTS_QUERY, {});
        setAccounts(data?.Account || []);
        setContacts(data?.Contact || []);
        if (data?.Account?.length) setSelectedAccount(data.Account[0].id);
        if (data?.Contact?.length) setSelectedContact(data.Contact[0].id);
      } catch (e) {
        setAccounts([]);
        setContacts([]);
      }
    }
    fetchAccountsAndContacts();
  }, [graphQLClient]);

  const handleSubmit = (values: any) => {
    const payload = {
      changeMode: "INSERT",
      lead: { ...values }
    };
    dispatchProcessContinueEvent("pse_submit", values);
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent("pse_pause", {});
  };

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="convert-lead-form-container">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        data-testid="convert-lead-form"
      >
        <Title
          level={4}
          className="gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]"
        >
          {getTranslationFromI18nKeyAndLabel(
            "crm:convertLead.title",
            "Convert Lead"
          )}
        </Title>
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50">
          <Text strong>
            {getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.leadInfo",
              "Lead Information"
            )}
          </Text>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mt-2">
            <div>
              <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.name", "Name")}</Text>
              <div className="gba:font-medium gba:text-base">{leadData?.name}</div>
            </div>
            <div>
              <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.company", "Company")}</Text>
              <div className="gba:font-medium gba:text-base">{leadData?.companyName}</div>
            </div>
            <div>
              <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.email", "Email")}</Text>
              <div className="gba:font-medium gba:text-base">{leadData?.email}</div>
            </div>
            <div>
              <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.phone", "Phone")}</Text>
              <div className="gba:font-medium gba:text-base">{leadData?.phone}</div>
            </div>
            <div>
              <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.leadSource", "Lead Source")}</Text>
              <div className="gba:font-medium gba:text-base">{leadData?.leadSource?.value}</div>
            </div>
            <div>
              <Text type="secondary">{getTranslationFromI18nKeyAndLabel("crm:lead.status", "Status")}</Text>
              <div className="gba:font-medium gba:text-base">{leadData?.status?.value}</div>
            </div>
          </div>
        </Card>
        <Divider className="gba:my-4" />
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50">
          <Form.Item
            label={getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.accountMatch",
              "Account Matching"
            )}
            className="gba:mb-2"
          >
            <Radio.Group
              value={accountOption}
              onChange={(e) => setAccountOption(e.target.value)}
              className="gba:flex gba:gap-6"
            >
              <Radio value="match">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.matchExistingAccount",
                  "Match existing account"
                )}
              </Radio>
              <Form.Item noStyle shouldUpdate>
                {() =>
                  accountOption === "match" && (
                    <Select
                      className="gba:w-56 gba:ml-2"
                      value={selectedAccount}
                      onChange={setSelectedAccount}
                      style={{ width: 220 }}
                      dropdownClassName="gba:z-50"
                    >
                      {accounts.map((acc) => (
                        <Select.Option key={acc.id} value={acc.id}>
                          {acc.name}
                        </Select.Option>
                      ))}
                    </Select>
                  )
                }
              </Form.Item>
              <Radio value="new">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.createNewAccount",
                  "Create new account"
                )}
              </Radio>
            </Radio.Group>
          </Form.Item>
          {accountOption === "new" && (
            <Form.Item
              name="newAccountName"
              label={getTranslationFromI18nKeyAndLabel(
                "crm:convertLead.newAccountName",
                "New Account Name"
              )}
              rules={[
                {
                  required: true,
                  message: getTranslationFromI18nKeyAndLabel(
                    "crm:convertLead.newAccountNameRequired",
                    "Please enter account name"
                  )
                }
              ]}
            >
              <Input className="gba:w-full" />
            </Form.Item>
          )}
        </Card>
        <Divider className="gba:my-4" />
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50">
          <Form.Item
            label={getTranslationFromI18nKeyAndLabel(
              "crm:convertLead.contactMatch",
              "Contact Matching"
            )}
            className="gba:mb-2"
          >
            <Radio.Group
              value={contactOption}
              onChange={(e) => setContactOption(e.target.value)}
              className="gba:flex gba:gap-6"
            >
              <Radio value="match">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.matchExistingContact",
                  "Match existing contact"
                )}
              </Radio>
              <Form.Item noStyle shouldUpdate>
                {() =>
                  contactOption === "match" && (
                    <Select
                      className="gba:w-56 gba:ml-2"
                      value={selectedContact}
                      onChange={setSelectedContact}
                      style={{ width: 220 }}
                      dropdownClassName="gba:z-50"
                    >
                      {contacts.map((c) => (
                        <Select.Option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ""}
                        </Select.Option>
                      ))}
                    </Select>
                  )
                }
              </Form.Item>
              <Radio value="new">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.createNewContact",
                  "Create new contact"
                )}
              </Radio>
            </Radio.Group>
          </Form.Item>
          {contactOption === "new" && (
            <>
              <Form.Item
                name="newContactFirstName"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.newContactFirstName",
                  "First Name"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.newContactFirstNameRequired",
                      "Please enter first name"
                    )
                  }
                ]}
              >
                <Input className="gba:w-full" />
              </Form.Item>
              <Form.Item
                name="newContactLastName"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.newContactLastName",
                  "Last Name"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.newContactLastNameRequired",
                      "Please enter last name"
                    )
                  }
                ]}
              >
                <Input className="gba:w-full" />
              </Form.Item>
              <Form.Item
                name="newContactEmail"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.newContactEmail",
                  "Email"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.newContactEmailRequired",
                      "Please enter email"
                    )
                  }
                ]}
              >
                <Input className="gba:w-full" />
              </Form.Item>
            </>
          )}
        </Card>
        <Divider className="gba:my-4" />
        <Card className="gba:mb-6 gba:border-none gba:bg-gray-50">
          <Form.Item className="gba:mb-2">
            <Checkbox
              checked={createOpportunity}
              onChange={(e) => setCreateOpportunity(e.target.checked)}
            >
              {getTranslationFromI18nKeyAndLabel(
                "crm:convertLead.createOpportunity",
                "Create Opportunity?"
              )}
            </Checkbox>
          </Form.Item>
          {createOpportunity && (
            <>
              <Form.Item
                name="opportunityName"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.opportunityName",
                  "Opportunity Name"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.opportunityNameRequired",
                      "Please enter opportunity name"
                    )
                  }
                ]}
              >
                <Input className="gba:w-full" />
              </Form.Item>
              <Form.Item
                name="estimatedAmount"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.estimatedAmount",
                  "Estimated Amount"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.estimatedAmountRequired",
                      "Please enter estimated amount"
                    )
                  }
                ]}
              >
                <InputNumber
                  className="gba:w-full"
                  min={0}
                  prefix="$"
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Form.Item
                name="closeDate"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.closeDate",
                  "Close Date"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.closeDateRequired",
                      "Please select close date"
                    )
                  }
                ]}
              >
                <DatePicker className="gba:w-full" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="stage"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:convertLead.stage",
                  "Stage"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:convertLead.stageRequired",
                      "Please select stage"
                    )
                  }
                ]}
              >
                <Select className="gba:w-full">
                  <Select.Option value="qualification">
                    Qualification
                  </Select.Option>
                  <Select.Option value="proposal">Proposal</Select.Option>
                  <Select.Option value="negotiation">Negotiation</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
        </Card>
        <Divider className="gba:my-4" />
        {/* Actions Section */}
        <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
          <Button
            data-testid="cancel-button"
            onClick={handleCancel}
            className="gba:bg-gray-200 gba:text-gray-800"
          >
            {getTranslationFromI18nKeyAndLabel("crm:common.cancel", "Cancel")}
          </Button>
          <Button
            data-testid="submit-button"
            type="primary"
            htmlType="submit"
            className="gba:bg-blue-600 gba:text-white"
          >
            {getTranslationFromI18nKeyAndLabel(
              "crm:common.submit",
              "Convert Lead"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ConvertLeadToOpportunity;
