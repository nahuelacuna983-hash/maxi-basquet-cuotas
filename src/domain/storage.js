export const LOCAL_STORAGE_KEY = "maxi-basquet-mvp-state-v1";

export function createPersistedState(source) {
  return {
    version: 1,
    exportedAt: source.exportedAt,
    players: source.players,
    fees: source.fees,
    payments: source.payments,
    attendances: source.attendances,
    responsibilityAdjustments: source.responsibilityAdjustments,
    responsibilityConfig: source.responsibilityConfig,
    attendanceConfig: source.attendanceConfig,
    treasuryConfig: source.treasuryConfig,
  };
}

export function loadPersistedState(fallbackState) {
  const rawState = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!rawState) return fallbackState;

  try {
    const parsedState = JSON.parse(rawState);
    return normalizePersistedState(parsedState, fallbackState);
  } catch {
    return fallbackState;
  }
}

export function savePersistedState(state) {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({ ...createPersistedState(state), exportedAt: new Date().toISOString() }),
  );
}

export function clearPersistedState() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export function normalizePersistedState(parsedState, fallbackState) {
  if (!parsedState || typeof parsedState !== "object") {
    throw new Error("Backup invalido");
  }

  return {
    version: Number(parsedState.version) || 1,
    exportedAt: parsedState.exportedAt,
    players: Array.isArray(parsedState.players)
      ? parsedState.players.map(normalizePlayer)
      : fallbackState.players,
    fees: Array.isArray(parsedState.fees)
      ? dedupeFeesByMonth(parsedState.fees)
      : fallbackState.fees,
    payments: Array.isArray(parsedState.payments) ? parsedState.payments : fallbackState.payments,
    attendances: Array.isArray(parsedState.attendances)
      ? parsedState.attendances
      : fallbackState.attendances,
    responsibilityAdjustments: Array.isArray(parsedState.responsibilityAdjustments)
      ? parsedState.responsibilityAdjustments
      : fallbackState.responsibilityAdjustments,
    responsibilityConfig:
      parsedState.responsibilityConfig && typeof parsedState.responsibilityConfig === "object"
        ? { ...fallbackState.responsibilityConfig, ...parsedState.responsibilityConfig }
        : fallbackState.responsibilityConfig,
    attendanceConfig:
      parsedState.attendanceConfig && typeof parsedState.attendanceConfig === "object"
        ? {
            ...fallbackState.attendanceConfig,
            ...parsedState.attendanceConfig,
            openWeekdays: {
              ...fallbackState.attendanceConfig.openWeekdays,
              ...(parsedState.attendanceConfig.openWeekdays ?? {}),
            },
          }
        : fallbackState.attendanceConfig,
    treasuryConfig:
      parsedState.treasuryConfig && typeof parsedState.treasuryConfig === "object"
        ? { ...fallbackState.treasuryConfig, ...parsedState.treasuryConfig }
        : fallbackState.treasuryConfig,
  };
}

function normalizePlayer(player) {
  return {
    ...player,
    accessCode: player.accessCode ?? "",
    hasAccessCode:
      player.hasAccessCode === null || player.hasAccessCode === undefined
        ? Boolean(player.accessCode?.trim())
        : Boolean(player.hasAccessCode),
    hasPrivateAccessCode: Boolean(player.hasPrivateAccessCode),
  };
}

function dedupeFeesByMonth(fees) {
  const byMonth = new Map();

  fees.forEach((fee) => {
    if (!fee?.month) return;

    const existingFee = byMonth.get(fee.month);
    if (!existingFee) {
      byMonth.set(fee.month, { ...fee });
      return;
    }

    byMonth.set(fee.month, {
      ...existingFee,
      trainingSessionCost: fee.trainingSessionCost ?? existingFee.trainingSessionCost,
      sundayCost: fee.sundayCost ?? existingFee.sundayCost,
      trainingBillingBase: fee.trainingBillingBase ?? existingFee.trainingBillingBase,
      sundayBillingBase: fee.sundayBillingBase ?? existingFee.sundayBillingBase,
      fixedTrainingOnlyAmount: fee.fixedTrainingOnlyAmount ?? existingFee.fixedTrainingOnlyAmount,
      fixedCompetitorAmount: fee.fixedCompetitorAmount ?? existingFee.fixedCompetitorAmount,
      interestPercent: fee.interestPercent ?? existingFee.interestPercent,
      dueDay: fee.dueDay ?? existingFee.dueDay,
    });
  });

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}
