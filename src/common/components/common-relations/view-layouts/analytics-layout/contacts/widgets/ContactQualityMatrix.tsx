import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, XAxis, YAxis, Bar } from 'recharts';
import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';

export interface ContactQualityData {
  overallScore: number;
  qualityDistribution: { category: string; count: number; percentage: number }[];
  completenessMetrics: { metric: string; completed: number; total: number; percentage: number }[];
  issuesSummary: { missingEmails: number; missingPhones: number; missingAccounts: number; duplicatePotential: number };
}

interface ContactQualityMatrixProps { data: ContactQualityData }

const QUALITY_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export const ContactQualityMatrix: React.FC<ContactQualityMatrixProps> = ({ data }) => {
  return (
    <Card data-testid="contact-quality-matrix">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <CheckCircleOutlined />
          Contact Quality Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:text-center gba:mb-6">
          <div className="gba:text-4xl gba:font-bold gba:text-blue-600 gba:mb-2">{data.overallScore}%</div>
          <div className="gba:text-lg gba:text-gray-600">Overall Data Quality Score</div>
        </div>

        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mb-6">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Quality Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.qualityDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ category, percentage }) => `${category}: ${percentage}%`}>
                  {data.qualityDistribution.map((_, i) => (<Cell key={`cell-${i}`} fill={QUALITY_COLORS[i % QUALITY_COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Data Completeness</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.completenessMetrics} layout="horizontal">
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="metric" type="category" width={120} />
                <Tooltip formatter={(v) => [`${v}%`, 'Completeness']} />
                <Bar dataKey="percentage" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Data Quality Issues</h4>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-4 gba:gap-4">
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-red-50 gba:border-red-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><ExclamationCircleOutlined className="gba:text-red-600" /><span className="gba:text-sm gba:font-medium gba:text-red-600">Missing Emails</span></div>
              <div className="gba:text-2xl gba:font-bold gba:text-red-900">{data.issuesSummary.missingEmails}</div>
            </div>
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-orange-50 gba:border-orange-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><WarningOutlined className="gba:text-orange-600" /><span className="gba:text-sm gba:font-medium gba:text-orange-600">Missing Phones</span></div>
              <div className="gba:text-2xl gba:font-bold gba:text-orange-900">{data.issuesSummary.missingPhones}</div>
            </div>
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-yellow-50 gba:border-yellow-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><InfoCircleOutlined className="gba:text-yellow-600" /><span className="gba:text-sm gba:font-medium gba:text-yellow-600">Missing Accounts</span></div>
              <div className="gba:text-2xl gba:font-bold gba:text-yellow-900">{data.issuesSummary.missingAccounts}</div>
            </div>
            <div className="gba:p-4 gba:border gba:rounded-lg gba:bg-purple-50 gba:border-purple-200">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2"><ExclamationCircleOutlined className="gba:text-purple-600" /><span className="gba:text-sm gba:font-medium gba:text-purple-600">Potential Duplicates</span></div>
              <div className="gba:text-2xl gba:font-bold gba:text-purple-900">{data.issuesSummary.duplicatePotential}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactQualityMatrix;


