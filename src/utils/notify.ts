export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastOptions {
  type?: ToastType
  duration?: number
}

export interface ToastPayload {
  message: string
  type?: ToastType
  duration?: number
}

export const notify = (
  message: string,
  options?: ToastOptions,
): void => {
  const payload: ToastPayload = {
    message,
    type: options?.type || 'info',
    duration: options?.duration,
  }
  window.dispatchEvent(new CustomEvent('salesflow:toast', { detail: payload }))
}
