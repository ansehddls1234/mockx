'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from 'lightweight-charts'
import type { IPriceLine } from 'lightweight-charts'
import { useBinanceCandles } from '../hooks/useBinanceCandles'

const INTERVALS = [
  { label: '1분', value: '1m' },
  { label: '5분', value: '5m' },
  { label: '15분', value: '15m' },
  { label: '1시간', value: '1h' },
  { label: '4시간', value: '4h' },
  { label: '1일', value: '1d' },
  { label: '1주', value: '1w' },
]

function calcMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    const slice = data.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

interface Position {
  id: string
  symbol: string
  type: string
  entryPrice: number
  margin: number
  leverage: number
}

type Candle = {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
}

export default function Chart({
  symbol = 'BTC-USDT',
  positions = [],
}: {
  symbol?: string
  positions?: Position[]
}) {
  const getPriceFormat = (price: number) => {
    if (price >= 1000) return { minMove: 0.01, precision: 2 }
    if (price >= 1) return { minMove: 0.0001, precision: 4 }
    if (price >= 0.01) return { minMove: 0.00001, precision: 5 }
    return { minMove: 0.0000001, precision: 7 }
  }

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const ma5Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const ma20Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const ma60Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const initializedRef = useRef(false)
  const priceLinesRef = useRef<IPriceLine[]>([])

  const [interval, setInterval] = useState('1m')
  const [showMA5, setShowMA5] = useState(true)
  const [showMA20, setShowMA20] = useState(true)
  const [showMA60, setShowMA60] = useState(true)

  const { candles } = useBinanceCandles(symbol, interval)

  const safeCandles = useMemo<Candle[]>(() => {
    if (!Array.isArray(candles)) return []
    return candles
      .filter(
        (c: any) =>
          c &&
          Number.isFinite(Number(c.time)) &&
          Number.isFinite(Number(c.open)) &&
          Number.isFinite(Number(c.high)) &&
          Number.isFinite(Number(c.low)) &&
          Number.isFinite(Number(c.close))
      )
      .map((c: any) => ({
        time: Number(c.time) as UTCTimestamp,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }))
      .sort((a, b) => a.time - b.time)
      .filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time)
  }, [candles])

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstanceRef.current) return

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0b0e' },
        textColor: '#8b8fa8',
      },
      grid: {
        vertLines: { color: '#1a1d25' },
        horzLines: { color: '#1a1d25' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.2)' },
        horzLine: { color: 'rgba(255,255,255,0.2)' },
      },
      width: chartRef.current.clientWidth || 800,
      height: chartRef.current.clientHeight || 500,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00d4aa',
      downColor: '#ff4d6a',
      borderUpColor: '#00d4aa',
      borderDownColor: '#ff4d6a',
      wickUpColor: '#00d4aa',
      wickDownColor: '#ff4d6a',
    })

    const ma5 = chart.addSeries(LineSeries, {
      color: '#f0b90b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const ma20 = chart.addSeries(LineSeries, {
      color: '#7b61ff',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const ma60 = chart.addSeries(LineSeries, {
      color: '#ff4d6a',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    chartInstanceRef.current = chart
    candleSeriesRef.current = candleSeries
    ma5Ref.current = ma5
    ma20Ref.current = ma20
    ma60Ref.current = ma60

    const handleResize = () => {
      if (!chartRef.current || !chartInstanceRef.current) return
      chartInstanceRef.current.applyOptions({
        width: chartRef.current.clientWidth || 800,
        height: chartRef.current.clientHeight || 500,
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartInstanceRef.current = null
      candleSeriesRef.current = null
      ma5Ref.current = null
      ma20Ref.current = null
      ma60Ref.current = null
      priceLinesRef.current = []
      initializedRef.current = false
    }
  }, [])

  useEffect(() => {
    initializedRef.current = false
  }, [interval, symbol])

  useEffect(() => {
    if (!candleSeriesRef.current) return
    if (!safeCandles.length) return

    const closes = safeCandles.map(c => c.close)
    const times = safeCandles.map(c => c.time)

    const lastPrice = safeCandles[safeCandles.length - 1].close
    const fmt = getPriceFormat(lastPrice)

    candleSeriesRef.current.applyOptions({
      priceFormat: { type: 'price', ...fmt },
    })

    candleSeriesRef.current.setData(safeCandles)

    const ma5Data = calcMA(closes, 5)
      .map((v, i) =>
        v !== null && Number.isFinite(times[i])
          ? { time: times[i] as UTCTimestamp, value: v }
          : null
      )
      .filter(
        (v): v is { time: UTCTimestamp; value: number } =>
          !!v && Number.isFinite(v.time) && Number.isFinite(v.value)
      )
      .sort((a, b) => a.time - b.time)

    const ma20Data = calcMA(closes, 20)
      .map((v, i) =>
        v !== null && Number.isFinite(times[i])
          ? { time: times[i] as UTCTimestamp, value: v }
          : null
      )
      .filter(
        (v): v is { time: UTCTimestamp; value: number } =>
          !!v && Number.isFinite(v.time) && Number.isFinite(v.value)
      )
      .sort((a, b) => a.time - b.time)

    const ma60Data = calcMA(closes, 60)
      .map((v, i) =>
        v !== null && Number.isFinite(times[i])
          ? { time: times[i] as UTCTimestamp, value: v }
          : null
      )
      .filter(
        (v): v is { time: UTCTimestamp; value: number } =>
          !!v && Number.isFinite(v.time) && Number.isFinite(v.value)
      )
      .sort((a, b) => a.time - b.time)

    ma5Ref.current?.setData(ma5Data)
    ma20Ref.current?.setData(ma20Data)
    ma60Ref.current?.setData(ma60Data)

    if (!initializedRef.current) {
      chartInstanceRef.current?.timeScale().scrollToRealTime()
      initializedRef.current = true
    }
  }, [safeCandles])

  useEffect(() => {
    if (!candleSeriesRef.current) return

    priceLinesRef.current.forEach(line => {
      try {
        candleSeriesRef.current?.removePriceLine(line)
      } catch {}
    })
    priceLinesRef.current = []

    const normalizedSymbol = symbol.includes('-')
      ? symbol.replace('-', '')
      : symbol

    const symbolPositions = positions.filter(p => {
      const posSymbol = p.symbol.includes('-')
        ? p.symbol.replace('-', '')
        : p.symbol
      return posSymbol === normalizedSymbol
    })

    symbolPositions.forEach(pos => {
      const isLong = pos.type === 'long'
      const color = isLong ? '#00d4aa' : '#ff4d6a'
      const label = `${isLong ? '🟢 롱' : '🔴 숏'} ${pos.leverage}x | 진입가 ${pos.entryPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}`

      const line = candleSeriesRef.current!.createPriceLine({
        price: pos.entryPrice,
        color,
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: label,
      })

      priceLinesRef.current.push(line)
    })
  }, [positions, symbol])

  useEffect(() => { ma5Ref.current?.applyOptions({ visible: showMA5 }) }, [showMA5])
  useEffect(() => { ma20Ref.current?.applyOptions({ visible: showMA20 }) }, [showMA20])
  useEffect(() => { ma60Ref.current?.applyOptions({ visible: showMA60 }) }, [showMA60])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 12px',
        borderBottom: '1px solid #222',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              style={{
                padding: '4px 10px',
                borderRadius: '5px',
                border: 'none',
                background: interval === iv.value ? '#7b61ff' : 'transparent',
                color: interval === iv.value ? 'white' : '#8b8fa8',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {iv.label}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '16px', background: '#222' }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'MA5', color: '#f0b90b', show: showMA5, setShow: setShowMA5 },
            { label: 'MA20', color: '#7b61ff', show: showMA20, setShow: setShowMA20 },
            { label: 'MA60', color: '#ff4d6a', show: showMA60, setShow: setShowMA60 },
          ].map(ma => (
            <button
              key={ma.label}
              onClick={() => ma.setShow(!ma.show)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: `1px solid ${ma.show ? ma.color : '#333'}`,
                background: 'transparent',
                color: ma.show ? ma.color : '#4a4e63',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {ma.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '300px' }} ref={chartRef} />
    </div>
  )
}