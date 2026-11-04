import { formatPercent } from '../../../utils/formatters';
import React from 'react';
import { Sector } from 'recharts';

export function createPieSectorRenderer({ activeItem, totalPieUsd }) {
  return function renderDissectedSector(props) {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, midAngle, fill, name, value } = props;
    const isSelected = activeItem && activeItem.name === name;
    const RADIAN = Math.PI / 180;
    const cos = Math.cos(-midAngle * RADIAN);
    const sin = Math.sin(-midAngle * RADIAN);
    const offset = isSelected ? 6 : 0;
    const dx = cos * offset;
    const dy = sin * offset;
    const currentOuter = isSelected ? outerRadius + 4 : outerRadius;
    const pct = totalPieUsd > 0 ? (Number(value) / totalPieUsd) * 100 : 0;
    const pctText = formatPercent(pct, 1);

    const sx = cx + dx + cos * (currentOuter + 1);
    const sy = cy + dy + sin * (currentOuter + 1);
    const mx = cx + dx + cos * (currentOuter + 13);
    const my = cy + dy + sin * (currentOuter + 13);
    const isRight = cos >= 0;
    const ex = mx + (isRight ? 16 : -16);
    const ey = my;
    const arrowTipX = ex;
    const arrowBaseX = ex + (isRight ? -4.5 : 4.5);

    return (
      <g style={{ cursor: 'pointer', outline: 'none' }}>
        <Sector
          cx={cx + dx}
          cy={cy + dy}
          innerRadius={innerRadius}
          outerRadius={currentOuter}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="none"
          style={{
            cursor: 'pointer',
            outline: 'none',
            opacity: activeItem && !isSelected ? 0.45 : 1,
            transition: 'opacity 0.2s ease'
          }}
        />
        {isSelected && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={sx} cy={sy} r={2.2} fill={fill} />
            <polyline
              points={`${sx},${sy} ${mx},${my} ${ex},${ey}`}
              fill="none"
              stroke={fill}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points={`${arrowTipX},${ey} ${arrowBaseX},${ey - 3} ${arrowBaseX},${ey + 3}`}
              fill={fill}
            />
            <text
              x={ex + (isRight ? 6 : -6)}
              y={ey}
              fill={fill}
              textAnchor={isRight ? 'start' : 'end'}
              dominantBaseline="central"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '-0.01em'
              }}
            >
              {pctText}
            </text>
          </g>
        )}
      </g>
    );
  };
}
