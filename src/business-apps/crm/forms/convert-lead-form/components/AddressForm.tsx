import React from "react";
import { Form, Input, Select, Card, Row, Col, Typography } from "antd";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { CatalogEntry } from "@/common/types/CatalogTypes";

const { Option } = Select;
const { Title } = Typography;

interface AddressFormProps {
  prefix: string;
  label: string;
  countries: CatalogEntry[];
  regions: CatalogEntry[];
}

export const AddressForm: React.FC<AddressFormProps> = ({ prefix, label, countries, regions }) => {
  return (
    <Card className="gba:mb-4" size="small" data-testid={`${prefix}-address-form`}>
      <Title level={5} className="gba:!mb-3">{label}</Title>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Form.Item
            name={[prefix, "addressLine"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.addressLine", "Address Line")}
          >
            <Input data-testid={`${prefix}-address-line`} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "city"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.city", "City")}
          >
            <Input data-testid={`${prefix}-city`} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "postalCode"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.postalCode", "Postal Code")}
          >
            <Input data-testid={`${prefix}-postal-code`} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "countryRef"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.country", "Country")}
          >
            <Select
              showSearch
              placeholder={getTranslationFromI18nKeyAndLabel("crm:address.selectCountry", "Select Country")}
              optionFilterProp="children"
              data-testid={`${prefix}-country-select`}
            >
              {countries.map((country) => (
                <Option key={country.id} value={country.id}>
                  {country.value}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={[prefix, "regionRef"]}
            label={getTranslationFromI18nKeyAndLabel("crm:address.region", "Region")}
          >
            <Select
              showSearch
              placeholder={getTranslationFromI18nKeyAndLabel("crm:address.selectRegion", "Select Region")}
              optionFilterProp="children"
              data-testid={`${prefix}-region-select`}
            >
              {regions.map((region) => (
                <Option key={region.id} value={region.id}>
                  {region.value}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}; 