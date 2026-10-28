import React from 'react'
import { CheckCircle2 } from 'lucide-react'

interface ToastProps {
  message: string
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null
  return (
    <div className="mock-toast">
      <CheckCircle2 size={17} />
      {message}
    </div>
  )
}
