import { View, Text } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { useQuery, useMutation } from '@tanstack/react-query';
import Taro from '@tarojs/taro';
import { tournamentApi } from '../../services/api';
import './detail.scss';

export default function TournamentDetail() {
  const router = useRouter();
  const id = router.params.id;

  const { data: tournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => { const { data } = await tournamentApi.getOne(id); return data.data; },
    enabled: !!id,
  });

  const { data: matches } = useQuery({
    queryKey: ['tournament-matches', id],
    queryFn: async () => { const { data } = await tournamentApi.getMatches(id); return data.data; },
    enabled: !!id,
  });

  const regMut = useMutation({
    mutationFn: (data: any) => tournamentApi.register(id, data),
    onSuccess: () => {
      Taro.showToast({ title: '报名成功', icon: 'success' });
    },
    onError: () => Taro.showToast({ title: '报名失败', icon: 'none' }),
  });

  if (!tournament) return <View className='loading'><Text>加载中...</Text></View>;

  const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: '#999' },
    registration_open: { text: '报名中', color: '#52c41a' },
    registration_closed: { text: '报名截止', color: '#faad14' },
    in_progress: { text: '进行中', color: '#1677ff' },
    completed: { text: '已结束', color: '#999' },
    cancelled: { text: '已取消', color: '#ff4d4f' },
  };
  const st = statusMap[tournament.status] || { text: tournament.status, color: '#999' };

  return (
    <View className='tournament-detail'>
      <View className='hero'>
        <Text className='name'>{tournament.name}</Text>
        <Text className='status' style={{ color: st.color }}>{st.text}</Text>
      </View>

      <View className='info-card'>
        <View className='info-row'><Text className='label'>时间</Text><Text className='value'>{tournament.start_date} ~ {tournament.end_date}</Text></View>
        <View className='info-row'><Text className='label'>赛制</Text><Text className='value'>{tournament.format === 'knockout' ? '淘汰赛' : tournament.format === 'round_robin' ? '循环赛' : '小组+淘汰'}</Text></View>
        <View className='info-row'><Text className='label'>报名费</Text><Text className='value price'>¥{tournament.entry_fee || '免费'}</Text></View>
        <View className='info-row'><Text className='label'>名额</Text><Text className='value'>{tournament.registered_count || 0}/{tournament.max_participants || '不限'}</Text></View>
      </View>

      {tournament.description && (
        <View className='desc-card'>
          <Text className='desc-title'>赛事介绍</Text>
          <Text className='desc-body'>{tournament.description}</Text>
        </View>
      )}

      {tournament.status === 'registration_open' && (
        <View className='action-bar'>
          <View className='register-btn' onClick={() => {
            Taro.showModal({
              title: '确认报名',
              content: `报名费: ¥${tournament.entry_fee || 0}`,
              success: (res) => { if (res.confirm) regMut.mutate({}); },
            });
          }}>
            <Text>立即报名</Text>
          </View>
        </View>
      )}

      {matches && matches.length > 0 && (
        <View className='matches-card'>
          <Text className='matches-title'>赛程</Text>
          {matches.map((m: any) => (
            <View key={m.id} className='match-item'>
              <Text className='match-round'>第{m.round}轮</Text>
              <Text className='match-players'>{m.player1_name} vs {m.player2_name}</Text>
              <Text className='match-score'>{m.score || '-'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
