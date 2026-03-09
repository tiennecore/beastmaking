import { ScrollView, View } from 'react-native';
import { PrinciplesSection } from '@/components/library/PrinciplesSection';
import { EnergySystemsSection } from '@/components/library/EnergySystemsSection';
import { GripsSection } from '@/components/library/GripsSection';
import { ParametersSection } from '@/components/library/ParametersSection';
import { CrimpLearningSection } from '@/components/library/CrimpLearningSection';

export default function LibraryScreen() {
  return (
    <ScrollView className="flex-1 bg-white dark:bg-stone-950 px-5 pt-4">
      <PrinciplesSection />
      <EnergySystemsSection />
      <GripsSection />
      <ParametersSection />
      <CrimpLearningSection />
      <View className="h-8" />
    </ScrollView>
  );
}
