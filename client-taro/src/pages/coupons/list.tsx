import { View, Text } from '@tarojs/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Taro from '@tarojs/taro';
import { couponApi } from '../../services/api';
import './list.scss';

export default function CouponList() {
  const qc = useQueryClient();

  const { data: available } = useQuery({
    queryKey: ['coupons-available'],
    queryFn: async () => {
      const { data } = await couponApi.list();
      return data.data;
    },
  });

  const { data: mine } = useQuery({
    queryKey: ['my-coupons'],
    queryFn: async () => {
      const { data } = await couponApi.myCoupons();
      return data.data;
    },
  });

  const claimMut = useMutation({
    mutationFn: (id: string) => couponApi.claim(id),
    onSuccess: () => {
      Taro.showToast({ title: '领取成功', icon: 'success' });
      qc.invalidateQueries({ queryKey: ['coupons-available'] });
      qc.invalidateQueries({ queryKey: ['my-coupons'] });
    },
    onError: () => {
      Taro.showToast({ title: '领取失败', icon: 'none' });
    },
  });

  return (
    <View className='coupon-list'>
      <View className='section'>
        <Text className='section-title'>可领取优惠券</Text>
        {(available?.list || []).map((c: any) => (
          <View key={c.id} className='coupon-card'>
            <View className='left'>
              <Text className='value'>{c.type === 'discount' ? `${c.discount_value}折` : `¥${c.discount_value}`}</Text>
              <Text className='scope'>{c.apply_scope === 'all' ? '全场通用' : c.apply_scope}</Text>
            </View>
            <View className='right'>
              <Text className='name'>{c.name}</Text>
              <Text className='stock'>剩余{c.stock}张</Text>
              <View className='claim-btn' onClick={() => claimMut.mutate(c.id)}>
                <Text>领取</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className='section'>
        <Text className='section-title'>我的优惠券</Text>
        {(mine || []).map((uc: any) => (
          <View key={uc.id} className='coupon-card mine'>
            <View className='left'>
              <Text className='value'>{uc.coupon_type === 'discount' ? `${uc.discount_value}折` : `¥${uc.discount_value}`}</Text>
            </View>
            <View className='right'>
              <Text className='name'>{uc.coupon_name}</Text>
              <Text className='status'>{uc.status === 'unused' ? '未使用' : uc.status === 'used' ? '已使用' : '已过期'}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
