'use client'

import { useEffect, useRef } from 'react'

export function useBinancePrice(
  symbol: string,
  priceRef: React.RefObject<HTMLDivElement | null>,
  changeRef: React.RefObject<HTMLDivElement | null>
) {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const update = () => {
      fetch(`/api/price?symbol=${symbol}`)
        .then(res => res.json())
        .then(data => {
          if (!data.lastPrice) return
          const price  = parseFloat(data.lastPrice)
          const change = parseFloat(data.priceChangePercent)
          const isUp   = change >= 0

          if (priceRef.current) {
            priceRef.current.textContent = price.toLocaleString('en-US', {
              maximumFractionDigits: 2,
            })
          }
          if (changeRef.current) {
            changeRef.current.textContent = `${isUp ? '+' : ''}${change.toFixed(2)}%`
            changeRef.current.style.color = isUp ? '#00d4aa' : '#ff4d6a'
          }
        })
    }

    update() // 즉시 1회 실행
    pollingRef.current = setInterval(update, 2000) // 2초마다 갱신

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [symbol, priceRef, changeRef])
}