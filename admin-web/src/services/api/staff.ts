import http from '../http';

export interface Staff {
  id: string;
  user_id: string;
  username: string;
  phone: string;
  role_id: string;
  role_name: string;
  is_owner: boolean;
  status: string;
  joined_at: string;
}

export interface StaffQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export const staffApi = {
  list: (params: StaffQuery) =>
    http.get<{ code: number; data: { list: Staff[]; total: number } }>('/staffs', { params }),

  create: (data: { userId: string; roleId: string }) =>
    http.post<{ code: number; data: Staff }>('/staffs', data),

  updateRole: (id: string, roleId: string) =>
    http.patch(`/staffs/${id}/role`, { roleId }),

  updateStatus: (id: string, status: string) =>
    http.patch(`/staffs/${id}/status`, { status }),
};
