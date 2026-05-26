import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import { tournamentApi } from '../../services/api';
import './list.scss';

const statusLabels: Record<string, string> = { draft: '筹备中', published: '报名中', ongoing: '进行中', finished: '已结束' };
const statusColors: Record<string, string> = { draft: '#999', published: '#1677ff', ongoing: '#52c41a', finished: '#722ed1' };

export default function TournamentList() {
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['tournaments', page],
    queryFn: async () => {
      const { data } = await tournamentApi.list({ page });
      return data.data;
    },
  });

  return (
    <View className='tournament-list'>
      <View className='header'>
        <Text className='title'>赛事</Text>
      </View>
      {(data?.list || []).map((t: any) => (
        <View key={t.id} className='tournament-card' onClick={() => Taro.navigateTo({ url: `/pages/tournaments/detail?id=${t.id}` })}>
          <View className='card-header'>
            <Text className='name'>{t.title}</Text>
            <Text className='status' style={{ color: statusColors[t.status] }}>{statusLabels[t.status]}</Text>
          </View>
          <View className='card-body'>
            <Text className='date'>{t.start_date} ~ {t.end_date}</Text>
            <Text className='format'>{t.format_type === 'knockout' ? '淘汰赛' : t.format_type === 'round_robin' ? '循环赛' : '手动'}</Text>
          </View>
        </View>
      ))}
      {(!data?.list || data.list.length === 0) && (
        <View className='empty'><Text>暂无赛事</Text></View>
      )}
    </View>
  );
}
