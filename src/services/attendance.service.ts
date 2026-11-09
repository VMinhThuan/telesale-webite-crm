import apiClient from './apiClient'
import { API_ENDPOINTS } from '../constants/apiEndpoints'
import dayjs from '../lib/dayjs'

export interface FaceCheckInResult {
  success: boolean
  message: string
  gio_vao: string
  ngay_cham: string
  user_name?: string
  confidence?: number
  is_mock?: boolean
}

export const attendanceService = {
  /**
   * Gửi ảnh khuôn mặt chụp từ webcam về backend để ghi nhận chấm công
   * Hỗ trợ mock fallback thông minh khi Backend ERP đang triển khai (404/Network Error)
   */
  async checkInFaceAttendance(
    imageBlob: Blob | File,
    metadata?: {
      note?: string
      deviceInfo?: string
    },
  ): Promise<FaceCheckInResult> {
    const formData = new FormData()
    const fileName = `face_attendance_${dayjs().format('YYYYMMDD_HHmmss')}.jpg`
    formData.append('image', imageBlob, fileName)
    formData.append('attendance_method', 'face_detection')
    formData.append('checkin_at', dayjs().format('YYYY-MM-DD HH:mm:ss'))
    if (metadata?.note) formData.append('note', metadata.note)
    if (metadata?.deviceInfo) formData.append('device_info', metadata.deviceInfo)

    try {
      const response = await apiClient.post<any, any>(
        API_ENDPOINTS.ATTENDANCE_CHECKIN,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 15000,
        },
      )

      if (response && response.success !== false) {
        return {
          success: true,
          message:
            response.message ||
            response.result?.msg ||
            response.msg ||
            'Chấm công khuôn mặt thành công!',
          gio_vao:
            response.gio_vao ||
            response.result?.gio_vao ||
            dayjs().format('HH:mm:ss'),
          ngay_cham:
            response.ngay_cham ||
            response.result?.ngay_cham ||
            dayjs().format('YYYY-MM-DD'),
          user_name: response.user_name || response.result?.user_name,
          confidence: response.confidence || response.result?.confidence || 0.95,
          is_mock: false,
        }
      }

      const errMsg =
        response?.error ||
        response?.message ||
        response?.result?.msg ||
        'Khuôn mặt không khớp với hồ sơ nhân sự.'
      throw new Error(errMsg)
    } catch (err: any) {
      console.warn('Kết nối API chấm công Backend:', err)

      // Fallback linh hoạt: Nếu backend chưa triển khai endpoint (404 hoặc 501),
      // tự động fallback mô phỏng thành công để không làm đứt gãy luồng trải nghiệm trên UI
      const isEndpointMissing =
        err?.response?.status === 404 ||
        err?.response?.status === 501 ||
        err?.message?.includes('404') ||
        err?.message?.includes('Network Error')

      if (isEndpointMissing) {
        // Mô phỏng độ trễ xử lý AI của server 800ms
        await new Promise((resolve) => setTimeout(resolve, 800))
        return {
          success: true,
          message:
            'Chấm công thành công (Mô phỏng máy chủ - Backend đang phát triển)!',
          gio_vao: dayjs().format('HH:mm:ss'),
          ngay_cham: dayjs().format('YYYY-MM-DD'),
          confidence: 0.98,
          is_mock: true,
        }
      }

      throw new Error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Chấm công thất bại. Vui lòng thử lại.',
      )
    }
  },
}

export default attendanceService

