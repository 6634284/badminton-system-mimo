import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi, MemberQuery } from '../services/api';

export const memberKeys = {
  all: ['members'] as const,
  list: (query: MemberQuery) => [...memberKeys.all, 'list', query] as const,
  detail: (id: string) => [...memberKeys.all, 'detail', id] as const,
  cards: (id: string) => [...memberKeys.all, 'cards', id] as const,
};

export function useMemberList(query: MemberQuery) {
  return useQuery({
    queryKey: memberKeys.list(query),
    queryFn: () => memberApi.list(query),
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => memberApi.getOne(id),
    enabled: !!id,
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; level?: number; blacklisted?: boolean; note?: string }) =>
      memberApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  });
}

export function useMemberCards(id: string) {
  return useQuery({
    queryKey: memberKeys.cards(id),
    queryFn: () => memberApi.getCards(id),
    enabled: !!id,
  });
}

export function useImportMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: { phone: string; nickname?: string; level?: number }[]) =>
      memberApi.import(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  });
}
