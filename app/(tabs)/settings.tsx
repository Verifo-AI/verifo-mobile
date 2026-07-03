import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  requestNotificationPermission,
  syncPushPrefs,
  type NotificationPrefs,
} from "@/hooks/useNotifications";

const STORAGE_KEY = "verifo_settings";

interface Settings {
  walletAddress: string;
  nodeType: string;
  notificationsEnabled: boolean;
  alertOnFailure: boolean;
  alertOnEarnings: boolean;
  earningsThreshold: number;
}

const DEFAULT_SETTINGS: Settings = {
  walletAddress: "",
  nodeType: "Standard",
  notificationsEnabled: true,
  alertOnFailure: true,
  alertOnEarnings: false,
  earningsThreshold: 5,
};

const NODE_TYPES = ["Standard", "High-Memory", "GPU", "Storage"];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [thresholdText, setThresholdText] = useState(
    String(DEFAULT_SETTINGS.earningsThreshold)
  );
  const saveOpacity = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: Settings = JSON.parse(raw);
          setSettings(parsed);
          setThresholdText(String(parsed.earningsThreshold ?? DEFAULT_SETTINGS.earningsThreshold));
        } catch {}
      }
    });
  }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const showSavedFeedback = () => {
    setSaved(true);
    Animated.sequence([
      Animated.timing(saveOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(saveOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSaved(false));
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showSavedFeedback();
    Keyboard.dismiss();
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "This will clear all saved settings. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setSettings(DEFAULT_SETTINGS);
            setThresholdText(String(DEFAULT_SETTINGS.earningsThreshold));
            AsyncStorage.removeItem(STORAGE_KEY);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            syncPushPrefs({ ...DEFAULT_SETTINGS } as NotificationPrefs);
          },
        },
      ]
    );
  };

  const handleMasterNotificationToggle = async (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications for Verifo in your device settings to receive alerts.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    const next: Settings = { ...settings, notificationsEnabled: enabled };
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    syncPushPrefs(next as NotificationPrefs);
  };

  const handleSubToggle = (key: "alertOnFailure" | "alertOnEarnings", value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      syncPushPrefs(next as NotificationPrefs);
      return next;
    });
  };

  const handleThresholdChange = (text: string) => {
    setThresholdText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      setSettings((prev) => {
        const next = { ...prev, earningsThreshold: parsed };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (next.notificationsEnabled && next.alertOnEarnings) {
          syncPushPrefs(next as NotificationPrefs);
        }
        return next;
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Settings
        </Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[styles.savedToast, { opacity: saveOpacity, backgroundColor: colors.success }]}
        pointerEvents="none"
      >
        <Ionicons name="checkmark-circle" size={16} color="#fff" />
        <Text style={[styles.savedText, { fontFamily: "Inter_600SemiBold" }]}>Saved</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "web" ? 100 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel label="NODE IDENTITY" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldRowLeft}>
              <MaterialCommunityIcons name="wallet-outline" size={18} color={colors.primary} />
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                Wallet Address
              </Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
                borderColor: colors.border,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="0x..."
            placeholderTextColor={colors.mutedForeground}
            value={settings.walletAddress}
            onChangeText={(v) => updateSetting("walletAddress", v)}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldRowLeft}>
              <Feather name="server" size={18} color={colors.primary} />
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                Node Type
              </Text>
            </View>
          </View>
          <View style={styles.nodeTypeRow}>
            {NODE_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  updateSetting("nodeType", t);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.nodeTypeBtn,
                  {
                    backgroundColor:
                      settings.nodeType === t ? colors.primary : colors.muted,
                    borderColor:
                      settings.nodeType === t ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nodeTypeText,
                    {
                      color: settings.nodeType === t ? "#fff" : colors.mutedForeground,
                      fontFamily: settings.nodeType === t ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <SectionLabel label="NOTIFICATIONS" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ToggleRow
            icon={<Feather name="bell" size={18} color={colors.primary} />}
            label="Push Notifications"
            sub="Receive real-time alerts"
            value={settings.notificationsEnabled}
            onChange={handleMasterNotificationToggle}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ToggleRow
            icon={<Ionicons name="warning-outline" size={18} color={colors.primary} />}
            label="Alert on Task Failure"
            sub="Notified when tasks fail"
            value={settings.alertOnFailure}
            onChange={(v) => handleSubToggle("alertOnFailure", v)}
            colors={colors}
            disabled={!settings.notificationsEnabled}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ToggleRow
            icon={<MaterialCommunityIcons name="cash-multiple" size={18} color={colors.primary} />}
            label="Earnings Alerts"
            sub="Notify on VRF milestone"
            value={settings.alertOnEarnings}
            onChange={(v) => handleSubToggle("alertOnEarnings", v)}
            colors={colors}
            disabled={!settings.notificationsEnabled}
          />
          {settings.alertOnEarnings && settings.notificationsEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.thresholdRow}>
                <View style={styles.thresholdLeft}>
                  <MaterialCommunityIcons name="currency-usd" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.thresholdLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    Alert at (VRF)
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.thresholdInput,
                    {
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                      borderColor: colors.border,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                  value={thresholdText}
                  onChangeText={handleThresholdChange}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
            </>
          )}
        </View>

        <SectionLabel label="ABOUT" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow label="App Version" value="1.0.0" colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Node Protocol" value="Verifo v2.4" colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Network" value="Mainnet" colors={colors} />
        </View>

        <Pressable
          onPress={handleReset}
          style={[styles.resetBtn, { borderColor: colors.destructive + "44" }]}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
          <Text style={[styles.resetText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
            Reset All Settings
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
      {label}
    </Text>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onChange,
  colors,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ReturnType<typeof useColors>;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, { opacity: disabled ? 0.45 : 1 }]}>
      <View style={styles.toggleLeft}>
        {icon}
        <View>
          <Text style={[styles.toggleLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            {label}
          </Text>
          <Text style={[styles.toggleSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {sub}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onChange}
        trackColor={{ false: colors.muted, true: colors.primary + "99" }}
        thumbColor={value ? colors.primary : colors.mutedForeground}
        disabled={disabled}
      />
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22 },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 14 },
  savedToast: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    zIndex: 99,
  },
  savedText: { color: "#fff", fontSize: 13 },
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 10 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.1, marginBottom: 6 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 4,
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  fieldRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldLabel: { fontSize: 14 },
  input: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  nodeTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  nodeTypeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  nodeTypeText: { fontSize: 13 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleLabel: { fontSize: 14 },
  toggleSub: { fontSize: 12, marginTop: 1 },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thresholdLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  thresholdLabel: { fontSize: 13 },
  thresholdInput: {
    width: 70,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14 },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 8,
  },
  resetText: { fontSize: 14 },
});
