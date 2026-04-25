export interface Line {
  id: number;
  code: string;
  name: string;
  color: string;
  parent_line_id: number | null;
}

export interface NewLine {
  code: string;
  name: string;
  color: string;
  parent_line_id?: number | null;
}
