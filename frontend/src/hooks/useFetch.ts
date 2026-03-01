import { useState, useEffect, useCallback, useRef } from 'react'
import client from '../services/client'

interface UseFetchOptions {
  immediate?: boolean
}

/**
 * Generic hook to fetch data from the API.
 */
export function useFetch<T>(url: string, options: UseFetchOptions = { immediate: true }) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.get(url)
      if (mountedRef.current) setData(res.data)
    } catch (err: any) {
      if (mountedRef.current) setError(err?.response?.data?.error || err.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [url])

  useEffect(() => {
    mountedRef.current = true
    if (options.immediate) fetchData()
    return () => { mountedRef.current = false }
  }, [fetchData, options.immediate])

  return { data, loading, error, refetch: fetchData }
}
