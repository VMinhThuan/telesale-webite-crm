import React, { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { useCustomerDetail } from '../../../hooks/useCustomers'
import { formatDate, formatDateTime } from '../../../utils/formatters'
import customerService from '../../../services/customer.service'
import { SecureAudioPlayer } from '../../../components/common/SecureAudioPlayer'
import { SecureVideoPlayer } from '../../../components/common/SecureVideoPlayer'
import { ImageLightboxModal, LightboxImage } from '../../../components/common/ImageLightboxModal'

export interface LeadMediaPanelProps {
  customerId: number | null
}

export const LeadMediaPanel: React.FC<LeadMediaPanelProps> = ({ customerId }) => {
  const { data: customerDetail } = useCustomerDetail(customerId || undefined)

  const [selectedLightboxImage, setSelectedLightboxImage] = useState<LightboxImage | null>(null)
  const [selectedFlow, setSelectedFlow] = useState<string>('all')
  const [showAllImages, setShowAllImages] = useState<boolean>(false)

  // Phân loại danh sách hình ảnh và video khảo sát từ API 19b
  const imageList = useMemo(() => {
    return (customerDetail?.list_images || []).filter((img) => img.type === 'image' || !img.type)
  }, [customerDetail?.list_images])

  const videoList = useMemo(() => {
    return (customerDetail?.list_images || []).filter((img) => img.type === 'video')
  }, [customerDetail?.list_images])

  // Danh sách nhóm luồng (Flow) cho bộ lọc ảnh (ví dụ: Kiểm tra máy, Máy ban đầu, Ảnh nhà khách)
  const flowOptions = useMemo(() => {
    const flows = Array.from(new Set(imageList.map((img) => img.flow).filter(Boolean) as string[]))
    return flows.length > 0 ? ['all', ...flows] : ['all']
  }, [imageList])

  // Danh sách ảnh hiển thị theo luồng lọc
  const displayedImages = useMemo(() => {
    if (selectedFlow === 'all') return imageList
    return imageList.filter((img) => img.flow === selectedFlow)
  }, [imageList, selectedFlow])

  // Reset luồng lọc và thu gọn khi chuyển sang xem khách hàng khác
  useEffect(() => {
    setSelectedFlow('all')
    setShowAllImages(false)
  }, [customerId])

  const hasMedia = Boolean(
    (customerDetail?.record && customerDetail.record.length > 0) ||
    imageList.length > 0 ||
    videoList.length > 0,
  )

  if (!hasMedia) return null

  return (
    <>
      <section className="call-panel media-panel" style={{ padding: '14px 16px' }}>
        <div className="call-panel-heading" style={{ marginBottom: '10px' }}>
          <div>
            <p className="eyebrow">DỮ LIỆU ĐA PHƯƠNG TIỆN</p>
            <h2 style={{ fontSize: '13px' }}>Ảnh, Video & Ghi âm CSKH</h2>
          </div>
        </div>

        {/* A. Gallery Ảnh khảo sát & kiểm tra máy */}
        {imageList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#334155',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ImageIcon size={14} style={{ color: '#0284c7' }} />
                Ảnh máy & hiện trường ({imageList.length}):
              </p>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {displayedImages.length} ảnh
              </span>
            </div>

            {/* Flow Pills nếu có từ 2 nhóm ảnh trở lên */}
            {flowOptions.length > 2 && (
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                {flowOptions.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFlow(f)}
                    style={{
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: selectedFlow === f ? '#0284c7' : '#e2e8f0',
                      backgroundColor: selectedFlow === f ? '#e0f2fe' : '#ffffff',
                      color: selectedFlow === f ? '#0369a1' : '#64748b',
                      fontWeight: selectedFlow === f ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f === 'all' ? `Tất cả (${imageList.length})` : f}
                  </button>
                ))}
              </div>
            )}

            {/* Thumbnail Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                gap: '6px',
                maxHeight: showAllImages ? '340px' : '150px',
                overflowY: 'auto',
                padding: '2px',
              }}
            >
              {displayedImages.map((img) => (
                <div
                  key={img.image_id}
                  title={`${img.flow || 'Ảnh khảo sát'}${img.upload_by ? ` · KTV: ${img.upload_by}` : ''} · ${formatDate(img.created_at)}`}
                  onClick={() =>
                    setSelectedLightboxImage({
                      url: img.url,
                      title: `${img.flow || 'Ảnh khảo sát'}${img.upload_by ? ` (KTV: ${img.upload_by})` : ''}`,
                      date: formatDateTime(img.created_at),
                    })
                  }
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '68px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: '#f1f5f9',
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0284c7'
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(2, 132, 199, 0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.flow || 'Ảnh'}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0.3'
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  {img.flow && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        fontSize: '8px',
                        padding: '2px 4px',
                        backgroundColor: 'rgba(15, 23, 42, 0.72)',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                      }}
                    >
                      {img.flow}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Nút Xem thêm / Thu gọn nếu có nhiều ảnh */}
            {displayedImages.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllImages(!showAllImages)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 0',
                  textAlign: 'center',
                }}
              >
                {showAllImages
                  ? 'Thu gọn danh sách ảnh'
                  : `Xem thêm toàn bộ (${displayedImages.length} ảnh)`}
              </button>
            )}
          </div>
        )}

        {/* B. Danh sách ghi âm cuộc gọi */}
        {customerDetail?.record && customerDetail.record.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#334155', margin: 0 }}>
              Ghi âm cuộc gọi ({customerDetail.record.length}):
            </p>
            {customerDetail.record.map((rec) => (
              <SecureAudioPlayer
                key={rec.recording_id || rec.call_id}
                src={rec.url}
                title={`Cuộc gọi #${rec.call_id}${rec.at ? ` · ${rec.at}` : ''}`}
                onRefreshUrl={async () => {
                  if (!customerId) return null
                  const refreshed = await customerService.getCustomerDetail(customerId)
                  const matched = refreshed.record?.find((r) => r.recording_id === rec.recording_id)
                  return matched?.url || null
                }}
              />
            ))}
          </div>
        )}

        {/* C. Danh sách video hiện trường */}
        {videoList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#334155', margin: 0 }}>
              Video bảo dưỡng / lắp ráp ({videoList.length}):
            </p>
            {videoList.map((vid) => (
              <SecureVideoPlayer
                key={vid.image_id}
                src={vid.url}
                onRefreshUrl={async () => {
                  if (!customerId) return null
                  const refreshed = await customerService.getCustomerDetail(customerId)
                  const matched = refreshed.list_images?.find((img) => img.image_id === vid.image_id)
                  return matched?.url || null
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal Lightbox phóng to ảnh khảo sát */}
      <ImageLightboxModal
        isOpen={Boolean(selectedLightboxImage)}
        image={selectedLightboxImage}
        onClose={() => setSelectedLightboxImage(null)}
      />
    </>
  )
}

export default LeadMediaPanel
