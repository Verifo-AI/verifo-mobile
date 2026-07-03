import { Feather, Ionicons } from "@expo/vector-icons";
import { useGetNodeTasks } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type TaskStatus = "completed" | "failed" | "running";

interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  reward: string;
  duration: string;
  timestamp: string;
}

function statusIcon(status: TaskStatus, colors: ReturnType<typeof useColors>) {
  if (status === "completed")
    return <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
  if (status === "failed")
    return <Ionicons name="close-circle" size={20} color={colors.destructive} />;
  return <Ionicons name="time" size={20} color={colors.warning} />;
}

function TaskRow({ item, colors }: { item: Task; colors: ReturnType<typeof useColors> }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
        onPress={() => Haptics.selectionAsync()}
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.rowLeft}>
          {statusIcon(item.status, colors)}
          <View style={styles.rowInfo}>
            <Text style={[styles.rowType, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {item.type}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {item.timestamp} · {item.duration}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.rowReward,
            {
              color:
                item.status === "completed"
                  ? colors.primary
                  : item.status === "running"
                    ? colors.warning
                    : colors.mutedForeground,
              fontFamily: "Inter_600SemiBold",
            },
          ]}
        >
          {item.reward}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

type Filter = "all" | "completed" | "failed" | "running";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, isError, refetch, isRefetching } = useGetNodeTasks(
    { status: filter, limit: 50 },
    { query: { refetchInterval: 30000 } }
  );

  const tasks = (data?.tasks ?? []) as Task[];
  const total = data?.total ?? 0;

  const totalEarned = tasks
    .filter((t) => t.status === "completed")
    .reduce((acc, t) => {
      const n = parseFloat(t.reward);
      return acc + (isNaN(n) ? 0 : n);
    }, 0)
    .toFixed(2);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Done" },
    { key: "failed", label: "Failed" },
    { key: "running", label: "Running" },
  ];

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
            Task History
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {total} tasks · {totalEarned} VRF earned
          </Text>
        </View>
        <View style={[styles.earnBadge, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="trending-up" size={14} color={colors.primary} />
          <Text style={[styles.earnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            {totalEarned} VRF
          </Text>
        </View>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => {
              setFilter(f.key);
              Haptics.selectionAsync();
            }}
            style={[
              styles.filterBtn,
              filter === f.key && {
                backgroundColor: colors.primary,
                borderRadius: 20,
              },
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                {
                  color: filter === f.key ? "#fff" : colors.mutedForeground,
                  fontFamily: filter === f.key ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && tasks.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Loading tasks…
          </Text>
        </View>
      ) : isError && tasks.length === 0 ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Could not load tasks
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskRow item={item} colors={colors} />}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!tasks.length}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                refetch();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No tasks found
              </Text>
            </View>
          )}
        />
      )}
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
  headerSub: { fontSize: 12, marginTop: 2 },
  earnBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  earnText: { fontSize: 13 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterLabel: { fontSize: 13 },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rowInfo: { flex: 1 },
  rowType: { fontSize: 14 },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowReward: { fontSize: 13, marginLeft: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  errorText: { fontSize: 15 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: "#fff", fontSize: 14 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
