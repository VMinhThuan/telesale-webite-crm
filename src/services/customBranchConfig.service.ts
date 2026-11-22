import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import {
  CustomBranchConfigFile,
  defaultCustomBranchConfig,
} from '../types/customBranchConfig'
import { R2_CONFIG } from './trainingStorage.service'

const LOCAL_STORAGE_KEY = 'salesflow_custom_branches_config_fallback'
const CONFIG_FILE_KEY = 'custom-branches-config.json'

class CustomBranchConfigService {
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
   * Đọc cấu hình chi nhánh tùy chỉnh từ Cloudflare R2 qua CDN
   */
  async getConfig(): Promise<CustomBranchConfigFile> {
    try {
      const publicBase = R2_CONFIG.publicUrl.replace(/\/$/, '')
      const response = await fetch(
        `${publicBase}/${CONFIG_FILE_KEY}?t=${Date.now()}`,
        {
          cache: 'no-store',
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (data && (Array.isArray(data.branches) || data.branchAddresses)) {
          const config: CustomBranchConfigFile = {
            version: data.version || defaultCustomBranchConfig.version,
            updatedAt: data.updatedAt || defaultCustomBranchConfig.updatedAt,
            updatedBy: data.updatedBy,
            branches: data.branches || [],
            branchAddresses: data.branchAddresses || {},
          }
          // Lưu dự phòng vào localStorage
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config))
          } catch {
            // ignore
          }
          return config
        }
      } else if (response.status === 404) {
        // Tệp chưa được tạo trên R2 (chưa có chi nhánh bổ sung nào) -> dùng fallback
        return this.getFallbackConfig()
      }
    } catch (err) {
      console.warn('[CustomBranchConfig] Không thể tải từ CDN R2, thử đọc trực tiếp từ S3 Storage:', err)
    }

    // Nếu CDN gặp lỗi mạng, thử đọc trực tiếp từ S3 Storage
    return this.getLatestConfigFromStorage()
  }

  /**
   * Lấy cấu hình dự phòng từ localStorage hoặc mặc định
   */
  getFallbackConfig(): CustomBranchConfigFile {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed && Array.isArray(parsed.branches)) {
          return parsed
        }
      }
    } catch {
      // ignore
    }

    return defaultCustomBranchConfig
  }

  /**
   * Đọc trực tiếp từ S3 R2 Storage (mới nhất 100%, chống CDN caching)
   */
  async getLatestConfigFromStorage(): Promise<CustomBranchConfigFile> {
    try {
      const s3 = this.getS3Client()
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: CONFIG_FILE_KEY,
        }),
      )

      if (res.Body) {
        const str = await res.Body.transformToString()
        const data = JSON.parse(str)
        if (data && (Array.isArray(data.branches) || data.branchAddresses)) {
          const config: CustomBranchConfigFile = {
            version: data.version || defaultCustomBranchConfig.version,
            updatedAt: data.updatedAt || defaultCustomBranchConfig.updatedAt,
            updatedBy: data.updatedBy,
            branches: data.branches || [],
            branchAddresses: data.branchAddresses || {},
          }
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config))
          } catch {
            // ignore
          }
          return config
        }
      }
    } catch (err) {
      console.warn('[CustomBranchConfig] Chưa có file cấu hình trên R2 hoặc lỗi kết nối S3, dùng cấu hình dự phòng.', err)
    }

    // Đọc dự phòng từ localStorage nếu có
    return this.getFallbackConfig()
  }

  /**
   * Ghi đè file custom-branches-config.json lên Cloudflare R2
   */
  async saveConfig(
    config: CustomBranchConfigFile,
    updatedBy?: string,
  ): Promise<CustomBranchConfigFile> {
    const s3 = this.getS3Client()
    const updatedConfig: CustomBranchConfigFile = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || config.updatedBy || 'admin',
    }

    const jsonString = JSON.stringify(updatedConfig, null, 2)
    const encoder = new TextEncoder()
    const bodyUint8Array = encoder.encode(jsonString)

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: CONFIG_FILE_KEY,
        Body: bodyUint8Array,
        ContentType: 'application/json',
        CacheControl: 'no-cache',
      }),
    )

    // Đồng bộ vào localStorage dự phòng
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedConfig))
    } catch {
      // ignore
    }

    return updatedConfig
  }

  /**
   * Cập nhật địa chỉ cho một chi nhánh bất kỳ (dựa trên compound key: `${source_erp}_${branch_id}`)
   */
  async saveBranchAddress(
    branchKey: string,
    address: string,
    updatedBy?: string,
  ): Promise<CustomBranchConfigFile> {
    const current = await this.getConfig()
    const nextAddresses = {
      ...(current.branchAddresses || {}),
      [branchKey]: address.trim(),
    }
    const nextConfig: CustomBranchConfigFile = {
      ...current,
      branchAddresses: nextAddresses,
    }
    return this.saveConfig(nextConfig, updatedBy)
  }
}

export const customBranchConfigService = new CustomBranchConfigService()
export default customBranchConfigService
