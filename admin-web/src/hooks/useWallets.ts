import { useQuery } from '@tanstack/react-query';
import { walletApi, rechargeApi } from '../services/api';

export const walletKeys = {
  all: ['wallets'] as const,
  list: (params?: any) => [...walletKeys.all, 'list', params] as const,
  balance: (userId: string) => [...walletKeys.all, 'balance', userId] as const,
  transactions: (userId: string, params?: any) => [...walletKeys.all, 'transactions', userId, params] as const,
};

export function useWalletList(params?: any) {
  return useQuery({
    queryKey: walletKeys.list(params),
    queryFn: () => walletApi.list(params),
  });
}

export function useWalletBalance(userId: string) {
  return useQuery({
    queryKey: walletKeys.balance(userId),
    queryFn: () => walletApi.getBalance(userId),
    enabled: !!userId,
  });
}

export function useWalletTransactions(userId: string, params?: any) {
  return useQuery({
    queryKey: walletKeys.transactions(userId, params),
    queryFn: () => walletApi.getTransactions(userId, params),
    enabled: !!userId,
  });
}

export function useRechargePackages() {
  return useQuery({
    queryKey: ['recharge-packages'],
    queryFn: () => rechargeApi.getPackages(),
  });
}
