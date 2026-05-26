import { View, Text, Image } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import { coachApi } from '../../services/api';
import './list.scss';

export default function CoachList() {
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['coaches', page],
    queryFn: async () => {
      const { data } = await coachApi.list({ page });
      return data.data;
    },
  });

  return (
    <View className='coach-list'>
      <View className='header'>
        <Text className='title'>教练</Text>
      </View>
      {(data?.list || []).map((c: any) => (
        <View key={c.id} className='coach-card' onClick={() => Taro.navigateTo({ url: `/pages/coaches/detail?id=${c.id}` })}>
          <View className='avatar-wrap'>
            {c.avatar_url ? <Image className='avatar' src={c.avatar_url} /> : <View className='avatar-placeholder'>{c.name?.[0]}</View>}
          </View>
          <View className='info'>
            <Text className='name'>{c.name}</Text>
            <Text className='level'>{c.level || '教练'}</Text>
            <Text className='price'>¥{c.price_per_hour}/小时</Text>
          </View>
        </View>
      ))}
      {(!data?.list || data.list.length === 0) && (
        <View className='empty'><Text>暂无教练</Text></View>
      )}
    </View>
  );
}
