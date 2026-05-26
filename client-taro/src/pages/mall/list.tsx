import { View, Text, Image } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import { mallApi } from '../../services/api';
import './list.scss';

export default function MallList() {
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['mall-products', page],
    queryFn: async () => {
      const { data } = await mallApi.list({ page });
      return data.data;
    },
  });

  return (
    <View className='mall-list'>
      <View className='header'>
        <Text className='title'>商城</Text>
      </View>
      <View className='products'>
        {(data?.list || []).map((p: any) => (
          <View key={p.id} className='product-card' onClick={() => Taro.navigateTo({ url: `/pages/mall/detail?id=${p.id}` })}>
            {p.image_url && <Image className='cover' src={p.image_url} mode='aspectFill' />}
            <View className='info'>
              <Text className='name'>{p.name}</Text>
              <Text className='price'>¥{p.price}</Text>
            </View>
          </View>
        ))}
        {(!data?.list || data.list.length === 0) && (
          <View className='empty'>
            <Text>暂无商品</Text>
          </View>
        )}
      </View>
    </View>
  );
}
