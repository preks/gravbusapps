import React, { useState } from "react";
import dayjs from "dayjs";
import { Button, Checkbox, Avatar, DatePicker } from "antd";
import flowSmall from "../../../assets/icons/flowSmall.svg";

import { useGetEmployeeData } from "../core/hooks/useGetEmployeeData";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import "./EmployeeTermination.css";

export const EmployeeTermination: React.FC<BusinessAppContextProps> = (
  props
) => {
  const { userInfo, accessToken } = props;

  const { employee, loading, error } = useGetEmployeeData({
    userId: userInfo?.id,
    accessToken,
  });

  const [exitDate, setExitDate] = useState<dayjs.Dayjs>(dayjs());
  const [terminateJobPosition, setTerminateJobPosition] = useState(false);
  const [errors, setErrors] = useState<{ exitDate?: string }>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors: { exitDate?: string } = {};
    if (!exitDate) {
      newErrors.exitDate = "Please enter the exit date";
      hasError = true;
    }
    setErrors(newErrors);
    if (hasError) return;
    console.log("Form values:", { exitDate, terminateJobPosition });
  };

  const isSubmitDisabled =
    !terminateJobPosition || !exitDate || !dayjs(exitDate).isValid();

  const getImageSrc = (thumbnail?: string) => {
    if (!thumbnail) return undefined;
    if (thumbnail.startsWith("data:image/")) return thumbnail;
    return `data:image/jpeg;base64,${thumbnail}`;
  };

  return (
    <>

      <div className="gba:max-w-[500px] gba:mx-auto gba:bg-white gba:rounded-2xl gba:shadow-lg gba:flex gba:flex-col gba:min-h-[600px] gba:p-0">
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-[40px] gba:pt-8 gba:pb-6 gba:border-b gba:border-[#F0F0F0] gba:font-roboto gba:font-bold gba:text-[20px] gba:leading-6 gba:text-black">
          <img
            src={flowSmall}
            alt="Flow Small"
            className="gba:w-6 gba:h-6 gba:filter gba:brightness-0 gba:saturate-100"
          />
          <span className="gba:font-roboto gba:font-medium gba:text-[24px] gba:leading-6 gba:text-black gba:flex gba:items-center gba:h-6">Employee Termination</span>
        </div>
        <form
          onSubmit={onSubmit}
          className="gba:flex-1 gba:flex gba:flex-col gba:justify-between gba:pb-10"
        >
          <div className="gba:px-10 gba:pb-10 gba:pt-4">
            <div className="gba:flex gba:items-center gba:mb-8">
              {loading ? (
                <div>Loading employee info...</div>
              ) : error ? (
                <div className="gba:text-red-600">Error loading employee info</div>
              ) : (
                <>
                  <Avatar
                    size={64}
                    src={getImageSrc(employee?.pictureThumbnail)}
                  >
                    {employee?.firstName}
                  </Avatar>
                  <div className="gba:ml-2">
                    <div className="gba:font-bold gba:text-[16px] gba:leading-5 gba:text-black gba:font-roboto">
                      {`${employee?.firstName} ${employee?.lastName}`}
                    </div>
                    <div className="gba:text-[13px] gba:text-[#8C8C8C] gba:leading-4 gba:mb-[2px] gba:font-roboto">
                      {employee?.employeePosition?.organizationalUnit?.name}
                    </div>
                    <div className="gba:text-[13px] gba:text-[#8C8C8C] gba:leading-4 gba:mb-[2px] gba:font-roboto">
                      {employee?.employeePosition?.jobPosition?.name}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="gba:mb-6">
              <div className="gba:bg-[#F5F5F5] gba:px-[15px] gba:py-[7px] gba:text-[15px] gba:font-bold gba:text-black gba:border-none gba:font-roboto">
                <label className="gba:block gba:text-[12px] gba:font-semibold gba:text-[#707070] gba:tracking-[0.5px] gba:font-roboto">
                  Exit Date*
                </label>
                <DatePicker
                  className="input-date-picker"
                  format="DD.MM.YYYY"
                  value={exitDate}
                  onChange={(date) => setExitDate(date)}
                  allowClear={true}
                  placeholder="Please select"
                />
              </div>
              {errors.exitDate && (
                <div className="gba:text-red-600 gba:mt-1 gba:text-xs">
                  {errors.exitDate}
                </div>
              )}
            </div>
            <div className="gba:mb-6">
              <div className="gba:checkbox-row">
                <Checkbox
                  className="gba:font-semibold gba:text-black gba:text-[15px] gba:leading-[20px] gba:font-roboto"
                  checked={terminateJobPosition}
                  onChange={(e) => setTerminateJobPosition(e.target.checked)}
                >
                  Terminate Job Position
                </Checkbox>
              </div>
            </div>
          </div>
          <div className="gba:border-t gba:border-[#F0F0F0] gba:flex gba:justify-start gba:gap-4 gba:pt-[25px] gba:px-[40px]">
            <Button
              htmlType="submit"
              className="btn-primary"
              disabled={isSubmitDisabled}
            >
              Submit
            </Button>
            <Button htmlType="button" className="btn-secondary">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EmployeeTermination;
