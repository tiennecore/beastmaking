import { View, Text } from 'react-native';

type BarChartDataPoint = {
  label: string;
  value: number;
  value2?: number;
};

interface BarChartProps {
  data: BarChartDataPoint[];
  color: string;
  color2?: string;
  height?: number;
}

const MIN_HEIGHT_FOR_LABEL = 14;

export function BarChart({ data, color, color2, height = 120 }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value + (d.value2 ?? 0)), 1);
  const barHeight = height - 16;

  return (
    <View style={{ height }} className="flex-row items-end gap-1">
      {data.map((d, i) => {
        const primaryH = (d.value / maxVal) * barHeight;
        const secondaryH = d.value2 != null ? (d.value2 / maxVal) * barHeight : 0;
        const totalH = primaryH + secondaryH;
        const totalValue = d.value + (d.value2 ?? 0);
        const isStacked = d.value2 != null && color2 != null;
        const showInside = totalH >= MIN_HEIGHT_FOR_LABEL;

        // For stacked bars: show total in the top bar (value2 / secondary)
        // For single bars: show value in the primary bar
        const topBarH = isStacked ? secondaryH : primaryH;
        const showLabelInTopBar = showInside && topBarH >= MIN_HEIGHT_FOR_LABEL;
        const showLabelInPrimaryFallback = !isStacked && showInside;

        return (
          <View key={i} className="flex-1 items-center">
            {/* Value above bar when total bar is too short */}
            {!showInside && totalValue > 0 && (
              <Text
                style={{ color, fontSize: 10, fontWeight: '700', marginBottom: 2 }}
                numberOfLines={1}
              >
                {totalValue}
              </Text>
            )}

            <View className="w-full items-center justify-end" style={{ height: barHeight }}>
              {isStacked && (
                <View
                  style={{
                    width: '60%',
                    height: secondaryH,
                    backgroundColor: color2,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showLabelInTopBar && (
                    <Text
                      style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}
                      numberOfLines={1}
                    >
                      {totalValue}
                    </Text>
                  )}
                </View>
              )}

              <View
                style={{
                  width: '60%',
                  height: primaryH,
                  backgroundColor: color,
                  borderTopLeftRadius: isStacked ? 0 : 4,
                  borderTopRightRadius: isStacked ? 0 : 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showLabelInPrimaryFallback && totalValue > 0 && (
                  <Text
                    style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}
                    numberOfLines={1}
                  >
                    {totalValue}
                  </Text>
                )}
              </View>
            </View>

            <Text className="text-stone-400 dark:text-stone-500 text-[9px] mt-1">{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
