export interface ContactItem {
  id: number | string
  name: string
  preview: string
  time: string
  tone: string
  unread: string
  isGroup: boolean
  avatarUrl?: string | null
}

export interface LightboxImage {
  url: string
  title?: string
  date?: string
}


