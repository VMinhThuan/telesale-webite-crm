export interface BannerItem {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  createdAt?: string
}

export interface BannerConfig {
  intervalSeconds: number
  autoPlay: boolean
  items: BannerItem[]
}

export interface TelesaleScript {
  id: string
  name: string
  title: string
  steps: string[]
  tip?: string
}

export interface TelesaleConfigFile {
  version: string
  updatedAt: string
  banners: BannerConfig
  scripts: TelesaleScript[]
}

