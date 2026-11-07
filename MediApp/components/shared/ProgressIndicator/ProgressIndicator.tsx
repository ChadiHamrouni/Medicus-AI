import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  activeColor?: string;
  inactiveColor?: string;
  circleRadius?: number;
  lineLength?: number;
  spacing?: number;
  height?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  activeColor = '#F05C0C',
  inactiveColor = '#FFC07E',
  circleRadius = 40,
  lineLength: _lineLength = 150,
  spacing = 190,
  height = 60,
}) => {
  return (
    <View className="w-full" style={{ height }}>
      <Svg
        height={height}
        width="100%"
        viewBox={`0 0 ${(steps.length - 1) * spacing + circleRadius * 2} ${height}`}
      >
        {steps.map((_, index) => {
          const x = circleRadius + index * spacing;
          const isActive = index === currentStep;

          return (
            <React.Fragment key={index}>
              <Circle
                cx={x}
                cy={height / 2}
                r={circleRadius}
                fill={isActive ? activeColor : inactiveColor}
              />
              {index < steps.length - 1 && (
                <Line
                  x1={x + circleRadius}
                  y1={height / 2}
                  x2={x + spacing - circleRadius}
                  y2={height / 2}
                  stroke={isActive ? activeColor : inactiveColor}
                  strokeWidth="1"
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};
