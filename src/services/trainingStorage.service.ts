import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  TrainingManifest,
  TrainingMaterial,
  UploadMaterialPayload,
} from '../types/training'

// Cấu hình Cloudflare R2 từ biến môi trường
export const R2_CONFIG = {
  publicUrl:
    (import.meta as any).env?.VITE_R2_PUBLIC_URL,
  bucketName:
    (import.meta as any).env?.VITE_R2_BUCKET_NAME,
  accountId: (import.meta as any).env?.VITE_R2_ACCOUNT_ID || '',
  accessKeyId: (import.meta as any).env?.VITE_R2_ACCESS_KEY_ID || '',
  secretAccessKey: (import.meta as any).env?.VITE_R2_SECRET_ACCESS_KEY || '',
}

// Dữ liệu khung ban đầu khi chưa tải được hoặc khi R2 mới khởi tạo
export const defaultManifest: TrainingManifest = {
  version: '1.0',
  updatedAt: new Date().toISOString(),
  categories: [
    'Tất cả',
    'Nghiệp vụ telesale',
    'Kịch bản tư vấn',
    'Kiến thức sản phẩm',
    'Video hướng dẫn',
  ],
  materials: [],
  journeys: {
    'Nghiệp vụ telesale': [
      {
        title: 'Đọc quy trình telesale',
        desc: 'Hiểu các bước gọi, tư vấn và ghi nhận kết quả.',
        tone: 'blue',
      },
      {
        title: 'Thực hành hẹn đơn',
        desc: 'Chọn slot và xác nhận lịch với khách.',
        tone: 'rose',
      },
    ],
    'Kịch bản tư vấn': [
      {
        title: 'Luyện kịch bản tư vấn',
        desc: 'Thực hành các tình huống tư vấn và xử lý từ chối.',
        tone: 'amber',
      },
      {
        title: 'Kỹ năng chăm sóc khách',
        desc: 'Khai thác nhu cầu và theo dõi khách hàng.',
        tone: 'green',
      },
    ],
    'Kiến thức sản phẩm': [
      {
        title: 'Nắm kiến thức sản phẩm',
        desc: 'Tìm hiểu cấu tạo máy và chức năng các lõi lọc.',
        tone: 'green',
      },
      {
        title: 'Ôn cấu tạo lõi lọc',
        desc: 'Xem lại các lõi lọc và thời hạn sử dụng.',
        tone: 'blue',
      },
    ],
    'Video hướng dẫn': [
      {
        title: 'Xem hướng dẫn hệ thống',
        desc: 'Làm quen Dashboard, Telesale và CSKH.',
        tone: 'blue',
      },
      {
        title: 'Luyện xử lý từ chối',
        desc: 'Thực hành cách phản hồi khách hàng.',
        tone: 'amber',
      },
    ],
  },
}

class TrainingStorageService {
  private s3Client: S3Client | null = null

