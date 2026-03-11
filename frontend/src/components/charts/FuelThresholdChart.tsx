import React from 'react'
import { Group } from '@visx/group'
import { curveBasis } from '@visx/curve'
import { LinePath } from '@visx/shape'
import { Threshold } from '@visx/threshold'
import { scaleLinear, scalePoint } from '@visx/scale'
import { AxisLeft, AxisBottom } from '@visx/axis'
import { GridRows, GridColumns } from '@visx/grid'

const MONTHS_AR = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export interface MonthStat { month: number; consumed: number; delivered: number }

interface Props {
  curYear:  number
  prevYear: number
  curData:  MonthStat[]
  prevData: MonthStat[]
  width:    number
  height?:  number
  metric?:  'consumed' | 'delivered'
}

const margin = { top: 36, right: 24, bottom: 48, left: 68 }

export default function FuelThresholdChart({
  curYear, prevYear, curData, prevData, width, height = 300, metric = 'consumed'
}: Props) {
  if (width < 60) return null

  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  // Fill missing months with 0
  const normalize = (data: MonthStat[]) =>
    Array.from({ length: 12 }, (_, i) => {
      const found = data.find(d => d.month === i + 1)
      return { month: i + 1, consumed: found?.consumed ?? 0, delivered: found?.delivered ?? 0 }
    })

  const cur  = normalize(curData)
  const prev = normalize(prevData)

  const months = MONTHS_AR.map((_, i) => String(i + 1))

  const xScale = scalePoint<string>({
    domain: months,
    range:  [0, xMax],
    padding: 0.2,
  })

  const allVals = [...cur, ...prev].map(d => d[metric])
  const yMax1 = Math.max(...allVals, 1)

  const yScale = scaleLinear<number>({
    domain: [0, yMax1 * 1.1],
    range:  [yMax, 0],
    nice:   true,
  })

  const getX = (d: MonthStat) => xScale(String(d.month)) ?? 0
  const getCur  = (d: MonthStat) => yScale(d[metric])
  const getPrev = (d: MonthStat) => yScale(prev[d.month - 1][metric])

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <Group left={margin.left} top={margin.top}>
        <GridRows    scale={yScale}  width={xMax}  height={yMax} stroke="#e2e8f0" strokeDasharray="3,3" />
        <GridColumns scale={xScale}  width={xMax}  height={yMax} stroke="#e2e8f0" strokeDasharray="3,3" />

        {/* Threshold fill */}
        <Threshold<MonthStat>
          id="fuel-threshold"
          data={cur}
          x={getX}
          y0={getCur}
          y1={getPrev}
          clipAboveTo={0}
          clipBelowTo={yMax}
          curve={curveBasis}
          belowAreaProps={{ fill: '#ef4444', fillOpacity: 0.15 }}
          aboveAreaProps={{ fill: '#22c55e', fillOpacity: 0.15 }}
        />

        {/* Previous year line */}
        <LinePath<MonthStat>
          data={prev}
          x={getX}
          y={d => yScale(d[metric])}
          curve={curveBasis}
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="5,3"
        />

        {/* Current year line */}
        <LinePath<MonthStat>
          data={cur}
          x={getX}
          y={d => yScale(d[metric])}
          curve={curveBasis}
          stroke="#3b82f6"
          strokeWidth={2.5}
        />

        {/* Dots current year */}
        {cur.map((d, i) => (
          <circle
            key={i}
            cx={getX(d)}
            cy={yScale(d[metric])}
            r={3.5}
            fill="#3b82f6"
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}

        {/* Dots prev year */}
        {prev.map((d, i) => (
          d[metric] > 0 && (
            <circle
              key={i}
              cx={getX(d)}
              cy={yScale(d[metric])}
              r={3}
              fill="#94a3b8"
              stroke="#fff"
              strokeWidth={1.5}
            />
          )
        ))}

        <AxisBottom
          top={yMax}
          scale={xScale}
          tickFormat={m => MONTHS_AR[Number(m) - 1]}
          tickLabelProps={() => ({ fontSize: 10, fontFamily: 'Cairo, sans-serif', textAnchor: 'middle', fill: '#64748b' })}
          stroke="#cbd5e1"
          tickStroke="#cbd5e1"
        />
        <AxisLeft
          scale={yScale}
          numTicks={5}
          tickLabelProps={() => ({ fontSize: 10, fontFamily: 'Cairo, sans-serif', textAnchor: 'end', fill: '#64748b', dy: '0.33em', dx: -4 })}
          stroke="#cbd5e1"
          tickStroke="#cbd5e1"
          tickFormat={v => `${Number(v).toFixed(0)}`}
        />

        {/* Y-axis label */}
        <text
          x={-yMax / 2}
          y={-52}
          transform="rotate(-90)"
          fontSize={10}
          fontFamily="Cairo, sans-serif"
          fill="#64748b"
          textAnchor="middle"
        >
          {metric === 'consumed' ? 'المستهلك (د.ت)' : 'المسلم (د.ت)'}
        </text>
      </Group>

      {/* Legend */}
      <Group left={margin.left} top={10}>
        <rect x={0} y={0} width={12} height={3} rx={1} fill="#3b82f6" />
        <text x={16} y={4} fontSize={10} fontFamily="Cairo, sans-serif" fill="#334155">{curYear}</text>
        <rect x={60} y={0} width={12} height={3} rx={1} fill="#94a3b8" />
        <text x={76} y={4} fontSize={10} fontFamily="Cairo, sans-serif" fill="#334155">{prevYear}</text>
        <rect x={130} y={0} width={10} height={10} rx={2} fill="#22c55e" fillOpacity={0.4} />
        <text x={144} y={9} fontSize={9} fontFamily="Cairo, sans-serif" fill="#334155">ارتفاع</text>
        <rect x={185} y={0} width={10} height={10} rx={2} fill="#ef4444" fillOpacity={0.3} />
        <text x={199} y={9} fontSize={9} fontFamily="Cairo, sans-serif" fill="#334155">انخفاض</text>
      </Group>
    </svg>
  )
}
