export interface TrainingMaterial {
  id: string
  title: string
  desc: string
  category: string
  type: 'pdf' | 'video' | 'doc' | string
  fileUrl: string
  fileKey?: string
  fileSize?: string
  meta: string
  tone?: string
  publishedAt?: string
  updatedAt?: string
}

export interface TrainingJourneyStep {
  title: string
  desc: string
  tone?: string
}

export interface TrainingManifest {
  version: string
  updatedAt: string
  categories: string[]
  materials: TrainingMaterial[]
  journeys: Record<string, TrainingJourneyStep[]>
}

export interface UploadMaterialPayload {
  file: File
  title: string
  desc: string
  category: string
  type?: 'pdf' | 'video' | 'doc'
  publishedAt?: string
}
