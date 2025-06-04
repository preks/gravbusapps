import React, { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary:
      "text-white hover:bg-primary-700 focus:ring-primary-500",
    secondary:
      "text-white hover:bg-secondary-700 focus:ring-secondary-500",
    outline:
      "text-neutral-700 border border-neutral-300 hover:bg-neutral-50 focus:ring-primary-500",
    ghost:
      "text-neutral-600 hover:bg-neutral-100 focus:ring-primary-500",
    danger: "text-white hover:bg-error-700 focus:ring-error-500",
    link: "text-primary-600 hover:text-primary-700 hover:underline focus:ring-primary-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-5 py-2.5 text-lg",
  };

  const backgroundClasses = {
    primary: "bg-primary-600",
    secondary: "bg-secondary-600",
    outline: "bg-white",
    ghost: "bg-transparent",
    danger: "bg-error-600",
    link: "bg-transparent"
  };

  const backgroundLoadingClasses = {
    primary: "bg-primary-600/80",
    secondary: "bg-secondary-600/80",
    outline: "bg-white/80",
    ghost: "bg-transparent/80",
    danger: "bg-error-600/80",
    link: "bg-transparent/80"
  };

  const backgroundDisabledClasses = {
    primary: "bg-primary-600/60",
    secondary: "bg-secondary-600/60",
    outline: "bg-white/60",
    ghost: "bg-transparent/60",
    danger: "bg-error-600/60",
    link: "bg-transparent/60"
  };

  // For link variant, override size classes to have no padding
  const finalSizeClasses = variant === "link" 
    ? { sm: "text-sm", md: "", lg: "text-lg" }
    : sizeClasses;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md transition-colors",
        "focus:outline-hidden focus:ring-2 focus:ring-offset-2",
        variantClasses[variant],
        finalSizeClasses[size],
        !isLoading && !disabled && backgroundClasses[variant],
        isLoading && backgroundLoadingClasses[variant],
        disabled && backgroundDisabledClasses[variant],
        isLoading && "cursor-not-allowed",
        disabled && "cursor-not-allowed pointer-events-none",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
