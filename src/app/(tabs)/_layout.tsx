import { NativeTabs } from "expo-router/unstable-native-tabs";

// SDK 57 path. In SDK 58+ this becomes 'expo-router/native-tabs'.
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Connect</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="memories">
        <NativeTabs.Trigger.Label>Memories</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="photo.stack.fill" md="photo_library" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
