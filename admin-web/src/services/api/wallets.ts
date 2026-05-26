import http from '../http';

export interface Wallet {
  id: string;
  user_id: string;
  cash_balance: string;
  gift_balance: string;
  frozen_balance: string;
}

export interface WalletTransaction {
  id: string;
  direction: string;
  amount: string;
  sub_account: string;
  biz_type: string;
  remark?: string;
  occurred_at: string;
}

export const walletApi = {
  list: (params?: any) =>
    http.get('/wallets', { params }).then((r) => r.data.data),

  getBalance: (userId: string) =>
    http.get(`/wallets/${userId}/balance`).then((r) => r.data.data),

  getTransactions: (userId: string, params?: any) =>
    http.get(`/wallets/${userId}/transactions`, { params }).then((r) => r.data.data),
};

export const rechargeApi = {
  getPackages: () =>
    http.get('/recharge-packages').then((r) => r.data.data),

  createPackage: (dto: any) =>
    http.post('/recharge-packages', dto).then((r) => r.data.data),
};
