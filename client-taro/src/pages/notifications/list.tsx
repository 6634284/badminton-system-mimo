import { View, Text } from '@tarojs/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Taro from '@tarojs/taro';
import { notificationApi } from '../../services/api';
import './list.scss';

export default function NotificationList() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await notificationApi.list();
      return data.data;
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <View className='notification-list'>
      <View className='header'>
        <Text className='title'>消息通知</Text>
        <Text className='mark-all' onClick={() => markAllMut.mutate()}>全部已读</Text>
      </View>
      {(data?.list || []).map((n: any) => (
        <View
          key={n.id}
          className={`notify-card ${n.is_read ? '' : 'unread'}`}
          onClick={() => !n.is_read && markReadMut.mutate(n.id)}
        >
          <View className='notify-header'>
            <Text className='notify-title'>{n.title}</Text>
            <Text className='notify-time'>{n.created_at?.slice(0, 10)}</Text>
          </View>
          <Text className='notify-body'>{n.content}</Text>
          {!n.is_read && <View className='unread-dot' />}
        </View>
      ))}
      {(!data?.list || data.list.length === 0) && (
        <View className='empty'><Text>暂无通知</Text></View>
      )}
    </View>
  );
}
