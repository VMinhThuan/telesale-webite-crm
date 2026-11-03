import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import {
  BannerConfig,
  BannerItem,
  TelesaleConfigFile,
  TelesaleScript,
} from '../types/telesaleConfig'
import { R2_CONFIG } from './trainingStorage.service'

export const defaultTelesaleConfig: TelesaleConfigFile = {
  version: '1.0',
  updatedAt: new Date().toISOString(),
  banners: {
    intervalSeconds: 5,
    autoPlay: true,
    items: [],
  },
  scripts: [
    {
      id: 'script-01',
      name: 'Bảo dưỡng / Thay lõi',
      title: 'Tư vấn máy lọc nước',
      steps: [
        'Em chào anh/chị, em là tư vấn viên từ Lọc Nước 365. Em liên hệ để hỗ trợ kiểm tra định kỳ chất lượng nguồn nước nhà mình ạ.',
        'Dạ không biết lần gần nhất gia đình mình thay bộ lõi thô 1, 2, 3 là khi nào rồi ạ?',
        'Hiện tại vòi nước nhà mình chảy có mạnh không, nước có mùi vị lạ hay máy có phát ra tiếng ồn không ạ?',
        'Bên em đang có chương trình kỹ thuật viên qua kiểm tra máy, đo nồng độ TDS miễn phí tại nhà. Em hẹn lịch vào ca sáng hay chiều tiện cho gia đình mình ạ?',
      ],
    },
  ],
}

class TelesaleConfigService {
  private s3Client: S3Client | null = null

