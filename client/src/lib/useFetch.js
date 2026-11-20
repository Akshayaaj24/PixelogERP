import { useCallback, useEffect, useState } from 'react'
import { get } from './api'

// const { data, loading, error, reload } = useFetch('/clients')
export default function useFetch(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    if (!path) return
    setLoading(true)
    get(path)
      .then((d) => { setData(d); setError('') })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [path])

  useEffect(reload, [reload])
  return { data, setData, loading, error, reload }
}
