import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityApi, ActivityQuery, CreateActivityDto } from '../services/api';

export const activityKeys = {
  all: ['activities'] as const,
  list: (query: ActivityQuery) => [...activityKeys.all, 'list', query] as const,
  detail: (id: string) => [...activityKeys.all, 'detail', id] as const,
  registrations: (id: string) => [...activityKeys.all, 'registrations', id] as const,
};

export function useActivityList(query: ActivityQuery) {
  return useQuery({
    queryKey: activityKeys.list(query),
    queryFn: () => activityApi.list(query),
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: () => activityApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateActivityDto) => activityApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function usePublishActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activityApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function useCancelActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activityApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function useActivityRegistrations(id: string) {
  return useQuery({
    queryKey: activityKeys.registrations(id),
    queryFn: () => activityApi.getRegistrations(id),
    enabled: !!id,
  });
}
