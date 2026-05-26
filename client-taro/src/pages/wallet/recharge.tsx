import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useRechargePackages, useRecharge } from '../../hooks/useWallet';
import { useState } from 'react';
import './recharge.scss';

export default function RechargePage() {
  const { data: packages, isLoading } = useRechargePackages();
  const rechargeMut = useRecharge();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const handleRecharge = async () => {
    try {
      const data: any = {};
      if (selectedPkg) {
        data.packageId = parseInt(selectedPkg);
      } else if (customAmount) {
        data.amount = parseFloat(customAmount);
      } else {
        Taro.showToast({ title: '请选择套餐或输入金额', icon: 'error' });
        return;
      }

      const res = await rechargeMut.mutateAsync(data);
      if (res.code === 0) {
        Taro.showToast({ title: '充值订单已创建', icon: 'success' });
        Taro.navigateBack();
      } else {
        Taro.showToast({ title: res.msg || '充值失败', icon: 'error' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '充值失败', icon: 'error' });
    }
  };

  return (
    <View className='recharge-page'>
      <Text className='page-title'>充值</Text>

      <View className='packages-section'>
        <Text className='section-title'>充值套餐</Text>
        {isLoading ? (
          <View className='loading'>加载中...</View>
        ) : (
          <View className='package-grid'>
            {(packages || []).map((pkg: any) => (
              <View
                key={pkg.id}
                className={`package-card ${selectedPkg === pkg.id ? 'selected' : ''}`}
                onClick={() => { setSelectedPkg(pkg.id); setCustomAmount(''); }}
              >
                <Text className='pkg-amount'>¥{pkg.charge_amount}</Text>
                {parseFloat(pkg.gift_amount) > 0 && (
                  <Text className='pkg-gift'>赠 ¥{pkg.gift_amount}</Text>
                )}
                <Text className='pkg-name'>{pkg.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className='custom-section'>
        <Text className='section-title'>自定义金额</Text>
        <View className='custom-input'>
          <Text className='input-prefix'>¥</Text>
          <input
            type='number'
            placeholder='输入充值金额'
            value={customAmount}
            onInput={(e: any) => { setCustomAmount(e.target.value); setSelectedPkg(null); }}
          />
        </View>
      </View>

      <View className='recharge-actions'>
        <Button
          className='recharge-btn'
          onClick={handleRecharge}
          loading={rechargeMut.isPending}
          disabled={!selectedPkg && !customAmount}
        >
          确认充值
        </Button>
      </View>
    </View>
  );
}
