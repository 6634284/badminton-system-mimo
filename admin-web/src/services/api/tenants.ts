import http from '../http';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  status: string;
  contact_name: string;
  contact_phone: string;
  address: string;
  created_at: string;
}

export interface TenantQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export const tenantApi = {
  list: (params: TenantQuery) =>
    http.get<{ code: number; data: { list: Tenant[]; total: number } }>('/tenants', { params }),

  detail: (id: string) =>
    http.get<{ code: number; data: Tenant }>(`/tenants/${id}`),

  approve: (id: string) =>
    http.post(`/tenants/${id}/approve`),

  reject: (id: string, reason: string) =>
    http.post(`/tenants/${id}/reject`, { reason }),

  suspend: (id: string) =>
    http.post(`/tenants/${id}/suspend`),
};
