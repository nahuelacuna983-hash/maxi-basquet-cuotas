export const initialPlayers = [
  {
    id: "player-1",
    firstName: "Juan",
    lastName: "Perez",
    phone: "11 5555-0101",
    internalEnabled: true,
    status: "activo",
    type: "competidor",
    responsibilityScore: 245,
    accessCode: "",
  },
  {
    id: "player-2",
    firstName: "Martin",
    lastName: "Gomez",
    phone: "11 5555-0102",
    internalEnabled: false,
    status: "activo",
    type: "competidor",
    responsibilityScore: 198,
    accessCode: "",
  },
  {
    id: "player-3",
    firstName: "Diego",
    lastName: "Lopez",
    phone: "11 5555-0103",
    internalEnabled: true,
    status: "lesionado",
    type: "solo_entrenamientos",
    responsibilityScore: 220,
    accessCode: "",
  },
];

export const initialFees = [
  {
    id: "fee-1",
    month: "2026-04",
    trainingSessionCost: 55000,
    sundayCost: 90000,
    interestPercent: 5,
    dueDay: 10,
  },
  {
    id: "fee-2",
    month: "2026-05",
    trainingSessionCost: 55000,
    sundayCost: 90000,
    interestPercent: 5,
    dueDay: 10,
  },
];

export const initialPayments = [
  {
    id: "payment-1",
    playerId: "player-1",
    feeId: "fee-1",
    amount: 18000,
    paidAt: "2026-04-08",
    method: "transferencia",
    status: "aprobado",
    operationNumber: "Inicial",
    note: "Transferencia",
  },
  {
    id: "payment-2",
    playerId: "player-2",
    feeId: "fee-1",
    amount: 9000,
    paidAt: "2026-04-15",
    method: "transferencia",
    status: "aprobado",
    operationNumber: "Inicial",
    note: "Pago parcial",
  },
];

export const initialTreasuryConfig = {
  paymentAlias: "maxisuda",
  accountHolder: "Mercado Pago",
  paymentLink: "",
  paymentTestMode: false,
  paymentInstructions:
    "Paga por transferencia al alias maxisuda. Despues volve a la app, toca Informar pago y carga monto, fecha y numero de operacion u observacion. El pago queda pendiente hasta que Tesoreria lo valide.",
};

export const initialAttendances = [];

export const initialResponsibilityConfig = {
  attendanceStartDate: "2026-04-06",
  attendanceEndDate: "2026-12-31",
  trainingWeekdays: [2, 4],
  pointsPerTraining: 10,
  absencePenalty: 10,
  lateNoticePenalty: 5,
  lastMinuteDropPenalty: 15,
};

export const initialAttendanceConfig = {
  publicNoResponseLabel: "No me interesa",
  trainingMinimumPlayers: 10,
  closeAt: "20:30",
  lastMinuteDropStartsAt: "12:00",
  openWeekdays: {
    2: 5,
    4: 3,
  },
};

export const initialResponsibilityAdjustments = [];

export const adminConfig = {
  pin: "1234",
};

export function createInitialAppState() {
  return {
    version: 1,
    players: initialPlayers.map((player) => ({ ...player })),
    fees: initialFees.map((fee) => ({ ...fee })),
    payments: initialPayments.map((payment) => ({ ...payment })),
    attendances: initialAttendances.map((attendance) => ({ ...attendance })),
    responsibilityAdjustments: initialResponsibilityAdjustments.map((adjustment) => ({
      ...adjustment,
    })),
    responsibilityConfig: { ...initialResponsibilityConfig },
    attendanceConfig: {
      ...initialAttendanceConfig,
      openWeekdays: { ...initialAttendanceConfig.openWeekdays },
    },
    treasuryConfig: { ...initialTreasuryConfig },
  };
}
