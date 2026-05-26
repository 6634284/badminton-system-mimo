import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { rankingApi } from '../../services/api';
import './index.scss';

export default function Rankings() {
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => { const { data } = await rankingApi.leaderboard(); return data.data; },
  });

  const { data: myPoints } = useQuery({
    queryKey: ['my-points'],
    queryFn: async () => { const { data } = await rankingApi.myPoints(); return data.data; },
  });

  return (
    <View className='rankings'>
      {myPoints && (
        <View className='my-rank-card'>
          <Text className='rank-title'>我的积分</Text>
          <Text className='rank-points'>{myPoints.total_points || 0}</Text>
          <Text className='rank-detail'>胜场: {myPoints.wins || 0} | 负场: {myPoints.losses || 0}</Text>
        </View>
      )}

      <View className='section'>
        <Text className='section-title'>排行榜</Text>
        {(leaderboard || []).map((r: any, i: number) => (
          <View key={r.user_id} className='rank-item'>
            <Text className='rank-no'>{i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</Text>
            <Text className='rank-name'>{r.user_name || `用户${r.user_id}`}</Text>
            <Text className='rank-pts'>{r.total_points}分</Text>
          </View>
        ))}
        {(!leaderboard || leaderboard.length === 0) && (
          <View className='empty'><Text>暂无排名数据</Text></View>
        )}
      </View>
    </View>
  );
}
