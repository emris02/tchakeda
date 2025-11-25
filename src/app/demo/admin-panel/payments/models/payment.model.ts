export interface Payment {
  id: string;
  contractId: string;
  tenantId: string;
  ownerId: string;
  collectorId: string;
  amount: number;
  date: string;
  method: string;
  commission: number;
}