  private getS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client
    }

    const { accountId, accessKeyId, secretAccessKey } = R2_CONFIG

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Chưa cấu hình R2 credentials trong .env (VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY).',
      )
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    return this.s3Client
  }

  /**
   * Lấy cấu hình Telesale (Banners & Scripts) từ Cloudflare R2
   */
  async getConfig(): Promise<TelesaleConfigFile> {
    try {
      const publicBase = R2_CONFIG.publicUrl.replace(/\/$/, '')
      const response = await fetch(
        `${publicBase}/telesale-config.json?t=${Date.now()}`,
        {
          cache: 'no-store',
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (data && data.banners && Array.isArray(data.scripts)) {
          return {
            version: data.version || defaultTelesaleConfig.version,
            updatedAt: data.updatedAt || defaultTelesaleConfig.updatedAt,
            banners: {
              intervalSeconds: Number(data.banners.intervalSeconds) || 5,
              autoPlay: data.banners.autoPlay !== false,
              items: Array.isArray(data.banners.items) ? data.banners.items : [],
            },
            scripts: Array.isArray(data.scripts)
              ? data.scripts
              : defaultTelesaleConfig.scripts,
          }
        }
      }
    } catch (err) {
      console.warn('Chưa tìm thấy telesale-config.json trên R2, sử dụng mặc định.', err)
    }

    return defaultTelesaleConfig
  }

  /**
   * Đọc trực tiếp file cấu hình từ S3 R2 Storage (mới nhất 100%, không qua CDN caching)
   */
  async getLatestConfigFromStorage(): Promise<TelesaleConfigFile> {
    try {
      const s3 = this.getS3Client()
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: 'telesale-config.json',
        }),
      )
      if (res.Body) {
        const str = await res.Body.transformToString()
        const data = JSON.parse(str)
        if (data && data.banners && Array.isArray(data.scripts)) {
          return {
            version: data.version || defaultTelesaleConfig.version,
            updatedAt: data.updatedAt || defaultTelesaleConfig.updatedAt,
            banners: {
              intervalSeconds: Number(data.banners.intervalSeconds) || 5,
              autoPlay: data.banners.autoPlay !== false,
              items: Array.isArray(data.banners.items) ? data.banners.items : [],
            },
            scripts: Array.isArray(data.scripts)
              ? data.scripts
              : defaultTelesaleConfig.scripts,
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi khi đọc trực tiếp telesale-config.json từ S3, chuyển sang đọc CDN:', err)
    }

    return this.getConfig()
  }

  /**
   * Ghi đè file telesale-config.json lên R2
   */
  async saveConfig(config: TelesaleConfigFile): Promise<TelesaleConfigFile> {
    const s3 = this.getS3Client()
    const updatedConfig: TelesaleConfigFile = {
      ...config,
      updatedAt: new Date().toISOString(),
    }

    const jsonString = JSON.stringify(updatedConfig, null, 2)
    const encoder = new TextEncoder()
    const bodyUint8Array = encoder.encode(jsonString)

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: 'telesale-config.json',
        Body: bodyUint8Array,
        ContentType: 'application/json',
        CacheControl: 'no-cache',
      }),
    )

    return updatedConfig
  }

  /**
   * Upload ảnh banner lên Cloudflare R2 và thêm vào danh sách banners
   */
  async uploadBannerImage(file: File, title?: string, linkUrl?: string): Promise<BannerItem> {
    const s3 = this.getS3Client()

    const extension = file.name.substring(file.name.lastIndexOf('.')) || '.jpg'
    const rawBaseName = file.name
      .substring(0, file.name.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase()
    const safeKey = `banners/${Date.now()}_${rawBaseName}${extension}`

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: safeKey,
        Body: uint8Array,
        ContentType: file.type || 'image/jpeg',
      }),
    )

    const publicBase = R2_CONFIG.publicUrl.replace(/\/$/, '')
    const imageUrl = `${publicBase}/${safeKey}`

    const newBanner: BannerItem = {
      id: `banner-${Date.now()}`,
      title: title?.trim() || file.name.replace(/\.[^/.]+$/, ''),
      imageUrl,
      linkUrl: linkUrl?.trim() || '',
      createdAt: new Date().toISOString(),
    }

    // Đọc config hiện tại TRỰC TIẾP TỪ STORAGE (chống cache đè)
    const currentConfig = await this.getLatestConfigFromStorage()
    currentConfig.banners.items.push(newBanner)
    await this.saveConfig(currentConfig)

    return newBanner
  }

  /**
   * Xóa ảnh banner khỏi R2 và cập nhật lại config
   */
  async deleteBanner(bannerId: string): Promise<void> {
    // Đọc config mới nhất trực tiếp từ Storage (chống race-condition)
    const currentConfig = await this.getLatestConfigFromStorage()
    const bannerToDelete = currentConfig.banners.items.find(
      (b) => String(b.id) === String(bannerId),
    )

    if (bannerToDelete) {
      try {
        const s3 = this.getS3Client()
        if (bannerToDelete.imageUrl.includes('/banners/')) {
          const key = bannerToDelete.imageUrl.substring(
            bannerToDelete.imageUrl.indexOf('banners/'),
          )
          await s3.send(
            new DeleteObjectCommand({
              Bucket: R2_CONFIG.bucketName,
              Key: key,
            }),
          )
        }
      } catch (err) {
        console.warn('Không thể xóa file ảnh vật lý trên R2:', err)
      }
    }

    // CHỈ LỌC BỎ DUY NHẤT BANNER CÓ ID NÀY, BẢO TOÀN TẤT CẢ BANNER KHÁC
    currentConfig.banners.items = currentConfig.banners.items.filter(
      (b) => String(b.id) !== String(bannerId),
    )
    await this.saveConfig(currentConfig)
  }

  /**
   * Cập nhật cài đặt banner (thời gian chuyển ảnh, tự động chạy)
   */
  async updateBannerSettings(settings: Partial<BannerConfig>): Promise<BannerConfig> {
    const currentConfig = await this.getLatestConfigFromStorage()
    currentConfig.banners = {
      ...currentConfig.banners,
      ...settings,
    }
    await this.saveConfig(currentConfig)
    return currentConfig.banners
  }

  /**
   * Cập nhật hoặc thêm mới một kịch bản
   */
  async saveScript(script: TelesaleScript): Promise<TelesaleScript> {
    const currentConfig = await this.getLatestConfigFromStorage()
    const index = currentConfig.scripts.findIndex((s) => s.id === script.id)

    if (index >= 0) {
      currentConfig.scripts[index] = script
    } else {
      currentConfig.scripts.push(script)
    }

    await this.saveConfig(currentConfig)
    return script
  }

  /**
   * Xóa một kịch bản theo ID
   */
  async deleteScript(scriptId: string): Promise<void> {
    const currentConfig = await this.getLatestConfigFromStorage()
    currentConfig.scripts = currentConfig.scripts.filter((s) => s.id !== scriptId)
    await this.saveConfig(currentConfig)
  }
}

export const telesaleConfigService = new TelesaleConfigService()

