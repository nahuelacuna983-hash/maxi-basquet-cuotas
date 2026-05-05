export function formatMoney(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(safeValue);
}

export function getPlayerName(player) {
  return `${player.firstName} ${player.lastName}`.trim();
}

export function isBillablePlayer(player) {
  return (
    player.status === "activo" &&
    ["competidor", "solo_entrenamientos"].includes(player.type)
  );
}

export function getPaymentsForPlayerFee(payments, playerId, feeId) {
  return payments.filter(
    (payment) => payment.playerId === playerId && payment.feeId === feeId,
  );
}

export function isApprovedPayment(payment) {
  return !payment.status || payment.status === "aprobado";
}

export function getApprovedPayments(payments) {
  return payments.filter(isApprovedPayment);
}

export function getPendingPayments(payments) {
  return payments.filter((payment) => payment.status === "pendiente");
}

export function getPaidAmount(payments, playerId, feeId) {
  return getPaymentsForPlayerFee(payments, playerId, feeId).reduce(
    (sum, payment) => sum + (isApprovedPayment(payment) ? Number(payment.amount) || 0 : 0),
    0,
  );
}

export function countWeekdaysInMonth(month, weekday) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  let count = 0;

  while (date.getMonth() === monthNumber - 1) {
    if (date.getDay() === weekday) count += 1;
    date.setDate(date.getDate() + 1);
  }

  return count;
}

export function getFeeDueDate(fee) {
  const dueDay = fee.dueDay ?? 10;
  return `${fee.month}-${String(dueDay).padStart(2, "0")}`;
}

export function getFeeDueDateObject(fee) {
  const [year, monthNumber] = fee.month.split("-").map(Number);
  return new Date(year, monthNumber - 1, fee.dueDay ?? 10);
}

export function getFeeBreakdown(fee, players) {
  const billablePlayers = players.filter(isBillablePlayer);
  const tuesdays = countWeekdaysInMonth(fee.month, 2);
  const thursdays = countWeekdaysInMonth(fee.month, 4);
  const sundays = countWeekdaysInMonth(fee.month, 0);
  const trainingSessions = tuesdays + thursdays;
  const competitors = billablePlayers.filter((player) => player.type === "competidor").length;
  const totalPlayers = billablePlayers.length;
  const trainingBillingBase = Number(fee.trainingBillingBase) || totalPlayers;
  const sundayBillingBase = Number(fee.sundayBillingBase) || competitors;
  const trainingSessionCost = Number(fee.trainingSessionCost ?? 55000);
  const sundayCost = Number(fee.sundayCost ?? 90000);
  const trainingTotal = trainingSessions * trainingSessionCost;
  const sundayTotal = sundays * sundayCost;
  const expectedPerTrainingOnly = trainingBillingBase > 0 ? trainingTotal / trainingBillingBase : 0;
  const expectedSundayShare = sundayBillingBase > 0 ? sundayTotal / sundayBillingBase : 0;
  const expectedPerCompetitor = expectedPerTrainingOnly + expectedSundayShare;

  return {
    tuesdays,
    thursdays,
    sundays,
    trainingSessions,
    competitors,
    totalPlayers,
    trainingBillingBase,
    sundayBillingBase,
    trainingSessionCost,
    sundayCost,
    trainingTotal,
    sundayTotal,
    expectedPerTrainingOnly,
    expectedSundayShare,
    expectedPerCompetitor,
    trainingShare: expectedPerTrainingOnly,
    sundayShare: expectedSundayShare,
  };
}

export function getExpectedFeeForPlayer(player, fee, players) {
  if (!isBillablePlayer(player)) return 0;

  const breakdown = getFeeBreakdown(fee, players);
  const expected =
    player.type === "competidor"
      ? breakdown.expectedPerCompetitor
      : breakdown.expectedPerTrainingOnly;
  return roundUpToBillingStep(Number.isFinite(expected) ? expected : 0);
}

export function roundUpToBillingStep(value, step = 5000) {
  if (value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

export function isFeeOverdue(fee, today = new Date()) {
  const [year, monthNumber] = fee.month.split("-").map(Number);
  const overdueDate = new Date(year, monthNumber - 1, (fee.dueDay ?? 10) + 1);
  overdueDate.setHours(0, 0, 0, 0);
  return today >= overdueDate;
}

export function getInterestAmount(balance, fee) {
  const interestPercent = Number(fee.interestPercent ?? 0);
  return Math.round(balance * (interestPercent / 100));
}

export function calculatePlayerDebt(player, fees, payments, players = [], today = new Date()) {
  let interestTotal = 0;
  const totalDue = fees.reduce(
    (sum, fee) => sum + getExpectedFeeForPlayer(player, fee, players),
    0,
  );
  const totalPaid = payments
    .filter((payment) => payment.playerId === player.id && isApprovedPayment(payment))
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

  const overdueFees = fees.filter((fee) => {
    const paidAmount = getPaidAmount(payments, player.id, fee.id);
    const expected = getExpectedFeeForPlayer(player, fee, players);
    const balance = Math.max(expected - paidAmount, 0);
    if (isFeeOverdue(fee, today) && balance > 0) {
      interestTotal += getInterestAmount(balance, fee);
      return true;
    }
    return false;
  });

  return {
    player,
    totalDue,
    totalPaid,
    interestTotal,
    balance: Math.max(totalDue + interestTotal - totalPaid, 0),
    overdueFees,
  };
}

export function calculateDebts(players, fees, payments, today = new Date()) {
  return players.map((player) => {
    let totalDue = 0;
    let totalPaid = 0;
    let interestTotal = 0;
    const overdueFees = [];
    const playerPayments = payments.filter(
      (payment) => payment.playerId === player.id && isApprovedPayment(payment),
    );
    const lastPayment = playerPayments
      .slice()
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))[0];
    const nextFee = fees
      .filter((fee) => getFeeDueDateObject(fee) >= today)
      .slice()
      .sort((a, b) => getFeeDueDateObject(a) - getFeeDueDateObject(b))[0];
    const currentFee =
      fees
        .slice()
        .sort((a, b) => b.month.localeCompare(a.month))
        .find((fee) => getExpectedFeeForPlayer(player, fee, players) > 0) ?? fees[0];

    fees.forEach((fee) => {
      const expected = getExpectedFeeForPlayer(player, fee, players);
      const paidAmount = getPaidAmount(payments, player.id, fee.id);
      const balanceBeforeInterest = Math.max(expected - paidAmount, 0);
      const overdue = isFeeOverdue(fee, today) && balanceBeforeInterest > 0;
      const interest = overdue ? getInterestAmount(balanceBeforeInterest, fee) : 0;

      totalDue += expected;
      totalPaid += paidAmount;
      interestTotal += interest;

      if (overdue) {
        overdueFees.push({
          ...fee,
          expected,
          paidAmount,
          interest,
          balance: balanceBeforeInterest + interest,
        });
      }
    });

    return {
      player,
      totalDue,
      totalPaid,
      interestTotal,
      expectedMonthly: currentFee ? getExpectedFeeForPlayer(player, currentFee, players) : 0,
      balance: Math.max(totalDue + interestTotal - totalPaid, 0),
      isDefaulter: overdueFees.length > 0,
      nextDueDate: nextFee ? getFeeDueDate(nextFee) : "-",
      lastPayment,
      overdueFees,
    };
  });
}

export function getDefaulters(players, fees, payments, today = new Date()) {
  return calculateDebts(players, fees, payments, today).filter(
    (debt) => debt.balance > 0 && debt.overdueFees.length > 0,
  );
}
