import { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PrinciplesSection } from '@/components/library/PrinciplesSection';
import { EnergySystemsSection } from '@/components/library/EnergySystemsSection';
import { GripsSection } from '@/components/library/GripsSection';
import { ParametersSection } from '@/components/library/ParametersSection';
import { CrimpLearningSection } from '@/components/library/CrimpLearningSection';

const SECTIONS = [
  { key: 'principles', label: 'Principes', color: '#F97316' },
  { key: 'energy', label: 'Filières', color: '#22D3EE' },
  { key: 'grips', label: 'Préhensions', color: '#A855F7' },
  { key: 'params', label: 'Paramètres', color: '#F59E0B' },
  { key: 'crimp', label: 'Arqué', color: '#EF4444' },
];

export default function LibraryScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const pillScrollRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, number>>({});
  const pillPositions = useRef<Record<string, number>>({});
  const [activeSection, setActiveSection] = useState('principles');

  useEffect(() => {
    const x = pillPositions.current[activeSection];
    if (x !== undefined) {
      pillScrollRef.current?.scrollTo({ x: Math.max(0, x - 20), animated: true });
    }
  }, [activeSection]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y + 50;

    let current = SECTIONS[0].key;
    for (const section of SECTIONS) {
      const sectionY = sectionRefs.current[section.key];
      if (sectionY !== undefined && y >= sectionY) {
        current = section.key;
      }
    }

    if (current !== activeSection) {
      setActiveSection(current);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-stone-950">
      <View className="bg-white dark:bg-stone-950 px-5 pt-4 pb-2 border-b border-stone-200 dark:border-stone-800">
        <ScrollView ref={pillScrollRef} horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 px-1">
            {SECTIONS.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => {
                  const y = sectionRefs.current[s.key];
                  if (y !== undefined) scrollViewRef.current?.scrollTo({ y, animated: true });
                }}
                onLayout={(e) => { pillPositions.current[s.key] = e.nativeEvent.layout.x; }}
                className={`rounded-full px-4 py-2 border ${
                  activeSection === s.key
                    ? ''
                    : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700/50'
                }`}
                style={
                  activeSection === s.key
                    ? { backgroundColor: s.color + '20', borderColor: s.color }
                    : undefined
                }
                accessibilityRole="button"
                accessibilityState={{ selected: activeSection === s.key }}
              >
                <Text
                  className={`text-sm font-medium ${
                    activeSection === s.key ? '' : 'text-stone-600 dark:text-stone-300'
                  }`}
                  style={activeSection === s.key ? { color: s.color } : undefined}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Animated.View
          entering={FadeInDown.duration(400).delay(0)}
          onLayout={(e) => { sectionRefs.current['principles'] = e.nativeEvent.layout.y; }}
        >
          <PrinciplesSection />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          onLayout={(e) => { sectionRefs.current['energy'] = e.nativeEvent.layout.y; }}
        >
          <EnergySystemsSection />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          onLayout={(e) => { sectionRefs.current['grips'] = e.nativeEvent.layout.y; }}
        >
          <GripsSection />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          onLayout={(e) => { sectionRefs.current['params'] = e.nativeEvent.layout.y; }}
        >
          <ParametersSection />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          onLayout={(e) => { sectionRefs.current['crimp'] = e.nativeEvent.layout.y; }}
        >
          <CrimpLearningSection />
        </Animated.View>

        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
