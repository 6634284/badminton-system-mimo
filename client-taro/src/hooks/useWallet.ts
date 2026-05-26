import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '../services/api';

export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => walletApi.getBalance(),
    select: (res) => res.data,
  });
}

export function useWalletTransactions(params?: any) {
  return useQuery({
    queryKey: ['wallet-transactions', params],
    queryFn: () => walletApi.getTransactions(params),
    select: (res) => res.data,
  });
}

export function useRechargePackages() {
  return useQuery({
    queryKey: ['recharge-packages'],
    queryFn: () => walletApi.getRechargePackages(),
    select: (res) => res.data,
  });
}

export function useRecharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { packageId?: number; amount?: number }) => walletApi.recharge(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}

export function useRechargeOrders(params?: any) {
  return useQuery({
    queryKey: ['recharge-orders', params],
    queryFn: () => walletApi.getRechargeOrders(params),
    select: (res) => res.data,
  });
}
