import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { format } from 'date-fns';
import { VitalType } from './utils';

interface VitalChartProps {
  data: { date: string; value: any; doctor?: string; notes?: string }[];
  vitalType: VitalType;
}

export const VitalChart: React.FC<VitalChartProps> = ({ data, vitalType }) => {
  if (data.length === 0) return null;

  const chartWidth = Dimensions.get('window').width - 64; // Account for modal padding (32px each side)
  const chartHeight = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Extract numeric values
  const values = data
    .map(item => {
      if (vitalType === 'blood_pressure') {
        return (item.value.systolic + item.value.diastolic) / 2; // Use average for BP
      }
      return typeof item.value === 'number'
        ? item.value
        : parseFloat(item.value);
    })
    .reverse(); // Reverse to show oldest first

  const dates = data.map(item => item.date).reverse();

  // Calculate min and max with padding
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const yMin = minValue - valueRange * 0.1;
  const yMax = maxValue + valueRange * 0.1;

  // Create path for line chart
  const points = values.map((value, index) => {
    const x = padding.left + (index / (values.length - 1)) * graphWidth;
    const y =
      padding.top +
      graphHeight -
      ((value - yMin) / (yMax - yMin)) * graphHeight;
    return { x, y, value };
  });

  const pathData = points
    .map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    })
    .join(' ');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + graphHeight * (1 - ratio);
    const value = yMin + (yMax - yMin) * ratio;
    return { y, value };
  });

  return (
    <View className="mb-4">
      <View
        className="bg-white rounded-2xl p-4 border border-gray-100"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {gridLines.map((line, index) => (
            <Line
              key={index}
              x1={padding.left}
              y1={line.y}
              x2={chartWidth - padding.right}
              y2={line.y}
              stroke="#F3F4F6"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}

          {/* Y-axis labels */}
          {gridLines.map((line, index) => (
            <SvgText
              key={index}
              x={padding.left - 8}
              y={line.y + 3}
              fontSize="9"
              fill="#9CA3AF"
              textAnchor="end"
              fontWeight="500"
            >
              {line.value.toFixed(0)}
            </SvgText>
          ))}

          {/* Line path */}
          <Path
            d={pathData}
            stroke="#F05C0C"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#F05C0C"
              stroke="#FFF"
              strokeWidth="2.5"
            />
          ))}

          {/* X-axis labels (show first, middle, last) */}
          {[0, Math.floor(dates.length / 2), dates.length - 1]
            .filter((value, idx, arr) => arr.indexOf(value) === idx) // Remove duplicates
            .map(index => {
              if (index >= dates.length) return null;
              const x =
                padding.left + (index / (values.length - 1)) * graphWidth;
              return (
                <SvgText
                  key={`x-label-${index}`}
                  x={x}
                  y={chartHeight - 8}
                  fontSize="9"
                  fill="#9CA3AF"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {format(new Date(dates[index]), 'MMM dd')}
                </SvgText>
              );
            })}
        </Svg>
      </View>
    </View>
  );
};
