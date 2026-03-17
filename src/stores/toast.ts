// stores/toast.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let idCounter = 0

  function add(message: string, type: Toast['type'] = 'info') {
    const id = ++idCounter
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), 3200)
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function success(message: string) {
    add(message, 'success')
  }

  function error(message: string) {
    add(message, 'error')
  }

  function info(message: string) {
    add(message, 'info')
  }

  return {
    toasts,
    add,
    remove,
    success,
    error,
    info,
  }
})
