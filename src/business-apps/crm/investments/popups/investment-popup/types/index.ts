import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Scope constants
export const INVESTMENT_POPUP_SCOPES = {
  TILE: 'tile',
  EXIT: 'exit',
  STATUS: 'status'
} as const;

export type InvestmentPopupScope = typeof INVESTMENT_POPUP_SCOPES[keyof typeof INVESTMENT_POPUP_SCOPES];

// Main popup props interface
export interface InvestmentPopupProps extends BusinessAppContextProps {
  /** Function to call when popup should be closed */
  onClose: () => void;
  /** Function to call when data is saved successfully */
  onSave?: (scope: InvestmentPopupScope, data: any) => void;
}

// Tile component specific props
export interface InvestmentTileComponentProps extends BusinessAppContextProps {
  onClose: () => void;
  onSave?: (tileKey: string, tileValue: string) => void;
  tileKey: string;
}

// Exit component specific props
export interface InvestmentExitComponentProps extends BusinessAppContextProps {
  onClose: () => void;
  onSave?: (plannedExit: boolean, plannedExitDate: string | null) => void;
}

// Status component specific props
export interface InvestmentStatusComponentProps extends BusinessAppContextProps {
  onClose: () => void;
  onSave?: (statusRef: string) => void;
}

// Form data interfaces
export interface TileFormData {
  tileValue: string;
}

export interface ExitFormData {
  plannedExit: boolean;
  plannedExitDate: string | null;
}

export interface StatusFormData {
  statusRef: string;
}

// Investment tiles interface
export interface InvestmentTiles {
  [key: string]: string;
}
