import { useState, useCallback } from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { SegmentedControl } from '@/components/SegmentedControl';
import { GeneralView } from '@/components/statistics/GeneralView';
import { PoutreView } from '@/components/statistics/PoutreView';
import { EscaladeView } from '@/components/statistics/EscaladeView';
import { useStatistics } from '@/hooks/useStatistics';

type StatView = 'general' | 'poutre' | 'escalade';

const VIEWS = ['general', 'poutre', 'escalade'] as const;

const VIEW_OPTIONS: { value: StatView; label: string }[] = [
  { value: 'general', label: 'Général' },
  { value: 'poutre', label: 'Poutre' },
  { value: 'escalade', label: 'Escalade' },
];

const SWIPE_THRESHOLD = 50;

export default function StatisticsScreen() {
  const { loading, general, poutre, escalade, dayActivities } = useStatistics();
  const [viewIndex, setViewIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const insets = useSafeAreaInsets();

  const view = VIEWS[viewIndex];

  const handleViewChange = useCallback(
    (newView: StatView) => {
      const newIndex = VIEWS.indexOf(newView);
      setSlideDirection(newIndex > viewIndex ? 'right' : 'left');
      setViewIndex(newIndex);
    },
    [viewIndex],
  );

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && viewIndex < VIEWS.length - 1) {
        setSlideDirection('right');
        setViewIndex((i) => i + 1);
      } else if (event.translationX > SWIPE_THRESHOLD && viewIndex > 0) {
        setSlideDirection('left');
        setViewIndex((i) => i - 1);
      }
    })
    .runOnJS(true);

  const entering = slideDirection === 'right'
    ? SlideInRight.duration(250)
    : SlideInLeft.duration(250);

  return (
    <GestureDetector gesture={swipeGesture}>
      <ScrollView
        className="flex-1 bg-white dark:bg-stone-950"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
      >
        <View className="mb-4">
          <SegmentedControl
            options={VIEW_OPTIONS}
            value={view}
            onChange={handleViewChange}
          />
        </View>

        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <Animated.View key={view} entering={entering}>
            {view === 'general' && (
              <GeneralView stats={general} dayActivities={dayActivities} />
            )}
            {view === 'poutre' && (
              <PoutreView stats={poutre} dayActivities={dayActivities} />
            )}
            {view === 'escalade' && (
              <EscaladeView stats={escalade} dayActivities={dayActivities} />
            )}
          </Animated.View>
        )}
      </ScrollView>
    </GestureDetector>
  );
}
