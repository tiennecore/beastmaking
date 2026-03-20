import { useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface Props {
  info: string;
  accessibilityLabel?: string;
}

const LIGHT_COLORS = {
  bg: '#fff7ed',
  text: '#9a3412',
  border: '#fdba74',
};

const DARK_COLORS = {
  bg: '#431407',
  text: '#fed7aa',
  border: '#9a3412',
};

const TOOLTIP_WIDTH = 280;
const NEAR_TOP_THRESHOLD = 120;

export function InfoButton({ info, accessibilityLabel = "Afficher plus d'informations" }: Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, height: 0 });
  const buttonRef = useRef<View>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { colorScheme } = useColorScheme();

  const themeColors = colorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const arrowColor = themeColors.bg;

  const tooltipLeft = Math.max(16, Math.min(position.x - TOOLTIP_WIDTH / 2, screenWidth - TOOLTIP_WIDTH - 16));
  const arrowOffset = position.x - tooltipLeft - 6;
  const isNearTop = position.y < NEAR_TOP_THRESHOLD;

  const tooltipBottom = screenHeight - position.y;
  const tooltipTop = position.y + position.height + 8;

  const handlePress = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setPosition({ x: x + width / 2, y, height });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setVisible(true);
    });
  };

  const handleClose = () => setVisible(false);

  return (
    <>
      <View
        ref={buttonRef}
        collapsable={false}
        style={{ justifyContent: 'center', alignItems: 'center' }}
      >
        <Pressable
          onPress={handlePress}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <Ionicons name="information-circle-outline" size={20} color="#F97316" />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <Pressable
          className="flex-1"
          onPress={handleClose}
          accessibilityLabel="Fermer"
          accessibilityRole="button"
        >
          <View
            style={{
              position: 'absolute',
              ...(isNearTop ? { top: tooltipTop } : { bottom: tooltipBottom }),
              left: tooltipLeft,
              width: TOOLTIP_WIDTH,
            }}
          >
            {!isNearTop && (
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 0,
                  borderBottomWidth: 6,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: arrowColor,
                  marginLeft: Math.max(6, Math.min(arrowOffset, TOOLTIP_WIDTH - 18)),
                  marginBottom: -1,
                }}
              />
            )}

            <View
              style={{
                backgroundColor: themeColors.bg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: themeColors.border,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 5,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: themeColors.text, fontSize: 14, fontWeight: '700' }}>
                  Conseil
                </Text>
                <Pressable
                  onPress={handleClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le conseil"
                >
                  <Ionicons name="close-circle" size={18} color={themeColors.text} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 180 }}
                nestedScrollEnabled
              >
                <Text style={{ color: themeColors.text, fontSize: 14, lineHeight: 20 }}>
                  {info}
                </Text>
              </ScrollView>
            </View>

            {isNearTop && (
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 6,
                  borderBottomWidth: 0,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: arrowColor,
                  marginLeft: Math.max(6, Math.min(arrowOffset, TOOLTIP_WIDTH - 18)),
                  marginTop: -1,
                }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
