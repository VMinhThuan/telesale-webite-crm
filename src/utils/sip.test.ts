import { describe, it, expect } from 'vitest'
import { getEffectiveSipConfig } from './sip'

describe('getEffectiveSipConfig', () => {
  it('trả về null nếu user là null hoặc undefined', () => {
    expect(getEffectiveSipConfig(null)).toBeNull()
    expect(getEffectiveSipConfig(undefined)).toBeNull()
  })

  it('trả về null nếu thiếu thông tin bắt buộc (impi, password, websocketProxyUrl)', () => {
    expect(
      getEffectiveSipConfig({
        id: 1,
        name: 'NV Test',
        username: 'nv01',
        role: 'telesale',
        sipConfig: { impi: '101' },
      }),
    ).toBeNull()

    expect(
      getEffectiveSipConfig({
        id: 1,
        name: 'NV Test',
        username: 'nv01',
        role: 'telesale',
        sipConfig: { impi: '101', password: 'secret' },
      }),
    ).toBeNull()
  })

  it('trích xuất cấu hình đầy đủ khi có đủ thông tin', () => {
    const config = getEffectiveSipConfig({
      id: 1,
      name: 'Nguyễn Văn A',
      username: 'nva',
      role: 'telesale',
      sipConfig: {
        impi: '102',
        password: 'pass',
        websocketProxyUrl: 'wss://pbx.zozin.vn:8089/ws',
        realm: 'zozin.vn',
      },
    })

    expect(config).toEqual({
      impi: '102',
      impu: 'sip:102@zozin.vn',
      password: 'pass',
      websocketProxyUrl: 'wss://pbx.zozin.vn:8089/ws',
      iceServerUrl: undefined,
      realm: 'zozin.vn',
      displayName: 'Nguyễn Văn A',
    })
  })
})

