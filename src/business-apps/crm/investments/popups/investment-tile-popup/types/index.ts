import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Interface for the popup props
export interface InvestmentTilePopupProps extends BusinessAppContextProps {
  /** Function to call when popup should be closed */
  onClose: () => void;
  /** Function to call when tile is saved successfully */
  onSave?: (tileKey: string, tileValue: string) => void;
}

// Interface for the tile form data
export interface TileFormData {
  tileValue: string;
}

// Interface for tiles in additionalProperties
export interface InvestmentTiles {
  [key: string]: string;
}
