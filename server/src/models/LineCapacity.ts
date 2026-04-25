export interface LineCapacity {
  id: number;
  line_code: string;
  line_name: string;
  train_type: string;
  cars: number;
  seated_per_car: number;
  standing_per_car: number;
  capacity_per_train: number;
  notes: string | null;
}

