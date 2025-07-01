import React from "react";
import dayjs from "dayjs";
import { Button, Checkbox, Avatar, DatePicker } from "antd";
import flowSmall from "../../../../assets/icons/flowSmall.svg";
import { useGetEmployeeData } from "../../core/hooks/useGetEmployeeData";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { startProcess } from "@/common/utils/start-process";
import { dispatchProcessContinueEvent } from "../../../../common/utils/processEventUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

export const EmployeeTermination: React.FC<BusinessAppContextProps> = (
  props
) => {
  const { accessToken } = props;

  const employeeId =
    new URLSearchParams(window.location.search).get("id") || "";

  const { employee, loading, error } = useGetEmployeeData({
    employeeId,
    accessToken,
  });

  const [terminationDate, setTerminationDate] = React.useState<dayjs.Dayjs | null>(dayjs());
  const [terminateJobPosition, setTerminateJobPosition] = React.useState(false);

  const isSubmitDisabled =
    !terminateJobPosition ||
    !terminationDate ||
    !dayjs.isDayjs(terminationDate) ||
    !terminationDate.isValid();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = {
      employeeId,
      terminationDate: terminationDate ? terminationDate : null,
      terminateJobPosition,
    };
    startProcess({
      domain: "employee",
      processName: "terminateEmployee",
      payload: values,
      builderType: "NATIVE_SCREEN",
    });
    dispatchProcessContinueEvent("pse_submit", values);
  };

  const handleCancel = () => {
    const values = {
      employeeId,
      terminationDate: terminationDate ? terminationDate : null,
      terminateJobPosition,
    };
    startProcess({
      domain: "employee",
      processName: "terminateEmployee",
      payload: values,
      builderType: "NATIVE_SCREEN",
    });
    dispatchProcessContinueEvent("pse_cancel", values);
    setTerminationDate(dayjs());
    setTerminateJobPosition(false);
  };

  const getImageSrc = (thumbnail?: string) => {
    if (!thumbnail) return undefined;
    if (thumbnail.startsWith("data:image/")) return thumbnail;
    return `data:image/jpeg;base64,${thumbnail}`;
  };

  return (
    <>
      <div className="gba:max-w-[500px] gba:mx-auto gba:bg-white gba:rounded-2xl gba:shadow-lg gba:flex gba:flex-col gba:min-h-[600px] gba:p-0">
        <div className="gba:flex gba:items-center gba:gap-3 gba:pt-8 gba:pb-6 gba:border-b gba:border-[#F0F0F0] gba:font-roboto gba:font-bold gba:text-[20px] gba:leading-6 gba:text-black">
          <img src={flowSmall} alt="Flow Small" className="gba:flowIcon" />
          <span className="gba:font-roboto gba:font-medium gba:text-[24px] gba:leading-6 gba:text-black gba:flex gba:items-center gba:h-6">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:employee_termination.title",
              "Employee Termination"
            )}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="gba:flex-1 gba:flex gba:flex-col gba:justify-between gba:pb-10">
          <div className="gba:pb-10 gba:pt-4">
            <div className="gba:flex gba:items-center gba:mb-8">
              {loading ? (
                <div className="gba:text-base">Loading employee info...</div>
              ) : error ? (
                <div className="gba:text-red-600">
                  Error loading employee info
                </div>
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
            <div className="gba:form gba:bg-[#F5F5F5]">
              <div className="gba:ant-form-item-row">
                <label className="gba:block gba:text-[12px] gba:font-semibold gba:text-[#707070] gba:tracking-[0.5px] gba:font-roboto gba:pl-[15px] gba:pt-[7px]">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:employee_termination.exit_date_input",
                    "Exit Date"
                  )}
                </label>
                <div className="gba:bg-[#F5F5F5] gba:px-[15px] gba:py-[7px] gba:border-none gba:date-picker-custom">
                  <DatePicker
                    className="gba:w-full gba:bg-transparent gba:border-none gba:outline-none gba:shadow-none gba:font-bold gba:text-black"
                    format="DD.MM.YYYY"
                    data-testid="exit-date-picker"
                    allowClear={true}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      "lowcoder:absences_overview_entry_screen.select_placeholder",
                      "Please Select"
                    )}
                    value={dayjs.isDayjs(terminationDate) && terminationDate.isValid() ? terminationDate : null}
                    onChange={date => setTerminationDate(date ?? null)}
                  />
                </div>
              </div>
            </div>
            <div className="gba:pt-6">
              <label>
                <Checkbox
                  data-testid="terminate-job-checkbox"
                  className="gba:font-roboto gba:text-[14px] gba:font-semibold gba:text-black gba:tracking-[0.5px] gba:mt-6"
                  checked={terminateJobPosition}
                  onChange={(e) => setTerminateJobPosition(e.target.checked)}
                />
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:employee_termination.checkbox_label",
                  "Terminate Job Position"
                )}
              </label>
            </div>
          </div>
          <div className="gba:border-t gba:border-[#F0F0F0] gba:flex gba:gap-4 gba:justify-start">
            <Button
              type="primary"
              htmlType="submit"
              className="gba:btn-primary"
              data-testid="submit-termination-btn"
              disabled={isSubmitDisabled}
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:hr_absences.create_absence.submit",
                "Submit"
              )}
            </Button>
            <Button
              type="default"
              className="gba:btn-secondary"
              data-testid="cancel-termination-btn"
              onClick={handleCancel}
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:hr_absences.create_absence.cancel",
                "Cancel"
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EmployeeTermination;
