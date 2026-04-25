export interface Station {
  id: number;
  code: string;
  name: string;
  alias: string | null;
  line_id: number | null;
  lat: number | null;
  lng: number | null;
}

export interface NewStation {
  code: string;
  name: string;
  alias?: string | null;
  line_id?: number | null;
  lat?: number | null;
  lng?: number | null;
}
