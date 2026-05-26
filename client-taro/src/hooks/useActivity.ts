import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityApi } from '../services/api';

export function useActivityList(params?: any) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => activityApi.list(params),
    select: (res) => res.data,
  });
}

export function useActivityDetail(id: string) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => activityApi.getOne(id),
    select: (res) => res.data,
    enabled: !!id,
    refetchInterval: 5000, // Poll every 5s for seat updates
  });
}

export function useActivitySeats(id: string) {
  return useQuery({
    queryKey: ['activity-seats', id],
    queryFn: () => activityApi.getSeats(id),
    select: (res) => res.data,
    enabled: !!id,
    refetchInterval: 3000, // Poll every 3s
  });
}

export function useRegisterActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { activityId: number; extraCount?: number; shareToken?: string }) =>
      activityApi.register({ ...data, idempotencyKey: `reg_${Date.now()}_${Math.random().toString(36).slice(2)}` }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['my-registrations'] });
    },
  });
}

export function useCancelRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => activityApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['my-registrations'] });
    },
  });
}

export function useMyRegistrations(params?: any) {
  return useQuery({
    queryKey: ['my-registrations', params],
    queryFn: () => activityApi.myRegistrations(params),
    select: (res) => res.data,
  });
}
