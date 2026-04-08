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
      fetch(`/api/ticker?symbol=${symbol}`)
        .then(res => res.json())
        .then(data => {
          if (!data.lastPrice) return
          const price  = data.lastPrice as number
          const change = data.change24h as number
          const isUp   = change >= 0

          if (priceRef.current) {
            priceRef.current.textContent = price.toLocaleString('en-US', {
              maximumFractionDigits: 4,
            })
          }
          if (changeRef.current) {
            changeRef.current.textContent = `${isUp ? '+' : ''}${change.toFixed(2)}%`
            changeRef.current.style.color = isUp ? '#00d4aa' : '#ff4d6a'
          }
        })
    }

    update()
    pollingRef.current = setInterval(update, 2000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [symbol, priceRef, changeRef])
}