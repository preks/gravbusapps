import React from "react";
import { Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import styles from "../../ExpenseItem.module.css";

interface UploadComponentProps {
  fileList: any[];
  setFileList: (files: any[]) => void;
}

export const UploadComponent: React.FC<UploadComponentProps> = ({ 
  fileList, 
  setFileList 
}) => {
  return (
    <Upload
      listType="picture"
      fileList={fileList}
      beforeUpload={(file) => {
        setFileList([file]);
        return false;
      }}
      onRemove={() => setFileList([])}
      maxCount={1}
    >
      <div className={styles.uploadDragContainer}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="gba:ant-upload-text">Attach Receipt</p>
      </div>
    </Upload>
  );
};

export default UploadComponent;
