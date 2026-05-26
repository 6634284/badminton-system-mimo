import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useWalletBalance, useWalletTransactions } from '../../hooks/useWallet';
import './index.scss';

export default function WalletPage() {
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: txs, isLoading: txsLoading } = useWalletTransactions({ page: 1, pageSize: 20 });

  const handleRecharge = () => {
    Taro.navigateTo({ url: '/pages/wallet/recharge' });
  };

  return (
    <View className='wallet-page'>
      <View className='balance-card'>
        <Text className='balance-title'>我的钱包</Text>
        <View className='balance-amount'>
          <Text className='amount-label'>总余额</Text>
          <Text className='amount-value'>¥{balance?.total || '0.00'}</Text>
        </View>
        <View className='balance-detail'>
          <View className='balance-item'>
            <Text className='item-label'>现金</Text>
            <Text className='item-value'>¥{balance?.cash_balance || '0.00'}</Text>
          </View>
          <View className='balance-item'>
            <Text className='item-label'>赠送</Text>
            <Text className='item-value'>¥{balance?.gift_balance || '0.00'}</Text>
          </View>
        </View>
        <View className='recharge-btn' onClick={handleRecharge}>
          <Text>充值</Text>
        </View>
      </View>

      <View className='tx-section'>
        <Text className='section-title'>交易记录</Text>
        {txsLoading ? (
          <View className='loading'>加载中...</View>
        ) : !txs?.list?.length ? (
          <View className='empty-state'>暂无交易记录</View>
        ) : (
          txs.list.map((tx: any) => (
            <View key={tx.id} className='tx-item'>
              <View className='tx-info'>
                <Text className='tx-type'>{tx.biz_type}</Text>
                <Text className='tx-remark'>{tx.remark || ''}</Text>
              </View>
              <Text className={`tx-amount ${tx.direction === 'C' ? 'credit' : 'debit'}`}>
                {tx.direction === 'C' ? '+' : '-'}¥{tx.amount}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
