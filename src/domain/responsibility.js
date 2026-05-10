export function parseLocalDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getTrainingWeekdays(config) {
  return config.trainingWeekdays ?? [2, 4];
}

export function isTrainingWeekday(dateValue, config = {}) {
  const weekday = parseLocalDate(dateValue).getDay();
  return getTrainingWeekdays(config).includes(weekday);
}

export function countTrainingDays(startDate, endDate, config = {}) {
  const current = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  let count = 0;

  while (current <= end) {
    const weekday = current.getDay();
    if (getTrainingWeekdays(config).includes(weekday)) count += 1;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function getBaseResponsibilityScore(config) {
  return (
    countTrainingDays(config.attendanceStartDate, config.attendanceEndDate, config) *
    config.pointsPerTraining
  );
}

export function getHistoricalDiscount(adjustment, config) {
  if (!adjustment) return 0;

  return (
    (Number(adjustment.accumulatedAbsences) || 0) * config.absencePenalty +
    (Number(adjustment.accumulatedLateNotices) || 0) * config.lateNoticePenalty +
    (Number(adjustment.accumulatedLastMinuteDrops) || 0) * config.lastMinuteDropPenalty
  );
}

export function getExplicitAttendanceDiscount(attendances, playerId, config) {
  return attendances
    .filter(
      (attendance) =>
        attendance.playerId === playerId &&
        (attendance.eventType ?? "entrenamiento") === "entrenamiento" &&
        attendance.date >= config.attendanceStartDate,
    )
    .reduce((sum, attendance) => sum + getStatusPenalty(attendance.status, config), 0);
}

export function getAttendanceDiscount(attendances, playerId, config, options = {}) {
  return (
    getExplicitAttendanceDiscount(attendances, playerId, config) +
    getImplicitAbsenceDiscount(attendances, playerId, config, options)
  );
}

export function getImplicitAbsenceDiscount(attendances, playerId, config, options = {}) {
  const players = options.players ?? [];
  const player = players.find((item) => item.id === playerId);

  if (players.length > 0 && player?.status !== "activo") return 0;

  const completedTrainingDates = [...new Set(options.completedTrainingDates ?? [])].filter(
    (date) => date >= config.attendanceStartDate,
  );
  if (completedTrainingDates.length === 0) return 0;

  const playerAttendanceDates = new Set(
    attendances
      .filter(
        (attendance) =>
          attendance.playerId === playerId &&
          (attendance.eventType ?? "entrenamiento") === "entrenamiento" &&
          attendance.date >= config.attendanceStartDate,
      )
      .map((attendance) => attendance.date),
  );

  return completedTrainingDates.filter((date) => !playerAttendanceDates.has(date)).length *
    config.absencePenalty;
}

export function getStatusPenalty(status, config) {
  const penalties = {
    falto: config.absencePenalty,
    no_voy: config.absencePenalty,
    aviso_tarde: config.lateNoticePenalty,
    baja_sobre_la_hora: config.lastMinuteDropPenalty,
    baja_sobre_hora: config.lastMinuteDropPenalty,
  };

  return penalties[status] ?? 0;
}

export function calculateResponsibilityScore({
  playerId,
  attendances,
  adjustments,
  config,
  players = [],
  completedTrainingDates = [],
}) {
  const adjustment = adjustments.find((item) => item.playerId === playerId);
  const baseScore = getBaseResponsibilityScore(config);
  const historicalDiscount = getHistoricalDiscount(adjustment, config);
  const explicitAttendanceDiscount = getExplicitAttendanceDiscount(attendances, playerId, config);
  const implicitAbsenceDiscount = getImplicitAbsenceDiscount(attendances, playerId, config, {
    players,
    completedTrainingDates,
  });
  const attendanceDiscount = explicitAttendanceDiscount + implicitAbsenceDiscount;

  return {
    baseScore,
    historicalDiscount,
    explicitAttendanceDiscount,
    implicitAbsenceDiscount,
    attendanceDiscount,
    score: Math.max(baseScore - historicalDiscount - attendanceDiscount, 0),
  };
}
