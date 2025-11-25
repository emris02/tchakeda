export interface Contract {
  id: string;
  tenantId: string;
  ownerId: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: 'active' | 'extended' | 'terminated';
}
