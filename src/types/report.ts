export type ReportStatus = 'Ready' | 'Processing' | 'Failed';

export interface Report {
  id: string;
  name: string;
  date: string;
  type: 'PDF' | 'CSV' | 'Excel';
  size: string;
  status: ReportStatus;
}
