import { RateSummary } from './RateSummary';


export type RoomTypeModel = {
  roomTypeID: string;

  presentation: {
    roomTypeName: string;
    roomTypeNameShort?: string;
    roomTypeDescription?: string;
    roomTypePhotos: string[];
    maxGuests?: number;
    adultsIncluded?: number;
    childrenIncluded?: number;
    roomTypeFeatures?: string[];
  };

  inventory: {
    roomIDs: string[];
    roomNames: string[];
    totalUnits?: number;
    linkedRoomIDs?: string[];
    linkedRoomTypeIDs?: string[];
    linkedRoomTypeQty?: Array<{
      roomTypeID: string;
      roomQty: number;
    }>;
  };

  pricing: {
    baseRate?: {
      rateID: string;
      roomRate: number;
      totalRate: number;
      roomsAvailable: number;
      isDerived: boolean;
    };
    ratePlans: RateSummary[];
  };
};