import { PlatformAdapter } from './adapter';

let adapter: PlatformAdapter;

export function getPlatformAdapter(): PlatformAdapter {
  if (!adapter) {
    // Lazy load platform-specific adapter
    if (process.env.TARO_ENV === 'weapp') {
      adapter = require('./adapter.weapp').weappAdapter;
    } else if (process.env.TARO_ENV === 'h5') {
      adapter = require('./adapter.h5').h5Adapter;
    } else {
      // Fallback to H5 adapter for unknown platforms
      adapter = require('./adapter.h5').h5Adapter;
    }
  }
  return adapter;
}

export { PlatformAdapter } from './adapter';
