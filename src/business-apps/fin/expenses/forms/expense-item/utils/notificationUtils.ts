import { notification } from "antd";

/**
 * Show a toast notification
 * @param message Message content
 * @param type Notification type (success, error, info, warning)
 * @param title Optional title for the notification
 */
export const showToast = (
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
  title?: string
): void => {
  notification[type]({
    message: title || getDefaultTitle(type),
    description: message,
    placement: "bottomRight",
    duration: 5,
    className: `gba:${type}-toast`
  });
};


const getDefaultTitle = (type: string): string => {
  switch (type) {
    case "success":
      return "Success";
    case "error":
      return "Error";
    case "warning":
      return "Warning";
    case "info":
    default:
      return "Information";
  }
};