  /**
   * Khởi tạo S3Client kết nối Cloudflare R2
   */
  private getS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client
    }

    const { accountId, accessKeyId, secretAccessKey } = R2_CONFIG

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Chưa cấu hình R2 credentials trong .env. Vui lòng cập nhật để thực hiện upload.',
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
   * Tải file manifest.json từ R2 Public CDN
   */
  async getManifest(): Promise<TrainingManifest> {
    try {
      const publicBase = R2_CONFIG.publicUrl.replace(/\/$/, '')
      const response = await fetch(`${publicBase}/manifest.json?t=${Date.now()}`, {
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        if (data && Array.isArray(data.materials)) {
          return {
            ...defaultManifest,
            ...data,
            materials: data.materials,
          }
        }
      }
    } catch (err) {
      console.warn('Chưa tìm thấy manifest.json trên R2, sử dụng dữ liệu mặc định.', err)
    }

    return defaultManifest
  }

  /**
   * Tải tài liệu (PDF / Video) lên Cloudflare R2 và tự động cập nhật manifest.json
   */
  async uploadMaterial(payload: UploadMaterialPayload): Promise<TrainingMaterial> {
    const s3 = this.getS3Client()
    const { file, title, desc, category } = payload

    // 1. Phân loại loại tệp
    const isVideo =
      file.type.startsWith('video/') ||
      file.name.toLowerCase().endsWith('.mp4') ||
      file.name.toLowerCase().endsWith('.webm')
    const type: 'pdf' | 'video' | 'doc' = isVideo ? 'video' : 'pdf'
    const tone = isVideo ? 'video' : category === 'Kịch bản tư vấn' ? 'amber' : 'blue'

    // 2. Chuẩn hóa tên file an toàn
    const extension = file.name.substring(file.name.lastIndexOf('.'))
    const rawBaseName = file.name
      .substring(0, file.name.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase()
    const safeKey = `${type === 'video' ? 'videos' : 'docs'}/${Date.now()}_${rawBaseName}${extension}`

    // 3. Chuyển File thành ArrayBuffer -> Uint8Array để upload
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    // 4. Đẩy tệp lên Cloudflare R2
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: safeKey,
        Body: uint8Array,
        ContentType: file.type || (isVideo ? 'video/mp4' : 'application/pdf'),
      }),
    )

    // 5. Tạo đường dẫn công khai
    const publicBase = R2_CONFIG.publicUrl.replace(/\/$/, '')
    const fileUrl = `${publicBase}/${safeKey}`

    // Tính kích thước hiển thị
    const sizeInMB = file.size / (1024 * 1024)
    const sizeStr =
      sizeInMB >= 1 ? `${sizeInMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`
    const meta = isVideo ? `Video · ${sizeStr}` : `PDF · ${sizeStr}`

    const newMaterial: TrainingMaterial = {
      id: `mat-${Date.now()}`,
      title: title.trim(),
      desc: desc.trim(),
      category: category || 'Nghiệp vụ telesale',
      type,
      fileUrl,
      fileKey: safeKey,
      fileSize: sizeStr,
      meta,
      tone,
      publishedAt: payload.publishedAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }

    // 6. Cập nhật file manifest.json trên R2
    const currentManifest = await this.getManifest()
    const updatedMaterials = [
      newMaterial,
      ...currentManifest.materials.filter((m) => m.id !== newMaterial.id),
    ]

    // Nếu category mới chưa có trong danh mục categories, tự động thêm vào
    const categoriesSet = new Set(currentManifest.categories || [])
    if (category && !categoriesSet.has(category)) {
      categoriesSet.add(category)
    }

    const updatedManifest: TrainingManifest = {
      ...currentManifest,
      categories: Array.from(categoriesSet),
      updatedAt: new Date().toISOString(),
      materials: updatedMaterials,
    }

    const manifestBytes = new TextEncoder().encode(
      JSON.stringify(updatedManifest, null, 2),
    )

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: 'manifest.json',
        Body: manifestBytes,
        ContentType: 'application/json',
      }),
    )

    return newMaterial
  }

  /**
   * Cập nhật thông tin tài liệu (tiêu đề, mô tả, chuyển danh mục/tab, ngày phát hành)
   */
  async updateMaterial(
    materialId: string,
    payload: { title: string; desc: string; category: string; publishedAt?: string },
  ): Promise<TrainingMaterial> {
    const s3 = this.getS3Client()
    const currentManifest = await this.getManifest()

    let updatedMaterial: TrainingMaterial | null = null
    const updatedMaterials = currentManifest.materials.map((m) => {
      if (m.id === materialId) {
        updatedMaterial = {
          ...m,
          title: payload.title.trim(),
          desc: payload.desc.trim(),
          category: payload.category.trim(),
          publishedAt: payload.publishedAt || m.publishedAt || m.updatedAt,
          updatedAt: new Date().toISOString().split('T')[0],
        }
        return updatedMaterial
      }
      return m
    })

    if (!updatedMaterial) {
      throw new Error('Không tìm thấy tài liệu cần cập nhật.')
    }

    // Tự động bổ sung category mới vào danh mục nếu chưa tồn tại
    const categoriesSet = new Set(currentManifest.categories || [])
    if (payload.category && !categoriesSet.has(payload.category)) {
      categoriesSet.add(payload.category)
    }

    const updatedManifest: TrainingManifest = {
      ...currentManifest,
      categories: Array.from(categoriesSet),
      updatedAt: new Date().toISOString(),
      materials: updatedMaterials,
    }

    const manifestBytes = new TextEncoder().encode(
      JSON.stringify(updatedManifest, null, 2),
    )

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: 'manifest.json',
        Body: manifestBytes,
        ContentType: 'application/json',
      }),
    )

    return updatedMaterial
  }

  /**
   * Xóa tài liệu khỏi danh sách manifest.json và R2
   */
  async deleteMaterial(materialId: string, fileKey?: string): Promise<void> {
    const s3 = this.getS3Client()

    // 1. Xóa file vật lý khỏi R2 nếu có key
    if (fileKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: fileKey,
          }),
        )
      } catch (err) {
        console.warn('Lỗi khi xóa file vật lý trên R2:', err)
      }
    }

    // 2. Cập nhật lại manifest.json
    const currentManifest = await this.getManifest()
    const updatedMaterials = currentManifest.materials.filter((m) => m.id !== materialId)

    const updatedManifest: TrainingManifest = {
      ...currentManifest,
      updatedAt: new Date().toISOString(),
      materials: updatedMaterials,
    }

    const manifestBytes = new TextEncoder().encode(
      JSON.stringify(updatedManifest, null, 2),
    )

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: 'manifest.json',
        Body: manifestBytes,
        ContentType: 'application/json',
      }),
    )
  }
}

export const trainingStorageService = new TrainingStorageService()
export default trainingStorageService

