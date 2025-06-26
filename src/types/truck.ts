export type TruckStatus = 'active' | 'inactive' | 'maintenance';

export interface Truck {
  id: number;
  user_id: string;
  name: string;
  driver_name: string;
  license_plate: string;
  capacity: number;
  observations?: string;
  status: TruckStatus;
  created_at: string;
  updated_at: string;
}

export interface TruckFormData {
  name: string;
  driver_name: string;
  license_plate: string;
  capacity: number;
  observations?: string;
  status: TruckStatus;
}

export interface TruckFilters {
  status?: TruckStatus | 'all';
  search?: string;
}
