import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi, StaffQuery } from '../services/api/staff';

export const staffKeys = {
  all: ['staffs'] as const,
  list: (params: StaffQuery) => ['staffs', 'list', params] as const,
};

export function useStaffList(params: StaffQuery) {
  return useQuery({
    queryKey: staffKeys.list(params),
    queryFn: async () => {
      const { data } = await staffApi.list(params);
      return data.data;
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; roleId: string }) => staffApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useUpdateStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) =>
      staffApi.updateRole(id, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useUpdateStaffStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      staffApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
