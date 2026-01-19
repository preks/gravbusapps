import React, { useState, useEffect } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Card,
  Row,
  Col,
  Divider,
  Typography,
  DatePicker,
  Spin,
  Alert
} from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import { createProduct } from './queries/productFormQueries'
import { PRODUCT_TYPE_CODES, PRODUCT_STRUCTURES } from '../../apps/product-management-overview/types'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

export interface ProductFormProps extends BusinessAppContextProps {
  onCancel?: () => void
  onSuccess?: (productId: string) => void
  initialData?: any
  isEditing?: boolean
  inModal?: boolean
}

interface ProductFormData {
  name: string
  productNumber: string
  description?: string
  price: number
  priceBase?: number
  currentCost?: number
  currentCostBase?: number
  supplierName?: string
  productTypeCode: string
  productStructure: string
  isKit: boolean
  isStockItem: boolean
  stateCode: string
  quantityOnHand?: number
  validFromDate?: string
  validToDate?: string
}

const ProductForm: React.FC<ProductFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onCancel,
  onSuccess,
  initialData,
  isEditing = false,
  inModal = false
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const graphQLClient = useGraphqlClient(accessToken)

  // Early return if no accessToken is provided
  if (!accessToken) {
    return (
      <div className="gba:p-6" data-testid="no-access-token">
        <Alert
          message="Access Token Required"
          description="This component requires an access token to function properly."
          type="warning"
          showIcon
        />
      </div>
    )
  }

  useEffect(() => {
    if (initialData && isEditing) {
      form.setFieldsValue({
        ...initialData,
        validFromDate: initialData.validFromDate ? dayjs(initialData.validFromDate) : null,
        validToDate: initialData.validToDate ? dayjs(initialData.validToDate) : null
      })
    }
  }, [initialData, isEditing, form])

  const handleSubmit = async (values: ProductFormData) => {
    setSubmitting(true)
    try {
      // Prepare the product data
      const productData = {
        name: values.name,
        productNumber: values.productNumber,
        description: values.description || null,
        price: values.price,
        priceBase: values.priceBase || values.price,
        currentCost: values.currentCost || 0,
        currentCostBase: values.currentCostBase || values.currentCost || 0,
        supplierName: values.supplierName || null,
        productTypeCode: values.productTypeCode,
        productStructure: values.productStructure,
        isKit: values.isKit || false,
        isStockItem: values.isStockItem || false,
        stateCode: values.stateCode || 'Draft',
        statusCode: 'Active',
        quantityOnHand: values.isStockItem ? values.quantityOnHand || 0 : null,
        validFromDate: values.validFromDate ? dayjs(values.validFromDate).toISOString() : null,
        validToDate: values.validToDate ? dayjs(values.validToDate).toISOString() : null,
        isDeleted: false
      }

      if (isEditing) {
        // For editing, dispatch the update data
        const payload = {
          changeMode: 'UPDATE',
          product: {
            ...productData,
            id: initialData?.id,
            version: initialData?.version || 0
          }
        }
        dispatchProcessContinueEvent('pse_submit', payload)
      } else {
        // For creation, use GraphQL mutation
        const response = await graphQLClient.request(createProduct, {
          input: productData
        })

        if (response?.insert_nwSalesProduct_one?.id) {
          const newProductId = response.insert_nwSalesProduct_one.id

          // Dispatch success event for process continuation
          const payload = {
            changeMode: 'INSERT',
            product: {
              ...productData,
              id: newProductId
            }
          }
          dispatchProcessContinueEvent('pse_submit', payload)

          // Call success callback if provided
          if (onSuccess) {
            onSuccess(newProductId)
          }
        }
      }
    } catch (error) {
      console.error('Error submitting product form:', error)
      // You might want to show an error message here
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      // Dispatch cancel event for process continuation
      dispatchProcessContinueEvent('pse_cancel', {})
    }
  }

  const formTitle = isEditing
    ? getTranslationFromI18nKeyAndLabel('sales:product.editProduct', 'Edit Product')
    : getTranslationFromI18nKeyAndLabel('sales:product.createProduct', 'Create Product')

  const formContent = (
    <Spin spinning={loading}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false} data-testid="product-form">
        {/* Basic Information */}
        <Divider orientation="left">
          {getTranslationFromI18nKeyAndLabel('sales:product.basicInformation', 'Basic Information')}
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label={getTranslationFromI18nKeyAndLabel('sales:product.productName', 'Product Name')}
              rules={[{ required: true, message: 'Please enter product name' }]}
              data-testid="product-name-field"
            >
              <Input placeholder="Enter product name" data-testid="product-name-input" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="productNumber"
              label={getTranslationFromI18nKeyAndLabel('sales:product.productNumber', 'Product Number')}
              rules={[{ required: true, message: 'Please enter product number' }]}
              data-testid="product-number-field"
            >
              <Input placeholder="Enter product number" data-testid="product-number-input" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label={getTranslationFromI18nKeyAndLabel('sales:product.description', 'Description')}
              data-testid="product-description-field"
            >
              <TextArea rows={3} placeholder="Enter product description" data-testid="product-description-input" />
            </Form.Item>
          </Col>
        </Row>

        {/* Product Classification */}
        <Divider orientation="left">
          {getTranslationFromI18nKeyAndLabel('sales:product.classification', 'Product Classification')}
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="productTypeCode"
              label={getTranslationFromI18nKeyAndLabel('sales:product.productType', 'Product Type')}
              rules={[{ required: true, message: 'Please select product type' }]}
              data-testid="product-type-field"
            >
              <Select placeholder="Select product type" data-testid="product-type-select">
                {PRODUCT_TYPE_CODES.map(type => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="productStructure"
              label={getTranslationFromI18nKeyAndLabel('sales:product.productStructure', 'Product Structure')}
              rules={[{ required: true, message: 'Please select product structure' }]}
              data-testid="product-structure-field"
            >
              <Select placeholder="Select product structure" data-testid="product-structure-select">
                {PRODUCT_STRUCTURES.map(structure => (
                  <Option key={structure} value={structure}>
                    {structure}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="stateCode"
              label={getTranslationFromI18nKeyAndLabel('sales:product.status', 'Status')}
              initialValue="Draft"
              data-testid="product-status-field"
            >
              <Select data-testid="product-status-select">
                <Option value="Draft">Draft</Option>
                <Option value="Active">Active</Option>
                <Option value="Inactive">Inactive</Option>
                <Option value="Discontinued">Discontinued</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="supplierName"
              label={getTranslationFromI18nKeyAndLabel('sales:product.supplier', 'Supplier')}
              data-testid="supplier-name-field"
            >
              <Input placeholder="Enter supplier name" data-testid="supplier-name-input" />
            </Form.Item>
          </Col>
        </Row>

        {/* Pricing Information */}
        <Divider orientation="left">
          {getTranslationFromI18nKeyAndLabel('sales:product.pricing', 'Pricing & Cost Information')}
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="price"
              label={getTranslationFromI18nKeyAndLabel('sales:product.price', 'Price')}
              rules={[{ required: true, message: 'Please enter price' }]}
              data-testid="product-price-field"
            >
              <InputNumber
                min={0}
                precision={2}
                placeholder="0.00"
                className="gba:w-full"
                data-testid="product-price-input"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="currentCost"
              label={getTranslationFromI18nKeyAndLabel('sales:product.currentCost', 'Current Cost')}
              data-testid="product-cost-field"
            >
              <InputNumber
                min={0}
                precision={2}
                placeholder="0.00"
                className="gba:w-full"
                data-testid="product-cost-input"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Inventory & Settings */}
        <Divider orientation="left">
          {getTranslationFromI18nKeyAndLabel('sales:product.inventory', 'Inventory & Settings')}
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="isStockItem"
              label={getTranslationFromI18nKeyAndLabel('sales:product.isStockItem', 'Stock Item')}
              valuePropName="checked"
              data-testid="is-stock-item-field"
            >
              <Switch data-testid="is-stock-item-switch" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="isKit"
              label={getTranslationFromI18nKeyAndLabel('sales:product.isKit', 'Kit Product')}
              valuePropName="checked"
              data-testid="is-kit-field"
            >
              <Switch data-testid="is-kit-switch" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.isStockItem !== currentValues.isStockItem}
        >
          {({ getFieldValue }) =>
            getFieldValue('isStockItem') ? (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="quantityOnHand"
                    label={getTranslationFromI18nKeyAndLabel('sales:product.quantityOnHand', 'Quantity on Hand')}
                    data-testid="quantity-on-hand-field"
                  >
                    <InputNumber
                      min={0}
                      precision={0}
                      placeholder="0"
                      className="gba:w-full"
                      data-testid="quantity-on-hand-input"
                    />
                  </Form.Item>
                </Col>
              </Row>
            ) : null
          }
        </Form.Item>

        {/* Validity Period */}
        <Divider orientation="left">
          {getTranslationFromI18nKeyAndLabel('sales:product.validity', 'Validity Period')}
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="validFromDate"
              label={getTranslationFromI18nKeyAndLabel('sales:product.validFrom', 'Valid From')}
              data-testid="valid-from-field"
            >
              <DatePicker className="gba:w-full" data-testid="valid-from-picker" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="validToDate"
              label={getTranslationFromI18nKeyAndLabel('sales:product.validTo', 'Valid To')}
              data-testid="valid-to-field"
            >
              <DatePicker className="gba:w-full" data-testid="valid-to-picker" />
            </Form.Item>
          </Col>
        </Row>

        {/* Form Actions */}
        <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6" data-testid="form-actions">
          <Button onClick={handleCancel} data-testid="cancel-button">
            {getTranslationFromI18nKeyAndLabel('common:cancel', 'Cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting} data-testid="submit-button">
            {isEditing
              ? getTranslationFromI18nKeyAndLabel('common:update', 'Update')
              : getTranslationFromI18nKeyAndLabel('common:create', 'Create')}
          </Button>
        </div>
      </Form>
    </Spin>
  )

  if (inModal) {
    return formContent
  }

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="product-form-container">
      <Card
        title={<Title level={4}>{formTitle}</Title>}
        className="gba:product-form-card"
        data-testid="product-form-card"
      >
        {formContent}
      </Card>
    </div>
  )
}

export default ProductForm
