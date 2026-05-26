import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi, TenantQuery } from '../services/api/tenants';

export const tenantKeys = {
  all: ['tenants'] as const,
  list: (params: TenantQuery) => ['tenants', 'list', params] as const,
  detail: (id: string) => ['tenants', 'detail', id] as const,
};

export function useTenantList(params: TenantQuery) {
  return useQuery({
    queryKey: tenantKeys.list(params),
    queryFn: async () => {
      const { data } = await tenantApi.list(params);
      return data.data;
    },
  });
}

export function useApproveTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}

export function useRejectTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => tenantApi.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}

export function useSuspendTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantApi.suspend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}
