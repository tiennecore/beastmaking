import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold">Beastmaking Timer</Text>
      <Text className="text-gray-500 mt-2">Protocols will appear here</Text>
    </View>
  );
}
