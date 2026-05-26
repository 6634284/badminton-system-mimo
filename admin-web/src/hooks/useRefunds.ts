import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refundApi } from '../services/api/refunds';

export const refundKeys = {
  all: ['refunds'] as const,
  list: (page?: number) => ['refunds', 'list', page] as const,
};

export function useRefundList(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: refundKeys.list(params?.page),
    queryFn: async () => {
      const { data } = await refundApi.list(params);
      return data.data;
    },
  });
}

export function useCreateRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { paymentId: string; refundAmount: number; reason?: string }) =>
      refundApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: refundKeys.all }),
  });
}
