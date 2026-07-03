import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useGetNodeEarnings } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SCREEN_WIDTH = Dimensions.get("window").width;

type Period = "7d" | "30d";

interface AggCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

function AggregateCard({ label, value, sub, icon, accent, colors }: AggCard & { colors: ReturnType<typeof useColors> }) {
  return (
    <View
      style={[
        styles.aggCard,
        {
          backgroundColor: accent ? colors.primary : colors.card,
          borderColor: accent ? colors.primary : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.aggIconWrap,
          { backgroundColor: accent ? "rgba(255,255,255,0.18)" : colors.muted },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[
          styles.aggValue,
          { color: accent ? "#fff" : colors.foreground, fontFamily: "Inter_700Bold" },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.aggSub, { color: accent ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
          {sub}
        </Text>
      ) : null}
      <Text style={[styles.aggLabel, { color: accent ? "rgba(255,255,255,0.85)" : colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [period, setPeriod] = useState<Period>("7d");

  const days = period === "7d" ? 7 : 30;

  const { data, isLoading, isError, refetch, isRefetching } = useGetNodeEarnings(
    { days },
    { query: { refetchInterval: 60000 } }
  );

  const earningsDays = data?.days ?? [];

  const totalVrf = data?.totalVrf ?? 0;

  const todayVal = earningsDays[earningsDays.length - 1]?.vrfEarned ?? 0;
  const yesterdayVal = earningsDays[earningsDays.length - 2]?.vrfEarned ?? 0;
  const weeklyVal = useMemo(
    () => earningsDays.slice(-7).reduce((s, d) => s + d.vrfEarned, 0),
    [earningsDays]
  );
  const monthlyVal = useMemo(
    () => earningsDays.slice(-30).reduce((s, d) => s + d.vrfEarned, 0),
    [earningsDays]
  );
  const avgDaily = days > 0 && earningsDays.length > 0 ? totalVrf / earningsDays.length : 0;

  const pctChange = yesterdayVal > 0
    ? (((todayVal - yesterdayVal) / yesterdayVal) * 100).toFixed(1)
    : "0.0";
  const pctUp = parseFloat(pctChange) >= 0;

  const chartWidth = Math.max(SCREEN_WIDTH - 32, 300);
  const chartScrollWidth = days === 30
    ? Math.max(chartWidth, earningsDays.length * 28)
    : chartWidth;

  const [selectedBar, setSelectedBar] = useState<{ index: number } | null>(null);

  const chartLabels = earningsDays.map((d) => d.label);
  const chartValues = earningsDays.length > 0 ? earningsDays.map((d) => d.vrfEarned) : [0];

  const maxVrf = Math.max(...chartValues, 0.1);

  const STUB_RATIO = 0.028;
  const chartValuesForRender = chartValues.map((v) => (v === 0 ? maxVrf * STUB_RATIO : v));

  const barColors = chartValues.map((v) =>
    v === 0
      ? (opacity = 1) => `rgba(${hexToRgb(colors.mutedForeground)}, ${opacity * 0.4})`
      : (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`
  );

  const handleBarPress = useCallback(
    ({ index }: { index: number }) => {
      Haptics.selectionAsync();
      setSelectedBar((prev) => (prev?.index === index ? null : { index }));
    },
    []
  );

  const selectedDayLabel =
    selectedBar !== null ? earningsDays[selectedBar.index]?.label ?? "" : "";
  const selectedDayValue =
    selectedBar !== null ? earningsDays[selectedBar.index]?.vrfEarned ?? 0 : 0;

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
    labelColor: () => colors.mutedForeground,
    style: { borderRadius: 14 },
    barPercentage: days === 7 ? 0.65 : 0.75,
    fillShadowGradient: colors.primary,
    fillShadowGradientOpacity: 1,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Earnings
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            VRF income over time
          </Text>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: colors.primary + "18" }]}>
          <MaterialCommunityIcons name="cash-multiple" size={14} color={colors.primary} />
          <Text style={[styles.totalBadgeText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            {totalVrf.toFixed(2)} VRF
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
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
      >
        <View style={styles.periodRow}>
          {(["7d", "30d"] as Period[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => {
                setPeriod(p);
                Haptics.selectionAsync();
              }}
              style={[
                styles.periodBtn,
                {
                  backgroundColor: period === p ? colors.primary : colors.card,
                  borderColor: period === p ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodLabel,
                  {
                    color: period === p ? "#fff" : colors.mutedForeground,
                    fontFamily: period === p ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {p === "7d" ? "7 Days" : "30 Days"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          DAILY VRF EARNINGS
        </Text>

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isLoading && earningsDays.length === 0 ? (
            <View style={styles.chartPlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.chartLoadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Loading earnings…
              </Text>
            </View>
          ) : isError && earningsDays.length === 0 ? (
            <View style={styles.chartPlaceholder}>
              <Feather name="wifi-off" size={24} color={colors.mutedForeground} />
              <Text style={[styles.chartLoadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Could not load data
              </Text>
              <Pressable
                onPress={() => refetch()}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={days === 30}
            >
              <View>
                <BarChart
                  data={{
                    labels: chartLabels,
                    datasets: [{ data: chartValuesForRender, colors: barColors }],
                  }}
                  width={chartScrollWidth}
                  height={200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  showValuesOnTopOfBars={false}
                  withInnerLines={false}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                  flatColor
                  withCustomBarColorFromData
                  onDataPointClick={handleBarPress}
                />
                {selectedBar !== null && (
                  <View
                    style={[
                      styles.tooltip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.tooltipLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {selectedDayLabel}
                    </Text>
                    <Text style={[styles.tooltipValue, { color: selectedDayValue === 0 ? colors.mutedForeground : colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {selectedDayValue === 0
                        ? "No earnings, node was idle"
                        : `${selectedDayValue.toFixed(2)} VRF`}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
          AGGREGATED TOTALS
        </Text>

        <View style={styles.row}>
          <AggregateCard
            label="Today"
            value={`${todayVal.toFixed(2)} VRF`}
            sub={`${pctUp ? "+" : ""}${pctChange}% vs yesterday`}
            accent
            icon={<MaterialCommunityIcons name="lightning-bolt" size={18} color="#fff" />}
            colors={colors}
          />
          <AggregateCard
            label="This Week"
            value={`${weeklyVal.toFixed(2)} VRF`}
            icon={<Feather name="calendar" size={18} color={colors.primary} />}
            colors={colors}
          />
        </View>

        <View style={styles.row}>
          <AggregateCard
            label="This Month"
            value={`${monthlyVal.toFixed(2)} VRF`}
            icon={<MaterialCommunityIcons name="calendar-month" size={18} color={colors.primary} />}
            colors={colors}
          />
          <AggregateCard
            label="Daily Average"
            value={`${avgDaily.toFixed(2)} VRF`}
            icon={<Feather name="trending-up" size={18} color={colors.success} />}
            colors={colors}
          />
        </View>

        {earningsDays.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
              BREAKDOWN
            </Text>

            <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {earningsDays.slice(-7).reverse().map((item, idx, arr) => {
                const isIdle = item.vrfEarned === 0;
                const barFlex = Math.max(item.vrfEarned / maxVrf, 0.04);
                return (
                  <View key={item.date}>
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {item.label}
                      </Text>
                      <View style={styles.breakdownBar}>
                        <View
                          style={[
                            styles.breakdownFill,
                            { backgroundColor: isIdle ? colors.mutedForeground : colors.primary, opacity: isIdle ? 0.35 : 1, flex: barFlex },
                          ]}
                        />
                        <View style={{ flex: 1 - barFlex }} />
                      </View>
                      <Text style={[styles.breakdownValue, { color: isIdle ? colors.mutedForeground : colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        {isIdle ? "0.00" : item.vrfEarned.toFixed(2)}
                      </Text>
                    </View>
                    {idx < arr.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
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
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  totalBadgeText: { fontSize: 13 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  periodLabel: { fontSize: 13 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.2, marginBottom: 4 },
  chartCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingVertical: 8,
  },
  chartPlaceholder: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  chartLoadingText: { fontSize: 13 },
  chart: { borderRadius: 14 },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  retryText: { color: "#fff", fontSize: 13 },
  row: { flexDirection: "row", gap: 10 },
  aggCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  aggIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  aggValue: { fontSize: 20 },
  aggSub: { fontSize: 11 },
  aggLabel: { fontSize: 12, marginTop: 2 },
  breakdownCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 10,
  },
  breakdownLabel: { width: 38, fontSize: 13 },
  breakdownBar: { flex: 1, flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" },
  breakdownFill: { borderRadius: 3 },
  breakdownValue: { width: 46, fontSize: 13, textAlign: "right" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  tooltip: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tooltipLabel: { fontSize: 12 },
  tooltipValue: { fontSize: 13, flexShrink: 1, textAlign: "right" },
});
