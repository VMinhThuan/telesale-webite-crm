/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_DATA_MODE?: string
  readonly VITE_R2_PUBLIC_URL?: string
  readonly VITE_R2_BUCKET_NAME?: string
  readonly VITE_R2_ACCOUNT_ID?: string
  readonly VITE_R2_ACCESS_KEY_ID?: string
  readonly VITE_R2_SECRET_ACCESS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
