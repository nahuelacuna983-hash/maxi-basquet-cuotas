export const LOCAL_STORAGE_KEY = "maxi-basquet-mvp-state-v1";

export function createPersistedState(source) {
  return {
    version: 1,
    exportedAt: source.exportedAt,
    players: source.players,
    fees: source.fees,
    payments: source.payments,
    attendances: source.attendances,
    trainingVotes: source.trainingVotes,
    playerDocuments: source.playerDocuments,
    feeAdjustments: source.feeAdjustments,
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
    trainingVotes: Array.isArray(parsedState.trainingVotes)
      ? parsedState.trainingVotes
      : fallbackState.trainingVotes ?? [],
    playerDocuments: Array.isArray(parsedState.playerDocuments)
      ? parsedState.playerDocuments.map(normalizePlayerDocument)
      : fallbackState.playerDocuments ?? [],
    feeAdjustments: Array.isArray(parsedState.feeAdjustments)
      ? parsedState.feeAdjustments.map(normalizeFeeAdjustment)
      : fallbackState.feeAdjustments ?? [],
    responsibilityAdjustments: Array.isArray(parsedState.responsibilityAdjustments)
      ? parsedState.responsibilityAdjustments
      : fallbackState.responsibilityAdjustments,
    responsibilityConfig:
      parsedState.responsibilityConfig && typeof parsedState.responsibilityConfig === "object"
        ? normalizeResponsibilityConfig(
            parsedState.responsibilityConfig,
            fallbackState.responsibilityConfig,
          )
        : fallbackState.responsibilityConfig,
    attendanceConfig:
      parsedState.attendanceConfig && typeof parsedState.attendanceConfig === "object"
        ? normalizeAttendanceConfig(parsedState.attendanceConfig, fallbackState.attendanceConfig)
        : fallbackState.attendanceConfig,
    treasuryConfig:
      parsedState.treasuryConfig && typeof parsedState.treasuryConfig === "object"
        ? { ...fallbackState.treasuryConfig, ...parsedState.treasuryConfig }
        : fallbackState.treasuryConfig,
  };
}

function normalizeFeeAdjustment(adjustment) {
  return {
    id: String(adjustment.id ?? ""),
    playerId: String(adjustment.playerId ?? ""),
    feeId: String(adjustment.feeId ?? ""),
    adjustmentType: String(adjustment.adjustmentType ?? "monto_final"),
    finalAmount: Math.max(Number(adjustment.finalAmount) || 0, 0),
    reason: String(adjustment.reason ?? "otro"),
    observation: String(adjustment.observation ?? ""),
    active: adjustment.active === undefined ? true : Boolean(adjustment.active),
    createdAt: adjustment.createdAt,
    updatedAt: adjustment.updatedAt,
  };
}

function normalizePlayerDocument(document) {
  return {
    id: String(document.id ?? ""),
    playerId: document.playerId ? String(document.playerId) : "",
    playerName: String(document.playerName ?? ""),
    documentType: String(document.documentType ?? ""),
    title: String(document.title ?? ""),
    driveFileId: String(document.driveFileId ?? ""),
    driveUrl: String(document.driveUrl ?? ""),
    mimeType: String(document.mimeType ?? ""),
    status: String(document.status ?? "cargado"),
    observation: String(document.observation ?? ""),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function normalizeResponsibilityConfig(responsibilityConfig, fallbackResponsibilityConfig) {
  const mergedConfig = {
    ...fallbackResponsibilityConfig,
    ...responsibilityConfig,
  };

  if (mergedConfig.attendanceStartDate === "2026-04-06") {
    mergedConfig.attendanceStartDate = fallbackResponsibilityConfig.attendanceStartDate;
  }

  return mergedConfig;
}

function normalizeAttendanceConfig(attendanceConfig, fallbackAttendanceConfig) {
  const mergedConfig = {
    ...fallbackAttendanceConfig,
    ...attendanceConfig,
    openWeekdays: {
      ...fallbackAttendanceConfig.openWeekdays,
      ...(attendanceConfig.openWeekdays ?? {}),
    },
  };

  if (mergedConfig.publicNoResponseLabel === "No me interesa") {
    mergedConfig.publicNoResponseLabel = fallbackAttendanceConfig.publicNoResponseLabel;
  }

  return mergedConfig;
}

function normalizePlayer(player) {
  return {
    ...player,
    billingStartMonth: normalizeBillingStartMonth(player.billingStartMonth),
    birthDate: normalizeBirthDate(player.birthDate),
    accessCode: player.accessCode ?? "",
    hasAccessCode:
      player.hasAccessCode === null || player.hasAccessCode === undefined
        ? Boolean(player.accessCode?.trim())
        : Boolean(player.hasAccessCode),
    hasPrivateAccessCode: Boolean(player.hasPrivateAccessCode),
    hasBirthDateColumn: Boolean(player.hasBirthDateColumn),
  };
}

function normalizeBillingStartMonth(value) {
  const month = String(value ?? "").trim();
  return /^\d{4}-\d{2}$/.test(month) ? month : "";
}

function normalizeBirthDate(value) {
  const date = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
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
