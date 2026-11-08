import { useMemo, useSyncExternalStore } from 'react'

/**
 * A shopping cart kept in this browser only (there is no shop behind any
 * concept). One small store over localStorage per concept, falling back to
 * memory when storage is unavailable, shared by every component on the page
 * and across tabs (the 'storage' event).
 */
export interface CartLine {
  id: string
  /** The chosen variant, e.g. { metal: 'yellow', size: 'M' }; lines with the same id and options merge. */
  options: Record<string, string>
  qty: number
}

export interface Cart {
  lines: CartLine[]
  add: (id: string, options?: Record<string, string>, qty?: number) => void
  setQty: (index: number, qty: number) => void
  clear: () => void
  count: number
}

const sameOptions = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

export function createCart(key: string, isValid: (line: CartLine) => boolean) {
  let memory = '[]'
  const listeners = new Set<() => void>()
  const read = () => {
    try {
      return localStorage.getItem(key) ?? '[]'
    } catch {
      return memory
    }
  }
  const write = (raw: string) => {
    memory = raw
    try {
      localStorage.setItem(key, raw)
    } catch {
      /* storage unavailable: kept in memory for this page */
    }
    listeners.forEach((f) => f())
  }
  const subscribe = (f: () => void) => {
    listeners.add(f)
    window.addEventListener('storage', f)
    return () => {
      listeners.delete(f)
      window.removeEventListener('storage', f)
    }
  }

  return function useCart(): Cart {
    // the server (and the first client render) sees an empty cart; the saved one follows after hydration
    const raw = useSyncExternalStore(subscribe, read, () => '[]')
    const lines = useMemo<CartLine[]>(() => {
      try {
        const saved = JSON.parse(raw) as CartLine[]
        return Array.isArray(saved) ? saved.filter((l) => l && typeof l.id === 'string' && l.qty > 0 && isValid({ ...l, options: l.options ?? {} })) : []
      } catch {
        return []
      }
    }, [raw])
    const save = (next: CartLine[]) => write(JSON.stringify(next))
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      add: (id, options = {}, qty = 1) => {
        const same = lines.find((l) => l.id === id && sameOptions(l.options ?? {}, options))
        save(same ? lines.map((l) => (l === same ? { ...l, qty: l.qty + qty } : l)) : [...lines, { id, options, qty }])
      },
      setQty: (index, qty) => save(qty <= 0 ? lines.filter((_, i) => i !== index) : lines.map((l, i) => (i === index ? { ...l, qty: Math.min(qty, 9) } : l))),
      clear: () => save([]),
    }
  }
}
