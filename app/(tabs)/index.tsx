import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useGetNodeStatus } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAppStateRefresh } from "@/hooks/useAppStateRefresh";
import { useNodeIdentity } from "@/hooks/useNodeIdentity";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  const colors = useColors();
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, { flex: 1 }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.statCard,
          {
            backgroundColor: accent ? colors.primary : colors.card,
            borderColor: accent ? colors.primary : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.statIconWrap,
            { backgroundColor: accent ? "rgba(255,255,255,0.15)" : colors.muted },
          ]}
        >
          {icon}
        </View>
        <Text
          style={[
            styles.statValue,
            { color: accent ? "#fff" : colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {sub && (
          <Text
            style={[
              styles.statSub,
              { color: accent ? "rgba(255,255,255,0.75)" : colors.mutedForeground },
            ]}
          >
            {sub}
          </Text>
        )}
        <Text
          style={[
            styles.statLabel,
            { color: accent ? "rgba(255,255,255,0.9)" : colors.mutedForeground },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const identity = useNodeIdentity();

  const { data: node, isLoading, isError, refetch, isRefetching } = useGetNodeStatus({
    query: { refetchInterval: 30000 },
  });

  const stableRefetch = useCallback(() => { refetch(); }, [refetch]);
  useAppStateRefresh(stableRefetch);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  };

  const displayNodeId = identity.nodeId !== "vf-node-new"
    ? identity.nodeId
    : (node?.nodeId ?? "...");

  const displayRegion = node?.region ?? "...";

  const statusColor =
    node?.status === "online"
      ? colors.success
      : node?.status === "syncing"
        ? colors.warning
        : colors.destructive;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Node Monitor
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {isLoading && !node ? "Loading…" : `${displayNodeId} · ${displayRegion}`}
          </Text>
        </View>
        {node && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
              {node.status.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {isLoading && !node ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Fetching node data…
          </Text>
        </View>
      ) : isError && !node ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Connection lost
          </Text>
          <Text style={[styles.errorSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Check your internet connection and try again
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              refetch();
            }}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="refresh-cw" size={14} color="#fff" />
            <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {identity.walletAddress ? (
            <View style={[styles.identityBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <MaterialCommunityIcons name="wallet-outline" size={14} color={colors.primary} />
              <Text style={[styles.identityText, { color: colors.primary, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                {identity.walletAddress.length > 20
                  ? identity.walletAddress.slice(0, 8) + "…" + identity.walletAddress.slice(-6)
                  : identity.walletAddress}
              </Text>
              <View style={[styles.identityDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.identityNodeType, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {identity.nodeType}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            OVERVIEW
          </Text>

          <View style={styles.row}>
            <StatCard
              label="Uptime"
              value={`${node?.uptimePercent ?? "0"}%`}
              sub="Last 30 days"
              accent
              icon={<Ionicons name="pulse" size={18} color="#fff" />}
            />
            <StatCard
              label="Earnings Today"
              value={`${node?.earningsToday ?? "0"} VRF`}
              sub="+12.4% vs yesterday"
              icon={
                <MaterialCommunityIcons name="cash-multiple" size={18} color={colors.primary} />
              }
            />
          </View>

          <View style={styles.row}>
            <StatCard
              label="Reputation"
              value={`${node?.reputationScore ?? "0"}/100`}
              icon={<Ionicons name="star" size={18} color={colors.warning} />}
            />
            <StatCard
              label="Tasks Done"
              value={(node?.tasksCompleted ?? 0).toLocaleString()}
              icon={<Feather name="check-circle" size={18} color={colors.success} />}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
            SYSTEM
          </Text>

          <View
            style={[styles.systemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <SystemRow
              icon={<Feather name="cpu" size={16} color={colors.primary} />}
              label="CPU Load"
              value={node?.cpuLoad ?? "0%"}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SystemRow
              icon={<MaterialCommunityIcons name="memory" size={16} color={colors.primary} />}
              label="Memory Used"
              value={node?.memUsed ?? "0 GB"}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SystemRow
              icon={<Feather name="clock" size={16} color={colors.primary} />}
              label="Last Seen"
              value={node?.lastSeen ?? "N/A"}
              colors={colors}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
            QUICK ACTIONS
          </Text>

          <View style={styles.row}>
            <ActionButton
              icon={<Feather name="refresh-cw" size={18} color={colors.primary} />}
              label="Restart Node"
              colors={colors}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            />
            <ActionButton
              icon={<Feather name="download" size={18} color={colors.primary} />}
              label="Export Logs"
              colors={colors}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
            <ActionButton
              icon={<Feather name="bell" size={18} color={colors.primary} />}
              label="Alerts"
              colors={colors}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function SystemRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.systemRow}>
      <View style={styles.systemRowLeft}>
        {icon}
        <Text style={[styles.systemLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.systemValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
        style={[
          styles.actionBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {icon}
        <Text
          style={[styles.actionLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
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
  headerSub: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, letterSpacing: 0.5 },
  identityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  identityText: { fontSize: 12, flex: 1 },
  identityDot: { width: 6, height: 6, borderRadius: 3 },
  identityNodeType: { fontSize: 11 },
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 10 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10 },
  statCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: { fontSize: 24 },
  statSub: { fontSize: 11 },
  statLabel: { fontSize: 12, marginTop: 2 },
  systemCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  systemRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  systemLabel: { fontSize: 14 },
  systemValue: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  actionBtn: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
  },
  actionLabel: { fontSize: 11, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 17 },
  errorSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14 },
});
