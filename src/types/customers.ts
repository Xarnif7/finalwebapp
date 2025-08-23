export interface Customer {
  id: string;
  business_id: string;
  created_by?: string;
  full_name: string;
  email?: string;
  phone?: string;
  service_date?: string;
  tags: string[];
  notes?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CustomerCreate {
  full_name: string;
  email?: string;
  phone?: string;
  service_date?: string;
  tags?: string[];
  notes?: string;
  status?: 'active' | 'archived';
}

export interface CustomerUpdate extends Partial<CustomerCreate> {}

export interface CustomerStats {
  total_customers: number;
  new_this_month: number;
  conversion_rate?: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
  sort?: string;
  status?: 'active' | 'archived' | 'all';
}

export interface CsvImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

export interface AuditLogEntry {
  id: number;
  business_id: string;
  user_id?: string;
  entity: string;
  entity_id?: string;
  action: string;
  details?: any;
  created_at: string;
}
