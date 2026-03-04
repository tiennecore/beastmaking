import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Protocols",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
        }}
      />
    </Tabs>
  );
}
