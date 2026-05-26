import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { venueApi, courtApi } from '../services/api';

export const venueKeys = {
  all: ['venues'] as const,
  list: (params?: any) => [...venueKeys.all, 'list', params] as const,
  detail: (id: string) => [...venueKeys.all, 'detail', id] as const,
};

export const courtKeys = {
  all: ['courts'] as const,
  list: (params?: any) => [...courtKeys.all, 'list', params] as const,
  schedules: (params: any) => [...courtKeys.all, 'schedules', params] as const,
};

export function useVenueList(params?: any) {
  return useQuery({
    queryKey: venueKeys.list(params),
    queryFn: () => venueApi.list(params),
  });
}

export function useVenue(id: string) {
  return useQuery({
    queryKey: venueKeys.detail(id),
    queryFn: () => venueApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: any) => venueApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: venueKeys.all }),
  });
}

export function useCourtList(params?: any) {
  return useQuery({
    queryKey: courtKeys.list(params),
    queryFn: () => courtApi.list(params),
  });
}

export function useCourtSchedules(params: { venueId: number; date: string }) {
  return useQuery({
    queryKey: courtKeys.schedules(params),
    queryFn: () => courtApi.getSchedules(params),
    enabled: !!params.venueId && !!params.date,
  });
}

export function useGenerateSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: any) => courtApi.generateSchedules(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: courtKeys.all }),
  });
}
