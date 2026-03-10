import React, { useMemo, useState } from 'react'
import { Chord, Ribbon } from '@visx/chord'
import { Group } from '@visx/group'
import { scaleOrdinal } from '@visx/scale'
import { arc as d3arc } from 'd3-shape'

interface LowStockItem {
  id: number
  name: string
  quantity: number
  lowStockThreshold?: number
  category?: string
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

const LowStockChordChart: React.FC<Props> = ({ items: rawItems, width = 440, height = 380 }) => {
  const items = rawItems.filter((it) => (it.category || '').trim() !== 'اثاث قار')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)

  const radius = Math.min(width, height) / 2 - 40
  const innerRadius = radius - 24

  // Build symmetric matrix: matrix[i][j] = min(qty_i, qty_j) for flow visual
  const matrix = useMemo(() => {
    const n = items.length
    if (n === 0) return []
    const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          mat[i][j] = Math.min(items[i].quantity, items[j].quantity)
        } else {
          // Self: give it a weight so single-item still shows
          mat[i][i] = items[i].quantity
        }
      }
    }
    return mat
  }, [items])

  const arcGenerator = useMemo(
    () =>
      d3arc<{ startAngle: number; endAngle: number }>()
        .innerRadius(innerRadius)
        .outerRadius(radius),
    [innerRadius, radius]
  )

  const colorScale = scaleOrdinal({
    domain: items.map((_, i) => i.toString()),
    range: COLORS,
  })

  if (items.length === 0) return null

  return (
    <div className="relative flex flex-col items-center" style={{ direction: 'rtl' }}>
      <svg width={width} height={height}>
        <Group top={height / 2} left={width / 2}>
          <Chord matrix={matrix} padAngle={0.04} sortSubgroups={(a, b) => a.value - b.value}>
            {({ chords }) => (
              <g>
                {/* Outer arcs */}
                {chords.groups.map((group, i) => (
                  <g key={`arc-${i}`}>
                    <path
                      d={arcGenerator(group) ?? ''}
                      fill={colorScale(i.toString())}
                      opacity={0.85}
                      onMouseEnter={(e) => {
                        const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect()
                        setTooltip({
                          x: e.clientX - (rect?.left ?? 0),
                          y: e.clientY - (rect?.top ?? 0),
                          label: `${items[i].name}: ${items[i].quantity} متبقي`,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  </g>
                ))}

                {/* Chords/Ribbons */}
                {chords.map((chord, i) => (
                  <Ribbon
                    key={`ribbon-${i}`}
                    chord={chord}
                    radius={innerRadius}
                    fill={colorScale(chord.source.index.toString())}
                    opacity={0.3}
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect()
                      const src = items[chord.source.index]
                      const tgt = items[chord.target.index]
                      if (src && tgt) {
                        setTooltip({
                          x: e.clientX - (rect?.left ?? 0),
                          y: e.clientY - (rect?.top ?? 0),
                          label: `${src.name} ↔ ${tgt.name}`,
                        })
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}

                {/* Arc labels */}
                {chords.groups.map((group, i) => {
                  const angle = (group.startAngle + group.endAngle) / 2
                  const labelRadius = radius + 14
                  const x = labelRadius * Math.sin(angle)
                  const y = -labelRadius * Math.cos(angle)
                  const rotate = (angle * 180) / Math.PI - 90
                  const flip = angle > Math.PI
                  return (
                    <text
                      key={`label-${i}`}
                      x={x}
                      y={y}
                      textAnchor={flip ? 'end' : 'start'}
                      transform={`rotate(${flip ? rotate + 180 : rotate}, ${x}, ${y})`}
                      fontSize={10}
                      fill="#374151"
                      fontFamily="Cairo, sans-serif"
                      fontWeight="600"
                    >
                      {items[i].name.length > 12 ? items[i].name.slice(0, 12) + '…' : items[i].name}
                    </text>
                  )
                })}
              </g>
            )}
          </Chord>
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-popover text-popover-foreground text-xs px-3 py-1.5 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap border border-border"
          style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
        >
          {tooltip.label}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 px-4">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-foreground font-medium">
              {item.name}: <span className="font-bold text-red-600">{item.quantity}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LowStockChordChart
