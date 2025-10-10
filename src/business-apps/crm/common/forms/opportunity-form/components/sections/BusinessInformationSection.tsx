import React, { useState } from 'react'
import { Form, Input, Switch, Divider, Typography, Button, Select, Space } from 'antd'
import { DownOutlined, RightOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useOpportunityFormContext } from '../../context/OpportunityFormContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input

interface BusinessInformationSectionProps {
  prefixDataTestId: string
}

const BusinessInformationSection: React.FC<BusinessInformationSectionProps> = ({ prefixDataTestId }) => {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const { formValues, setFormValues, addressTypes, communicationChannelTypes, recordStates } =
    useOpportunityFormContext()

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Address management functions
  const addAddress = () => {
    const newAddress = {
      addressType: 'BUSINESS',
      addressLine: '',
      postalCode: '',
      city: '',
      region: '',
      country: ''
    }
    setFormValues({
      addresses: [...formValues.addresses, newAddress]
    })
  }

  const removeAddress = (index: number) => {
    const updatedAddresses = formValues.addresses.filter((_, i) => i !== index)
    setFormValues({ addresses: updatedAddresses })
  }

  const updateAddress = (index: number, field: string, value: string) => {
    const updatedAddresses = [...formValues.addresses]
    updatedAddresses[index] = { ...updatedAddresses[index], [field]: value }
    setFormValues({ addresses: updatedAddresses })
  }

  // Communication channel management functions
  const addCommunicationChannel = () => {
    const newChannel = {
      channelType: 'EMAIL',
      channelValue: '',
      isPrimary: false
    }
    setFormValues({
      communicationChannels: [...formValues.communicationChannels, newChannel]
    })
  }

  const removeCommunicationChannel = (index: number) => {
    const updatedChannels = formValues.communicationChannels.filter((_, i) => i !== index)
    setFormValues({ communicationChannels: updatedChannels })
  }

  const updateCommunicationChannel = (index: number, field: string, value: any) => {
    const updatedChannels = [...formValues.communicationChannels]
    updatedChannels[index] = { ...updatedChannels[index], [field]: value }
    setFormValues({ communicationChannels: updatedChannels })
  }

  // Tag management functions
  const addTag = () => {
    const newTag = {
      tagName: '',
      tagValue: ''
    }
    setFormValues({
      tags: [...formValues.tags, newTag]
    })
  }

  const removeTag = (index: number) => {
    const updatedTags = formValues.tags.filter((_, i) => i !== index)
    setFormValues({ tags: updatedTags })
  }

  const updateTag = (index: number, field: string, value: string) => {
    const updatedTags = [...formValues.tags]
    updatedTags[index] = { ...updatedTags[index], [field]: value }
    setFormValues({ tags: updatedTags })
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'BusinessInformationSection')}
      style={{
        marginBottom: '24px',
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        onClick={toggleCollapse}
        style={{
          background: 'linear-gradient(135deg, #fff7e6 0%, #ffec99 100%)',
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isCollapsed ? 'none' : '1px solid #d9d9d9',
          transition: 'all 0.3s ease'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'BusinessInformationSection-Header')}
      >
        <Title level={5} style={{ margin: 0, color: '#8c4400' }}>
          Business Information
        </Title>
        {isCollapsed ? <RightOutlined /> : <DownOutlined />}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div style={{ padding: '24px' }}>
          {/* Basic Business Fields */}
          <Form.Item label="Business Key" name="businessKey" style={{ marginBottom: '16px' }}>
            <Input
              data-testid={formatDataTestId(prefixDataTestId, 'BusinessKey')}
              value={formValues.businessKey}
              onChange={e => setFormValues({ businessKey: e.target.value })}
              placeholder="Enter business key"
            />
          </Form.Item>

          <Form.Item label="Code" name="code" style={{ marginBottom: '16px' }}>
            <Input
              data-testid={formatDataTestId(prefixDataTestId, 'Code')}
              value={formValues.code}
              onChange={e => setFormValues({ code: e.target.value })}
              placeholder="Enter opportunity code"
            />
          </Form.Item>

          <Form.Item label="Source Application" name="sourceApp" style={{ marginBottom: '16px' }}>
            <Input
              data-testid={formatDataTestId(prefixDataTestId, 'SourceApp')}
              value={formValues.sourceApp}
              onChange={e => setFormValues({ sourceApp: e.target.value })}
              placeholder="Enter source application"
            />
          </Form.Item>

          <Form.Item label="Record State" name="recordState" style={{ marginBottom: '16px' }}>
            <Select
              data-testid={formatDataTestId(prefixDataTestId, 'RecordState')}
              value={formValues.recordState}
              onChange={value => setFormValues({ recordState: value })}
              placeholder="Select record state"
            >
              {recordStates.map(state => (
                <Option key={state.id} value={state.value}>
                  {state.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Personal Opportunity"
            name="personal"
            valuePropName="checked"
            style={{ marginBottom: '24px' }}
          >
            <Switch
              data-testid={formatDataTestId(prefixDataTestId, 'Personal')}
              checked={formValues.personal}
              onChange={checked => setFormValues({ personal: checked })}
            />
          </Form.Item>

          <Divider />

          {/* Addresses Section */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}
            >
              <Title level={5} style={{ margin: 0 }}>
                Addresses
              </Title>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addAddress}
                data-testid={formatDataTestId(prefixDataTestId, 'AddAddress')}
              >
                Add Address
              </Button>
            </div>

            {formValues.addresses.map((address, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: '#fafafa'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Address {index + 1}</span>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeAddress(index)}
                    data-testid={formatDataTestId(prefixDataTestId, `RemoveAddress-${index}`)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Form.Item label="Address Type" style={{ marginBottom: '12px' }}>
                    <Select
                      value={address.addressType}
                      onChange={value => updateAddress(index, 'addressType', value)}
                      data-testid={formatDataTestId(prefixDataTestId, `AddressType-${index}`)}
                    >
                      {addressTypes.map(type => (
                        <Option key={type.id} value={type.value}>
                          {type.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Country" style={{ marginBottom: '12px' }}>
                    <Input
                      value={address.country}
                      onChange={e => updateAddress(index, 'country', e.target.value)}
                      placeholder="Country"
                      data-testid={formatDataTestId(prefixDataTestId, `AddressCountry-${index}`)}
                    />
                  </Form.Item>

                  <Form.Item label="Address Line" style={{ marginBottom: '12px', gridColumn: 'span 2' }}>
                    <Input
                      value={address.addressLine}
                      onChange={e => updateAddress(index, 'addressLine', e.target.value)}
                      placeholder="Street address"
                      data-testid={formatDataTestId(prefixDataTestId, `AddressLine-${index}`)}
                    />
                  </Form.Item>

                  <Form.Item label="City" style={{ marginBottom: '12px' }}>
                    <Input
                      value={address.city}
                      onChange={e => updateAddress(index, 'city', e.target.value)}
                      placeholder="City"
                      data-testid={formatDataTestId(prefixDataTestId, `AddressCity-${index}`)}
                    />
                  </Form.Item>

                  <Form.Item label="Postal Code" style={{ marginBottom: '12px' }}>
                    <Input
                      value={address.postalCode}
                      onChange={e => updateAddress(index, 'postalCode', e.target.value)}
                      placeholder="Postal code"
                      data-testid={formatDataTestId(prefixDataTestId, `AddressPostalCode-${index}`)}
                    />
                  </Form.Item>

                  <Form.Item label="Region" style={{ marginBottom: '0' }}>
                    <Input
                      value={address.region}
                      onChange={e => updateAddress(index, 'region', e.target.value)}
                      placeholder="State/Region"
                      data-testid={formatDataTestId(prefixDataTestId, `AddressRegion-${index}`)}
                    />
                  </Form.Item>
                </div>
              </div>
            ))}
          </div>

          <Divider />

          {/* Communication Channels Section */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}
            >
              <Title level={5} style={{ margin: 0 }}>
                Communication Channels
              </Title>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addCommunicationChannel}
                data-testid={formatDataTestId(prefixDataTestId, 'AddCommunicationChannel')}
              >
                Add Channel
              </Button>
            </div>

            {formValues.communicationChannels.map((channel, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: '#fafafa'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Channel {index + 1}</span>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeCommunicationChannel(index)}
                    data-testid={formatDataTestId(prefixDataTestId, `RemoveCommunicationChannel-${index}`)}
                  />
                </div>

                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px', gap: '12px', alignItems: 'center' }}
                >
                  <Form.Item label="Type" style={{ marginBottom: '0' }}>
                    <Select
                      value={channel.channelType}
                      onChange={value => updateCommunicationChannel(index, 'channelType', value)}
                      data-testid={formatDataTestId(prefixDataTestId, `ChannelType-${index}`)}
                    >
                      {communicationChannelTypes.map(type => (
                        <Option key={type.id} value={type.value}>
                          {type.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Value" style={{ marginBottom: '0' }}>
                    <Input
                      value={channel.channelValue}
                      onChange={e => updateCommunicationChannel(index, 'channelValue', e.target.value)}
                      placeholder="Enter value"
                      data-testid={formatDataTestId(prefixDataTestId, `ChannelValue-${index}`)}
                    />
                  </Form.Item>

                  <Form.Item label="Primary" style={{ marginBottom: '0' }}>
                    <Switch
                      checked={channel.isPrimary}
                      onChange={checked => updateCommunicationChannel(index, 'isPrimary', checked)}
                      data-testid={formatDataTestId(prefixDataTestId, `ChannelPrimary-${index}`)}
                    />
                  </Form.Item>
                </div>
              </div>
            ))}
          </div>

          <Divider />

          {/* Tags Section */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}
            >
              <Title level={5} style={{ margin: 0 }}>
                Tags
              </Title>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addTag}
                data-testid={formatDataTestId(prefixDataTestId, 'AddTag')}
              >
                Add Tag
              </Button>
            </div>

            {formValues.tags.map((tag, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: '#fafafa'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Tag {index + 1}</span>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeTag(index)}
                    data-testid={formatDataTestId(prefixDataTestId, `RemoveTag-${index}`)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Form.Item label="Tag Name" style={{ marginBottom: '0' }}>
                    <Input
                      value={tag.tagName}
                      onChange={e => updateTag(index, 'tagName', e.target.value)}
                      placeholder="Tag name"
                      data-testid={formatDataTestId(prefixDataTestId, `TagName-${index}`)}
                    />
                  </Form.Item>

                  <Form.Item label="Tag Value" style={{ marginBottom: '0' }}>
                    <Input
                      value={tag.tagValue}
                      onChange={e => updateTag(index, 'tagValue', e.target.value)}
                      placeholder="Tag value"
                      data-testid={formatDataTestId(prefixDataTestId, `TagValue-${index}`)}
                    />
                  </Form.Item>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Properties */}
          <Form.Item label="Process Instance ID" name="processInstanceId" style={{ marginBottom: '16px' }}>
            <Input
              data-testid={formatDataTestId(prefixDataTestId, 'ProcessInstanceId')}
              value={formValues.processInstanceId}
              onChange={e => setFormValues({ processInstanceId: e.target.value })}
              placeholder="Enter process instance ID"
            />
          </Form.Item>
        </div>
      )}
    </div>
  )
}

export default BusinessInformationSection
