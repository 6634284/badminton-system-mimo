import { View, Text, Image } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Taro from '@tarojs/taro';
import { mallApi } from '../../services/api';
import './detail.scss';

export default function ProductDetail() {
  const router = useRouter();
  const id = router.params.id;
  const qc = useQueryClient();

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await mallApi.getOne(id); return data.data; },
    enabled: !!id,
  });

  const cartMut = useMutation({
    mutationFn: (data: { skuId: number; quantity: number }) => mallApi.addToCart(data),
    onSuccess: () => {
      Taro.showToast({ title: '已加入购物车', icon: 'success' });
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => Taro.showToast({ title: '加入失败', icon: 'none' }),
  });

  if (!product) return <View className='loading'><Text>加载中...</Text></View>;

  return (
    <View className='product-detail'>
      <View className='image-wrap'>
        {product.image_url ? <Image className='product-img' src={product.image_url} mode='aspectFill' /> : <View className='img-ph'><Text>暂无图片</Text></View>}
      </View>

      <View className='info-card'>
        <Text className='name'>{product.name}</Text>
        <Text className='price'>¥{product.price}</Text>
        {product.description && <Text className='desc'>{product.description}</Text>}
      </View>

      {product.skus && product.skus.length > 0 && (
        <View className='sku-card'>
          <Text className='sku-title'>规格</Text>
          {product.skus.map((s: any) => (
            <View key={s.id} className='sku-item'>
              <Text className='sku-spec'>{typeof s.spec === 'string' ? s.spec : JSON.stringify(s.spec)}</Text>
              <Text className='sku-price'>¥{s.price}</Text>
              <Text className='sku-stock'>库存: {s.stock}</Text>
            </View>
          ))}
        </View>
      )}

      <View className='action-bar'>
        <View className='add-cart-btn' onClick={() => {
          const sku = product.skus?.[0];
          if (!sku) { Taro.showToast({ title: '暂无库存', icon: 'none' }); return; }
          cartMut.mutate({ skuId: Number(sku.id), quantity: 1 });
        }}>
          <Text>加入购物车</Text>
        </View>
      </View>
    </View>
  );
}
