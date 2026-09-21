export interface PlaceDto {
  id: string;
  name: string;
  categoryName: string | null;
  openingHours: string | null;
  wheelchair: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}
