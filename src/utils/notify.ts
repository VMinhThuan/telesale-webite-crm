export const notify = (message: string): void => {
  window.dispatchEvent(new CustomEvent('salesflow:toast', { detail: message }))
}
