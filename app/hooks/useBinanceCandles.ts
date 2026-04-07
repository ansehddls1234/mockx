'use client'

import { useEffect, useState, useRef } from 'react'
import { UTCTimestamp } from 'lightweight-charts'

export interface Candle {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
}

export function useBinanceCandles(symbol: string, interval: string) {
  const [candles, setCandles] = useState<Candle[]>([])
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setCandles([])

    // 초기 캔들 데이터 로드
    fetch(`/api/candles?symbol=${symbol}&interval=${interval}&limit=500`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const parsed: Candle[] = data.map((k: unknown[]) => ({
          time:  Math.floor((k[0] as number) / 1000) as UTCTimestamp,
          open:  parseFloat(k[1] as string),
          high:  parseFloat(k[2] as string),
          low:   parseFloat(k[3] as string),
          close: parseFloat(k[4] as string),
        }))
        setCandles(parsed)
      })

    // 2초마다 최신 캔들 폴링
    pollingRef.current = setInterval(() => {
      fetch(`/api/candles?symbol=${symbol}&interval=${interval}&limit=2`)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data)) return
          const k = data[data.length - 1] as unknown[]
          const candle: Candle = {
            time:  Math.floor((k[0] as number) / 1000) as UTCTimestamp,
            open:  parseFloat(k[1] as string),
            high:  parseFloat(k[2] as string),
            low:   parseFloat(k[3] as string),
            close: parseFloat(k[4] as string),
          }
          setCandles(prev => {
            if (!prev.length) return [candle]
            const last = prev[prev.length - 1]
            if (last.time === candle.time) return [...prev.slice(0, -1), candle]
            return [...prev, candle]
          })
        })
    }, 2000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [symbol, interval])

  return { candles }
}