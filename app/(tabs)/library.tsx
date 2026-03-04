import { View, Text } from "react-native";

export default function LibraryScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold">Library</Text>
      <Text className="text-gray-500 mt-2">Training guides will appear here</Text>
    </View>
  );
}
