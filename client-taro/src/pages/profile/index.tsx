import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useMyRegistrations } from '../../hooks/useActivity';
import { useCancelRegistration } from '../../hooks/useActivity';
import './index.scss';

const statusText: Record<string, { text: string; color: string }> = {
  paying: { text: '待支付', color: '#1677ff' },
  confirmed: { text: '已确认', color: '#52c41a' },
  canceled: { text: '已取消', color: '#999' },
  refunded: { text: '已退款', color: '#fa8c16' },
};

export default function ProfilePage() {
  const { data, isLoading } = useMyRegistrations();
  const cancelMut = useCancelRegistration();

  const handleCancel = async (id: string) => {
    try {
      const res = await Taro.showModal({ title: '确认取消', content: '确定要取消报名吗？' });
      if (res.confirm) {
        await cancelMut.mutateAsync({ id });
        Taro.showToast({ title: '已取消', icon: 'success' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '取消失败', icon: 'error' });
    }
  };

  return (
    <View className='profile-page'>
      <View className='page-title'>我的报名</View>

      {isLoading ? (
        <View className='loading'>加载中...</View>
      ) : !data?.list?.length ? (
        <View className='empty-state'>暂无报名记录</View>
      ) : (
        data.list.map((reg: any) => {
          const st = statusText[reg.status] || { text: reg.status, color: '#999' };
          return (
            <View key={reg.id} className='reg-card'>
              <View className='reg-header'>
                <Text className='reg-id'>#{reg.id}</Text>
                <Text className='reg-status' style={{ color: st.color }}>{st.text}</Text>
              </View>
              <View className='reg-info'>
                <Text className='reg-amount'>¥{reg.pay_amount}</Text>
                <Text className='reg-time'>{new Date(reg.created_at).toLocaleString()}</Text>
              </View>
              {['paying', 'confirmed'].includes(reg.status) && (
                <View className='reg-actions'>
                  <Text className='cancel-btn' onClick={() => handleCancel(reg.id)}>取消报名</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
