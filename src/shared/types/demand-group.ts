export interface DemandGroup {
  id: string;
  name: string;
  demandIds: string[];
  commonPainPoints?: string[];
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}
