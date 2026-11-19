import React, { useMemo } from 'react'
import { useCustomerHistory } from '../../../hooks/useCustomers'
import { ErpSource } from '../../../types/api'
import { formatDateTime } from '../../../utils/formatters'

export interface LeadRowNoteProps {
  customerId: number
  sourceErp?: ErpSource
  fallbackNote?: string
}

export const LeadRowNote: React.FC<LeadRowNoteProps> = ({
  customerId,
  sourceErp,
  fallbackNote,
}) => {
  const { data: history, isLoading } = useCustomerHistory(customerId, undefined, sourceErp)

  // 1. Tìm bản ghi tương tác mới nhất có note trong lịch sử chăm sóc
  const latestNoteItem = useMemo(() => {
    if (!history || history.length === 0) return null
    return history.find((h) => h.note && h.note.trim().length > 0) || null
  }, [history])

  // 2. Nội dung hiển thị chính: ưu tiên note từ lịch sử mới nhất -> fallbackNote -> result cuộc gọi
  const displayText = useMemo(() => {
    if (latestNoteItem?.note) {
      return latestNoteItem.note.trim()
    }
    if (fallbackNote && fallbackNote.trim().length > 0) {
      return fallbackNote.trim()
    }
    if (history && history.length > 0) {
      const firstWithResult = history.find((h) => h.result && h.result.trim().length > 0)
      if (firstWithResult?.result) {
        return firstWithResult.result.trim()
      }
    }
    return null
  }, [latestNoteItem, fallbackNote, history])

  // 3. Tooltip chi tiết khi hover chuột: [Thời gian] [Người ghi]: [Nội dung note]
  const tooltipText = useMemo(() => {
    if (latestNoteItem) {
      const timeStr = latestNoteItem.at ? formatDateTime(latestNoteItem.at) : ''
      const userStr = latestNoteItem.user_name ? `${latestNoteItem.user_name}: ` : ''
      return `${timeStr ? `[${timeStr}] ` : ''}${userStr}${latestNoteItem.note}`
    }
    if (displayText) {
      return displayText
    }
    return undefined
  }, [latestNoteItem, displayText])

  if (isLoading && !displayText) {
    return (
      <span style={{ color: '#cbd5e1', fontSize: '10.5px' }}>
        ...
      </span>
    )
  }

  if (!displayText) {
    return (
      <span style={{ color: '#94a3b8', fontSize: '11px', textAlign: 'center' }}>
        —
      </span>
    )
  }

  return (
    <div
      title={tooltipText}
      style={{
        maxWidth: '280px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        fontSize: '11px',
        color: '#334155',
        fontWeight: 500,
        backgroundColor: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: '5px',
        padding: '3px 8px',
        lineHeight: 1.35,
        verticalAlign: 'middle',
      }}
    >
      {displayText}
    </div>
  )
}

export default LeadRowNote
