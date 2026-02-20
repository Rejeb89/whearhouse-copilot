import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Group } from '@visx/group'
import { scaleLinear, scaleOrdinal } from '@visx/scale'

interface LowStockItem {
  id: number
  name: string
  quantity: number
  lowStockThreshold?: number
}

interface Props {
  items: LowStockItem[]
  width?: number
  height?: number
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f43f5e', '#a855f7', '#06b6d4', '#84cc16'
]

const NUM_TICKS = 4
const INNER_RADIUS_FACTOR = 0.12

export default function LowStockRadialChart({ items, width = 460, height = 400 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [animated, setAnimated] = useState(false)

  const radius = Math.min(width, height) / 2 - 48
  const cx = width / 2
  const cy = height / 2

  const maxQty = useMemo(() => Math.max(...items.map(i => i.quantity), 1), [items])
  const innerRadius = radius * INNER_RADIUS_FACTOR

  const radialScale = useMemo(
    () => scaleLinear({ domain: [0, maxQty], range: [innerRadius, radius] }),
    [maxQty, radius, innerRadius]
  )

  const colorScale = scaleOrdinal({ domain: items.map((_, i) => i), range: COLORS })

  // Build angle per item (evenly spaced around 2π)
  const angleStep = items.length > 1 ? (2 * Math.PI) / items.length : 2 * Math.PI

  // For each item build a small "spike" LineRadial data — centre → value → back
  const spikes = useMemo(() =>
    items.map((item, i) => {
      const angle = i * angleStep - Math.PI / 2
      const r = radialScale(item.quantity)
      return { item, angle, r, color: colorScale(i) }
    }), [items, angleStep, radialScale, colorScale])

  // Build the outer polygon (connecting all tips)
  const polygonPoints = useMemo(() =>
    spikes.map(({ angle, r }) => [
      Math.cos(angle) * r + cx,
      Math.sin(angle) * r + cy,
    ]), [spikes, cx, cy])

  const polygonD = polygonPoints.length > 0
    ? polygonPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'
    : ''

  // Grid circles
  const gridTicks = Array.from({ length: NUM_TICKS }, (_, i) => ((i + 1) / NUM_TICKS) * maxQty)

  // Spoke axis labels
  const axisLabelRadius = radius + 18

  // Animate on mount
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(t)
  }, [items])

  const pathLength = useMemo(() => {
    if (!svgRef.current) return 2000
    const path = svgRef.current.querySelector('#radial-polygon') as SVGPathElement | null
    return path ? path.getTotalLength() : 2000
  }, [animated]) // eslint-disable-line

  if (items.length === 0) return null

  return (
    <div className="flex flex-col items-center w-full" style={{ direction: 'rtl' }}>
      <svg ref={svgRef} width={width} height={height}>
        <defs>
          <radialGradient id="radialFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.08} />
          </radialGradient>
          {/* clip path */}
          <clipPath id="chart-clip">
            <circle cx={cx} cy={cy} r={radius + 6} />
          </clipPath>
        </defs>

        <Group>
          {/* Grid circles */}
          {gridTicks.map((tick, i) => (
            <circle
              key={`grid-${i}`}
              cx={cx}
              cy={cy}
              r={radialScale(tick)}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          ))}

          {/* Grid spokes */}
          {spikes.map(({ angle }, i) => (
            <line
              key={`spoke-${i}`}
              x1={cx + Math.cos(angle) * innerRadius}
              y1={cy + Math.sin(angle) * innerRadius}
              x2={cx + Math.cos(angle) * radius}
              y2={cy + Math.sin(angle) * radius}
              stroke="#d1d5db"
              strokeWidth={1}
            />
          ))}

          {/* Filled polygon */}
          <path
            d={polygonD}
            fill="url(#radialFill)"
            stroke="none"
            style={{
              transition: 'opacity 0.8s ease',
              opacity: animated ? 1 : 0,
            }}
          />

          {/* Animated polygon border */}
          <path
            id="radial-polygon"
            d={polygonD}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            style={{
              strokeDasharray: pathLength,
              strokeDashoffset: animated ? 0 : pathLength,
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)',
            }}
          />

          {/* Individual animated spikes with dots */}
          {spikes.map(({ angle, r, color, item }, i) => {
            const tipX = cx + Math.cos(angle) * r
            const tipY = cy + Math.sin(angle) * r
            const startX = cx + Math.cos(angle) * innerRadius
            const startY = cy + Math.sin(angle) * innerRadius
            return (
              <g key={`spike-${i}`}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={tipX}
                  y2={tipY}
                  stroke={color}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  style={{
                    opacity: animated ? 1 : 0,
                    transition: `opacity 0.4s ease ${i * 0.1}s`,
                  }}
                />
                {/* Glowing tip dot */}
                <circle
                  cx={tipX}
                  cy={tipY}
                  r={5}
                  fill={color}
                  opacity={animated ? 0.9 : 0}
                  style={{ transition: `opacity 0.4s ease ${i * 0.1 + 0.3}s` }}
                />
                <circle
                  cx={tipX}
                  cy={tipY}
                  r={9}
                  fill={color}
                  opacity={animated ? 0.2 : 0}
                  style={{ transition: `opacity 0.4s ease ${i * 0.1 + 0.3}s` }}
                />
                {/* Quantity label on tip */}
                <text
                  x={tipX + Math.cos(angle) * 14}
                  y={tipY + Math.sin(angle) * 14 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="700"
                  fill={color}
                  fontFamily="Cairo, sans-serif"
                  style={{ opacity: animated ? 1 : 0, transition: `opacity 0.4s ease ${i * 0.1 + 0.5}s` }}
                >
                  {item.quantity}
                </text>
              </g>
            )
          })}

          {/* Centre dot */}
          <circle cx={cx} cy={cy} r={4} fill="#94a3b8" opacity={0.6} />

          {/* Axis labels (item names) */}
          {spikes.map(({ angle, color, item }, i) => {
            const lx = cx + Math.cos(angle) * axisLabelRadius
            const ly = cy + Math.sin(angle) * axisLabelRadius
            const degrees = (angle * 180) / Math.PI
            const flip = degrees > 0 && degrees < 180
            const shortName = item.name.length > 10 ? item.name.slice(0, 10) + '…' : item.name
            return (
              <text
                key={`label-${i}`}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight="600"
                fill={color}
                fontFamily="Cairo, sans-serif"
                transform={`rotate(${flip ? degrees + 90 : degrees - 90}, ${lx}, ${ly})`}
                style={{ opacity: animated ? 1 : 0, transition: `opacity 0.4s ease ${i * 0.1}s` }}
              >
                {shortName}
              </text>
            )
          })}

          {/* Gradient for the polygon line */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </Group>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1 px-4">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-gray-700 font-medium">
              {item.name}:&nbsp;
              <span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                {item.quantity}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
