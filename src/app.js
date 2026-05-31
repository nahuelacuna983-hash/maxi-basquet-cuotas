import {
  adminConfig,
  createInitialAppState,
} from "./data/initialData.js";
import {
  calculateDebts,
  formatMoney,
  getDefaulters,
  getExpectedFeeForPlayer,
  getFeeBreakdown,
  getFeeDueDate,
  getInterestAmount,
  getPendingPayments,
  getPaidAmount,
  getPlayerName,
  isBillablePlayer,
  isApprovedPayment,
  isFeeOverdue,
} from "./domain/finance.js";
import { createId } from "./domain/ids.js";
import {
  calculateResponsibilityScore,
  countTrainingDays,
  getBaseResponsibilityScore,
  isTrainingWeekday,
} from "./domain/responsibility.js";
import {
  clearPersistedState,
  createPersistedState,
  loadPersistedState,
  normalizePersistedState,
  savePersistedState,
} from "./domain/storage.js";
import {
  adminReviewPayment,
  adminDeleteGuestAttendance,
  adminSoftDeletePayment,
  adminUpdateTreasuryConfig,
  adminUpsertAttendance,
  adminUpsertFee,
  adminUpsertPlayer,
  isSupabaseEnabled,
  loadSupabaseState,
  saveSupabaseState,
  submitPayment,
  submitTrainingAttendance,
  validatePlayerAccess,
} from "./domain/supabaseRepository.js";

const initialAppState = createInitialAppState();
const persistedAppState = loadPersistedState(initialAppState);
const initialUrlPlayerId = getUrlPlayerId();
const SELF_SERVICE_SESSION_KEY = "maxi-basquet-self-service-session-v1";
const persistedSelfServiceSession = loadSelfServiceSession();
let supabaseHydrated = !isSupabaseEnabled();
let supabaseSyncInProgress = false;
let suppressNextSupabaseSync = false;
let treasuryFormDirty = false;
const authorizedSelfServicePlayerIds = new Set();
const selfServiceAccessCodesByPlayerId = new Map();
const attendanceTagOptions = [
  { id: "meat", emoji: "🥩" },
  { id: "cook", emoji: "👨‍🍳" },
  { id: "wine", emoji: "🍷" },
  { id: "bread", emoji: "🍞" },
  { id: "beer", emoji: "🍺" },
  { id: "sponge", emoji: "🧽" },
];
const dinnerAttendanceTags = new Set(attendanceTagOptions.map((tag) => tag.id));
const trainingVoteCandidateStatuses = new Set([
  "voy",
  "avisa_mas_tarde",
  "llega_sobre_la_hora",
  "asistio",
]);
const state = {
  ...persistedAppState,
  playerFilter: "todos",
  selectedAdminPaymentFeeId: "",
  selectedPlayerPaymentFeeId: "",
  selectedSelfServicePlayerId:
    persistedAppState.players.find((player) => player.id === initialUrlPlayerId)?.id ??
    persistedAppState.players.find((player) => player.id === persistedSelfServiceSession?.playerId)?.id ??
    getSortedPlayers(persistedAppState.players)[0]?.id ??
    "",
  selectedSelfServiceMonth: "",
  selectedReportType: "general_equipo",
  selectedReportPlayerId: "",
  selectedReportMonth: getCurrentMonth(),
  currentReportText: "",
  selectedTrainingVoteDate: "",
  selectedTrainingVoteFirst: "",
  selectedTrainingVoteAward: "pelota",
  selectedTrainingVoteSecond: "",
  activePlayerTab: "quota",
  activeAdminTab: "resumen",
  activeAdminCards: {},
  isAdminMode: false,
  isAdminLoginVisible: false,
  attendanceSyncReady: !isSupabaseEnabled(),
  syncStatus: isSupabaseEnabled() ? "Conectando con Supabase..." : "Modo local",
};

const elements = {
  playerView: document.querySelector("#playerView"),
  adminView: document.querySelector("#adminView"),
  showAdminLoginButton: document.querySelector("#showAdminLoginButton"),
  adminLoginBox: document.querySelector("#adminLoginBox"),
  adminPin: document.querySelector("#adminPin"),
  adminLoginButton: document.querySelector("#adminLoginButton"),
  adminLogoutButton: document.querySelector("#adminLogoutButton"),
  backToPlayerViewButton: document.querySelector("#backToPlayerViewButton"),
  adminModeStatus: document.querySelector("#adminModeStatus"),
  adminSummary: document.querySelector("#adminSummary"),
  adminTabs: document.querySelector("#adminTabs"),
  adminCardTabs: document.querySelector("#adminCardTabs"),
  adminTabButtons: document.querySelectorAll("[data-admin-tab]"),
  adminTabPanels: document.querySelectorAll("[data-admin-panel]"),
  adminWorkspace: document.querySelector("#adminWorkspace"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importBackupButton: document.querySelector("#importBackupButton"),
  importBackupFile: document.querySelector("#importBackupFile"),
  removeSampleDataButton: document.querySelector("#removeSampleDataButton"),
  resetSampleDataButton: document.querySelector("#resetSampleDataButton"),
  backupMessage: document.querySelector("#backupMessage"),
  summaryPlayers: document.querySelector("#summaryPlayers"),
  summaryCollected: document.querySelector("#summaryCollected"),
  summaryDebt: document.querySelector("#summaryDebt"),
  summaryDefaulters: document.querySelector("#summaryDefaulters"),
  playerForm: document.querySelector("#playerForm"),
  bulkPlayersForm: document.querySelector("#bulkPlayersForm"),
  bulkPlayersInput: document.querySelector("#bulkPlayersInput"),
  bulkPlayersMessage: document.querySelector("#bulkPlayersMessage"),
  feeForm: document.querySelector("#feeForm"),
  createNextFeeButton: document.querySelector("#createNextFeeButton"),
  feeMessage: document.querySelector("#feeMessage"),
  paymentForm: document.querySelector("#paymentForm"),
  treasuryForm: document.querySelector("#treasuryForm"),
  treasuryAlias: document.querySelector("#treasuryAlias"),
  treasuryHolder: document.querySelector("#treasuryHolder"),
  treasuryPaymentLink: document.querySelector("#treasuryPaymentLink"),
  treasuryPaymentTestMode: document.querySelector("#treasuryPaymentTestMode"),
  treasuryInstructions: document.querySelector("#treasuryInstructions"),
  selfServicePlayer: document.querySelector("#selfServicePlayer"),
  selfServiceMonth: document.querySelector("#selfServiceMonth"),
  selfAccessBox: document.querySelector("#selfAccessBox"),
  selfAccessCode: document.querySelector("#selfAccessCode"),
  selfAccessButton: document.querySelector("#selfAccessButton"),
  selfAccessMessage: document.querySelector("#selfAccessMessage"),
  selfServiceProtectedContent: document.querySelector("#selfServiceProtectedContent"),
  playerTabs: document.querySelector("#playerTabs"),
  playerTabButtons: document.querySelectorAll("[data-player-tab]"),
  playerTabPanels: document.querySelectorAll("[data-player-panel]"),
  selfCurrentExpected: document.querySelector("#selfCurrentExpected"),
  selfCurrentInterest: document.querySelector("#selfCurrentInterest"),
  selfCurrentPaid: document.querySelector("#selfCurrentPaid"),
  selfCurrentBalance: document.querySelector("#selfCurrentBalance"),
  selfCurrentDue: document.querySelector("#selfCurrentDue"),
  selfCurrentStatus: document.querySelector("#selfCurrentStatus"),
  selfLateDebt: document.querySelector("#selfLateDebt"),
  selfNextEstimate: document.querySelector("#selfNextEstimate"),
  selfNextEstimateDetail: document.querySelector("#selfNextEstimateDetail"),
  selfMonthPercentText: document.querySelector("#selfMonthPercentText"),
  selfMonthPercentBar: document.querySelector("#selfMonthPercentBar"),
  selfYearPercentText: document.querySelector("#selfYearPercentText"),
  selfYearPercentBar: document.querySelector("#selfYearPercentBar"),
  selfPayButton: document.querySelector("#selfPayButton"),
  selfPaymentStatus: document.querySelector("#selfPaymentStatus"),
  selfPaymentInstructions: document.querySelector("#selfPaymentInstructions"),
  selfPaymentAlert: document.querySelector("#selfPaymentAlert"),
  selfPaymentForm: document.querySelector("#selfPaymentForm"),
  selfPaymentMethod: document.querySelector("#selfPaymentMethod"),
  selfPaymentAmount: document.querySelector("#selfPaymentAmount"),
  selfPaymentDate: document.querySelector("#selfPaymentDate"),
  selfPaymentNote: document.querySelector("#selfPaymentNote"),
  selfTrainingCard: document.querySelector("#selfTrainingCard"),
  selfTrainingTitle: document.querySelector("#selfTrainingTitle"),
  selfTrainingWindow: document.querySelector("#selfTrainingWindow"),
  selfTrainingActions: document.querySelector("#selfTrainingActions"),
  selfTrainingTags: document.querySelector("#selfTrainingTags"),
  selfTrainingGuestForm: document.querySelector("#selfTrainingGuestForm"),
  selfTrainingGuestName: document.querySelector("#selfTrainingGuestName"),
  selfTrainingMessage: document.querySelector("#selfTrainingMessage"),
  selfTrainingLists: document.querySelector("#selfTrainingLists"),
  selfTrainingMainTitle: document.querySelector("#selfTrainingMainTitle"),
  selfTrainingMainList: document.querySelector("#selfTrainingMainList"),
  selfTrainingDinnerPanel: document.querySelector("#selfTrainingDinnerPanel"),
  selfTrainingDinnerTitle: document.querySelector("#selfTrainingDinnerTitle"),
  selfTrainingDinnerList: document.querySelector("#selfTrainingDinnerList"),
  selfTrainingNoResponseTitle: document.querySelector("#selfTrainingNoResponseTitle"),
  selfTrainingNoResponseList: document.querySelector("#selfTrainingNoResponseList"),
  paymentPlayer: document.querySelector("#paymentPlayer"),
  paymentFee: document.querySelector("#paymentFee"),
  paymentDate: document.querySelector("#paymentDate"),
  playerPaymentForm: document.querySelector("#playerPaymentForm"),
  playerPaymentPlayer: document.querySelector("#playerPaymentPlayer"),
  playerPaymentFee: document.querySelector("#playerPaymentFee"),
  playerPaymentDebt: document.querySelector("#playerPaymentDebt"),
  playerPaymentAlias: document.querySelector("#playerPaymentAlias"),
  playerPaymentInstructions: document.querySelector("#playerPaymentInstructions"),
  playerPaymentDate: document.querySelector("#playerPaymentDate"),
  copyAliasButton: document.querySelector("#copyAliasButton"),
  attendanceForm: document.querySelector("#attendanceForm"),
  attendanceDate: document.querySelector("#attendanceDate"),
  attendancePlayer: document.querySelector("#attendancePlayer"),
  attendanceMessage: document.querySelector("#attendanceMessage"),
  attendanceNoveltyForm: document.querySelector("#attendanceNoveltyForm"),
  attendanceNoveltyDate: document.querySelector("#attendanceNoveltyDate"),
  attendanceNoveltyPlayer: document.querySelector("#attendanceNoveltyPlayer"),
  attendanceNoveltyStatus: document.querySelector("#attendanceNoveltyStatus"),
  attendanceNoveltyMessage: document.querySelector("#attendanceNoveltyMessage"),
  trainingVoteDate: document.querySelector("#trainingVoteDate"),
  trainingVoteFirst: document.querySelector("#trainingVoteFirst"),
  trainingVoteAward: document.querySelector("#trainingVoteAward"),
  trainingVoteSecond: document.querySelector("#trainingVoteSecond"),
  trainingVoteMessage: document.querySelector("#trainingVoteMessage"),
  trainingVoteBetaPanel: document.querySelector("#trainingVoteBetaPanel"),
  responsibilityBaseInfo: document.querySelector("#responsibilityBaseInfo"),
  responsibilityAdjustmentsTable: document.querySelector("#responsibilityAdjustmentsTable"),
  playersTable: document.querySelector("#playersTable"),
  playerFilters: document.querySelector("#playerFilters"),
  feesList: document.querySelector("#feesList"),
  defaultersList: document.querySelector("#defaultersList"),
  pendingPaymentsList: document.querySelector("#pendingPaymentsList"),
  paymentsHistoryList: document.querySelector("#paymentsHistoryList"),
  attendanceList: document.querySelector("#attendanceList"),
  adminStatsPanel: document.querySelector("#adminStatsPanel"),
  adminCallupsPanel: document.querySelector("#adminCallupsPanel"),
  reportType: document.querySelector("#reportType"),
  reportPlayer: document.querySelector("#reportPlayer"),
  reportPlayerField: document.querySelector("#reportPlayerField"),
  reportMonth: document.querySelector("#reportMonth"),
  generateReportButton: document.querySelector("#generateReportButton"),
  copyReportButton: document.querySelector("#copyReportButton"),
  reportMessage: document.querySelector("#reportMessage"),
  reportVisualOutput: document.querySelector("#reportVisualOutput"),
  detailedReportText: document.querySelector("#detailedReportText"),
  whatsappReport: document.querySelector("#whatsappReport"),
};

elements.paymentDate.value = new Date().toISOString().slice(0, 10);
elements.selfPaymentDate.value = new Date().toISOString().slice(0, 10);
elements.playerPaymentDate.value = new Date().toISOString().slice(0, 10);
elements.attendanceDate.value = new Date().toISOString().slice(0, 10);
elements.attendanceNoveltyDate.value = getDefaultTrainingResponseDate();
elements.trainingVoteDate.value = state.selectedTrainingVoteDate;
elements.treasuryAlias.value = state.treasuryConfig.paymentAlias;
elements.treasuryHolder.value = state.treasuryConfig.accountHolder;
elements.treasuryPaymentLink.value = state.treasuryConfig.paymentLink;
elements.treasuryPaymentTestMode.checked = Boolean(state.treasuryConfig.paymentTestMode);
elements.treasuryInstructions.value = state.treasuryConfig.paymentInstructions;

[
  elements.treasuryAlias,
  elements.treasuryHolder,
  elements.treasuryPaymentLink,
  elements.treasuryPaymentTestMode,
  elements.treasuryInstructions,
].forEach((element) => {
  element.addEventListener(element.type === "checkbox" ? "change" : "input", () => {
    treasuryFormDirty = true;
  });
});

elements.showAdminLoginButton.addEventListener("click", () => {
  state.isAdminLoginVisible = true;
  renderRoleVisibility();
  elements.adminPin.focus();
});

elements.adminLoginButton.addEventListener("click", () => {
  enterAdmin(elements.adminPin.value);
});

elements.adminPin.addEventListener("keydown", (event) => {
  if (event.key === "Enter") enterAdmin(elements.adminPin.value);
});

elements.adminLogoutButton.addEventListener("click", () => {
  exitAdmin();
});

elements.backToPlayerViewButton.addEventListener("click", () => {
  elements.playerView.scrollIntoView({ behavior: "smooth" });
});

elements.exportBackupButton.addEventListener("click", () => {
  if (!requireAdmin()) return;
  exportBackup();
});

elements.importBackupButton.addEventListener("click", () => {
  if (!requireAdmin()) return;
  elements.importBackupFile.click();
});

elements.importBackupFile.addEventListener("change", () => {
  if (!requireAdmin()) return;
  importBackupFile(elements.importBackupFile.files[0]);
});

elements.removeSampleDataButton.addEventListener("click", () => {
  if (!requireAdmin()) return;
  removeSampleData();
});

elements.resetSampleDataButton.addEventListener("click", () => {
  if (!requireAdmin()) return;
  resetSampleData();
});

elements.selfServicePlayer.addEventListener("change", () => {
  state.selectedSelfServicePlayerId = elements.selfServicePlayer.value;
  elements.selfAccessCode.value = "";
  elements.selfAccessMessage.textContent = "";
  clearSelfPaymentDraft();
  renderSelfService();
});

elements.selfServiceMonth.addEventListener("change", () => {
  state.selectedSelfServiceMonth = elements.selfServiceMonth.value;
  clearSelfPaymentDraft();
  renderSelfService();
});

elements.playerTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-player-tab]");
  if (!button) return;
  state.activePlayerTab = button.dataset.playerTab;
  renderPlayerTabs();
});

elements.adminTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-tab]");
  if (!button) return;
  state.activeAdminTab = button.dataset.adminTab;
  renderAdminTabs();
});

elements.adminCardTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin-card-select]");
  if (!button) return;
  state.activeAdminCards[state.activeAdminTab] = button.dataset.adminCardSelect;
  renderAdminTabs();
});

elements.reportType.addEventListener("change", () => {
  state.selectedReportType = elements.reportType.value;
  renderReportOptions();
});

elements.reportPlayer.addEventListener("change", () => {
  state.selectedReportPlayerId = elements.reportPlayer.value;
});

elements.reportMonth.addEventListener("change", () => {
  state.selectedReportMonth = elements.reportMonth.value;
});

elements.generateReportButton.addEventListener("click", () => {
  generateDetailedReport();
});

elements.copyReportButton.addEventListener("click", async () => {
  await copyDetailedReport();
});

elements.trainingVoteDate.addEventListener("change", () => {
  state.selectedTrainingVoteDate = elements.trainingVoteDate.value;
  state.selectedTrainingVoteFirst = "";
  state.selectedTrainingVoteSecond = "";
  renderTrainingVoteBeta();
});

elements.trainingVoteFirst.addEventListener("change", () => {
  state.selectedTrainingVoteFirst = elements.trainingVoteFirst.value;
  renderTrainingVoteBeta();
});

elements.trainingVoteAward.addEventListener("change", () => {
  state.selectedTrainingVoteAward = elements.trainingVoteAward.value;
  renderTrainingVoteBeta();
});

elements.trainingVoteSecond.addEventListener("change", () => {
  state.selectedTrainingVoteSecond = elements.trainingVoteSecond.value;
  renderTrainingVoteBeta();
});

elements.selfPaymentDate.addEventListener("change", () => {
  updateSelfPaymentSuggestedAmount(true);
});

elements.selfAccessButton.addEventListener("click", () => {
  authorizeSelfServicePlayer();
});

elements.selfAccessCode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") authorizeSelfServicePlayer();
});

elements.selfPayButton.addEventListener("click", () => {
  const player = state.players.find((item) => item.id === state.selectedSelfServicePlayerId);
  if (!player || !canViewSelfServicePlayer(player)) {
    elements.selfPaymentStatus.textContent = "Ingresa tu codigo antes de pagar.";
    return;
  }

  if (state.treasuryConfig.paymentTestMode) {
    elements.selfPaymentStatus.textContent =
      "Modo prueba: no se abrió Mercado Pago. Para simular el pago, usá Informar pago.";
    return;
  }

  const paymentLink = state.treasuryConfig.paymentLink?.trim();
  if (!paymentLink) {
    elements.selfPaymentStatus.textContent =
      "Paga desde tu billetera al alias indicado. Despues volve a esta pantalla e informa el pago.";
    elements.selfPaymentForm.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  elements.selfPaymentStatus.textContent =
    "Se abrio el medio de pago. Despues volve a esta pantalla e informa el pago.";
  window.open(paymentLink, "_blank", "noopener,noreferrer");
});

elements.selfPaymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const playerId = elements.selfServicePlayer.value;
  const player = state.players.find((item) => item.id === playerId);
  const currentFee = getSelectedSelfServiceFee();
  const amount = Number(elements.selfPaymentAmount.value);
  const paidAt = elements.selfPaymentDate.value;
  const method = elements.selfPaymentMethod.value;
  const note = elements.selfPaymentNote.value.trim();

  if (!player || !canViewSelfServicePlayer(player)) {
    elements.selfPaymentStatus.textContent = "Ingresa tu codigo antes de informar un pago.";
    return;
  }

  if (!playerId || !currentFee || amount <= 0 || !paidAt) {
    elements.selfPaymentStatus.textContent =
      "No se pudo informar el pago. Revisa jugador, cuota actual, monto y fecha.";
    return;
  }

  const existingPayment = getActivePaymentForPlayerFee(playerId, currentFee.id);
  if (existingPayment) {
    elements.selfPaymentStatus.textContent =
      `Ya hay un pago ${formatPaymentStatus(existingPayment.status).toLowerCase()} informado para ${formatMonthLabel(currentFee.month)}. Si necesitas corregirlo, avisa al administrador.`;
    return;
  }

  const payment = {
    id: createId("payment"),
    playerId,
    feeId: currentFee.id,
    amount,
    paidAt,
    method,
    status: "pendiente",
    operationNumber: note,
    receiptNote: note,
    note,
    createdAt: new Date().toISOString(),
  };

  state.payments.unshift(payment);
  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    elements.selfPaymentStatus.textContent = "Informando pago...";
    try {
      const mutationResult = await submitPayment(payment);
      state.syncStatus = getPaymentMutationMessage("Pago informado", mutationResult);
    } catch (error) {
      state.payments = state.payments.filter((item) => item.id !== payment.id);
      elements.selfPaymentStatus.textContent = `Error al informar pago: ${error.message}`;
      state.syncStatus = `Error al informar pago: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return;
    } finally {
      supabaseSyncInProgress = false;
    }
  }

  elements.selfPaymentAmount.value = "";
  elements.selfPaymentNote.value = "";
  elements.selfPaymentStatus.textContent =
    "Pago informado. Queda pendiente hasta que lo valide el administrador.";
  suppressNextSupabaseSync = true;
  render();
});

elements.selfTrainingActions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-self-training-status]");
  if (!button) return;

  submitSelfTrainingStatus(button.dataset.selfTrainingStatus, {
    dinnerOnly: button.dataset.selfTrainingDinnerOnly === "true",
  });
});

elements.selfTrainingTags.addEventListener("click", (event) => {
  const button = event.target.closest("[data-self-training-tag]");
  if (!button || button.disabled) return;

  toggleSelfTrainingTag(button.dataset.selfTrainingTag);
});

elements.selfTrainingGuestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await addTrainingGuest();
});

elements.playerFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  state.playerFilter = button.dataset.filter;
  render();
});

elements.playerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const firstName = document.querySelector("#playerFirstName").value.trim();
  const lastName = document.querySelector("#playerLastName").value.trim();
  const phone = document.querySelector("#playerPhone").value.trim();
  const accessCode = document.querySelector("#playerAccessCode").value.trim();
  const type = document.querySelector("#playerType").value;
  const status = document.querySelector("#playerStatus").value;
  const internalEnabled = document.querySelector("#playerInternalEnabled").checked;

  if (!firstName || !lastName) return;

  const previousPlayers = state.players;
  const player = {
    id: createId("player"),
    firstName,
    lastName,
    phone,
    accessCode,
    hasAccessCode: Boolean(accessCode),
    hasPrivateAccessCode: true,
    type,
    status,
    internalEnabled,
  };
  state.players = [...state.players, player];

  const saved = await persistAdminPlayers(
    [player],
    previousPlayers,
    "Jugador guardado",
    "Error al guardar jugador",
  );
  if (!saved) return;

  elements.playerForm.reset();
  document.querySelector("#playerInternalEnabled").checked = true;
});

elements.bulkPlayersForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const previousPlayers = state.players;
  const previousPlayerIds = new Set(previousPlayers.map((player) => player.id));
  const result = importBulkPlayers(elements.bulkPlayersInput.value);
  const importedPlayers = state.players.filter((player) => !previousPlayerIds.has(player.id));
  elements.bulkPlayersMessage.textContent =
    `Importados: ${result.imported}. Ignorados: ${result.ignored}. Duplicados: ${result.duplicates}. Errores: ${result.errors}.`;

  if (result.imported > 0) {
    const saved = await persistAdminPlayers(
      importedPlayers,
      previousPlayers,
      "Jugadores importados",
      "Error al importar jugadores",
    );
    if (!saved) return;

    elements.bulkPlayersInput.value = "";
  }
});

elements.feeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const month = document.querySelector("#feeMonth").value;
  const trainingSessionCost = Number(document.querySelector("#feeTrainingCost").value);
  const sundayCost = Number(document.querySelector("#feeSundayCost").value);
  const trainingBillingBase = Number(document.querySelector("#feeTrainingBillingBase").value) || null;
  const sundayBillingBase = Number(document.querySelector("#feeSundayBillingBase").value) || null;
  const interestPercent = Number(document.querySelector("#feeInterestPercent").value);

  if (!month || trainingSessionCost <= 0 || sundayCost < 0 || interestPercent < 0) return;
  if (state.fees.some((fee) => fee.month === month)) {
    alert(`Ya existe una cuota cargada para ${month}. Edita la base de cobro en la lista de cuotas.`);
    return;
  }

  const previousFees = state.fees;
  const fee = {
    id: createId("fee"),
    month,
    trainingSessionCost,
    sundayCost,
    trainingBillingBase,
    sundayBillingBase,
    interestPercent,
    dueDay: 10,
  };
  const saved = await persistFee(fee, previousFees, "Cuota guardada", "Error al guardar cuota");
  if (!saved) return;

  elements.feeForm.reset();
  document.querySelector("#feeTrainingCost").value = "55000";
  document.querySelector("#feeSundayCost").value = "90000";
  document.querySelector("#feeTrainingBillingBase").value = "";
  document.querySelector("#feeSundayBillingBase").value = "";
  document.querySelector("#feeInterestPercent").value = "5";
  elements.feeMessage.textContent = `Cuota ${month} creada. Ya se pueden registrar pagos de ese mes.`;
});

elements.createNextFeeButton.addEventListener("click", async () => {
  await createNextFeeFromLatest();
});

elements.paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const playerId = elements.paymentPlayer.value;
  const feeId = elements.paymentFee.value;
  const selectedFee = state.fees.find((fee) => fee.id === feeId);
  const amount = Number(document.querySelector("#paymentAmount").value);
  const paidAt = document.querySelector("#paymentDate").value;
  const note = document.querySelector("#paymentNote").value.trim();

  if (!playerId || !selectedFee || amount <= 0 || !paidAt) return;

  const existingPayments = getActivePaymentsForPlayerFee(playerId, selectedFee.id);
  if (existingPayments.length > 0) {
    const shouldReplace = confirm(
      `Ya hay ${existingPayments.length} pago(s) informado(s) para ${selectedFee.month}. Reemplazar por este pago y quitar los anteriores?`,
    );
    if (!shouldReplace) return;

    await removePayments(existingPayments.map((payment) => payment.id));
  }

  const previousPayments = state.payments;
  const payment = {
    id: createId("payment"),
    playerId,
    feeId: selectedFee.id,
    amount,
    paidAt,
    method: "transferencia",
    status: "pendiente",
    operationNumber: "Carga admin",
    note,
    createdAt: new Date().toISOString(),
  };

  state.payments.unshift(payment);
  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = "Registrando pago admin...";
    renderRoleVisibility();

    try {
      const submitResult = await submitPayment(payment);
      const reviewResult = await adminReviewPayment(adminConfig.pin, payment.id, "aprobado");
      state.payments = state.payments.map((item) =>
        item.id === payment.id
          ? {
              ...item,
              status: "aprobado",
              reviewedAt: new Date().toISOString(),
              reviewedBy: "admin",
            }
          : item,
      );
      state.syncStatus = getPaymentMutationMessage(
        "Pago admin registrado",
        getCombinedMutationResult([submitResult, reviewResult]),
      );
    } catch (error) {
      state.payments = previousPayments;
      state.syncStatus = `Error al registrar pago admin: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.payments = state.payments.map((item) =>
      item.id === payment.id
        ? {
            ...item,
            status: "aprobado",
            reviewedAt: new Date().toISOString(),
            reviewedBy: "admin",
          }
        : item,
    );
    state.syncStatus = "Pago admin registrado localmente";
  }

  document.querySelector("#paymentAmount").value = "";
  document.querySelector("#paymentNote").value = "";
  suppressNextSupabaseSync = true;
  render();
});

elements.treasuryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const previousTreasuryConfig = { ...state.treasuryConfig };
  const nextTreasuryConfig = {
    paymentAlias: elements.treasuryAlias.value.trim(),
    accountHolder: elements.treasuryHolder.value.trim(),
    paymentLink: elements.treasuryPaymentLink.value.trim(),
    paymentTestMode: elements.treasuryPaymentTestMode.checked,
    paymentInstructions: elements.treasuryInstructions.value.trim(),
  };
  state.treasuryConfig = nextTreasuryConfig;

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = "Actualizando tesorería...";
    renderRoleVisibility();

    try {
      const mutationResult = await adminUpdateTreasuryConfig(adminConfig.pin, nextTreasuryConfig);
      state.syncStatus = getPaymentMutationMessage("Tesorería actualizada", mutationResult);
    } catch (error) {
      state.treasuryConfig = previousTreasuryConfig;
      state.syncStatus = `Error al actualizar tesorería: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      treasuryFormDirty = false;
      syncFormValuesFromState({ forceTreasury: true });
      render();
      return;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = "Tesorería actualizada localmente";
  }

  treasuryFormDirty = false;
  suppressNextSupabaseSync = true;
  render();
});

elements.paymentFee.addEventListener("change", () => {
  state.selectedAdminPaymentFeeId = elements.paymentFee.value;
});

elements.playerPaymentPlayer.addEventListener("change", renderPlayerPaymentSummary);
elements.playerPaymentFee.addEventListener("change", () => {
  state.selectedPlayerPaymentFeeId = elements.playerPaymentFee.value;
  renderPlayerPaymentSummary();
});

elements.copyAliasButton.addEventListener("click", async () => {
  const alias = state.treasuryConfig.paymentAlias;
  try {
    await navigator.clipboard.writeText(alias);
    elements.copyAliasButton.textContent = "Alias copiado";
    setTimeout(() => {
      elements.copyAliasButton.textContent = "Copiar alias";
    }, 1400);
  } catch {
    elements.copyAliasButton.textContent = "No se pudo copiar";
  }
});

elements.playerPaymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const playerId = elements.playerPaymentPlayer.value;
  const feeId = elements.playerPaymentFee.value;
  const selectedFee = state.fees.find((fee) => fee.id === feeId);
  const amount = Number(document.querySelector("#playerPaymentAmount").value);
  const paidAt = elements.playerPaymentDate.value;
  const method = document.querySelector("#playerPaymentMethod").value;
  const operationNumber = document.querySelector("#playerPaymentOperation").value.trim();
  const note = document.querySelector("#playerPaymentNote").value.trim();

  if (!playerId || !selectedFee || amount <= 0 || !paidAt) return;

  const existingPayment = getActivePaymentForPlayerFee(playerId, selectedFee.id);
  if (existingPayment) {
    alert(
      `Ya hay un pago ${formatPaymentStatus(existingPayment.status).toLowerCase()} informado para ${selectedFee.month}. Si necesitas corregirlo, avisale al administrador.`,
    );
    return;
  }

  const payment = {
    id: createId("payment"),
    playerId,
    feeId: selectedFee.id,
    amount,
    paidAt,
    method,
    status: "pendiente",
    operationNumber,
    receiptNote: operationNumber,
    note,
    createdAt: new Date().toISOString(),
  };

  state.payments.unshift(payment);
  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = "Informando pago...";
    renderRoleVisibility();

    try {
      const mutationResult = await submitPayment(payment);
      state.syncStatus = getPaymentMutationMessage("Pago informado", mutationResult);
    } catch (error) {
      state.payments = state.payments.filter((item) => item.id !== payment.id);
      state.syncStatus = `Error al informar pago: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return;
    } finally {
      supabaseSyncInProgress = false;
    }
  }

  document.querySelector("#playerPaymentAmount").value = "";
  document.querySelector("#playerPaymentOperation").value = "";
  document.querySelector("#playerPaymentNote").value = "";
  suppressNextSupabaseSync = true;
  render();
});

elements.attendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const date = elements.attendanceDate.value;
  const playerId = elements.attendancePlayer.value;

  if (!isTrainingDate(date)) {
    elements.attendanceMessage.textContent =
      "La asistencia solo se puede cargar para martes o jueves.";
    return;
  }

  if (date < getTodayString()) {
    elements.attendanceMessage.textContent =
      "Para incumplimientos historicos usa el ajuste inicial de responsabilidad.";
    return;
  }

  const existingAttendance = getAttendanceForPlayerDate(playerId, date);
  const attendance = {
    id: existingAttendance?.id ?? createId("attendance"),
    date,
    eventType: "entrenamiento",
    playerId,
    status: "asistio",
    source: "admin",
    createdAt: existingAttendance?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingAttendance) {
    if (["falto", "aviso_tarde", "baja_sobre_hora"].includes(existingAttendance.status)) {
      elements.attendanceMessage.textContent =
        "Ese entrenamiento ya tiene una novedad admin cargada.";
      return;
    }
  }

  const saved = await persistAttendance(
    attendance,
    "Asistencia guardada",
    "Error al guardar asistencia",
    { admin: true },
  );
  elements.attendanceMessage.textContent = saved ? "" : state.syncStatus;
});

elements.attendanceNoveltyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const date = elements.attendanceNoveltyDate.value;
  const playerId = elements.attendanceNoveltyPlayer.value;
  const selectedStatus = elements.attendanceNoveltyStatus.value;
  const { status, tags } = normalizeAdminAttendanceResponse(selectedStatus);

  if (!isTrainingDate(date)) {
    elements.attendanceNoveltyMessage.textContent =
      "Las respuestas solo se pueden cargar para martes o jueves.";
    return;
  }

  if (date < state.responsibilityConfig.attendanceStartDate) {
    elements.attendanceNoveltyMessage.textContent =
      `La fecha minima para respuestas es ${state.responsibilityConfig.attendanceStartDate}.`;
    return;
  }

  if (tags.length > 0 && !isDinnerTrainingDate(date)) {
    elements.attendanceNoveltyMessage.textContent =
      "Cena y emoticones solo se usan en entrenamientos de jueves.";
    return;
  }

  const existingAttendance = getAttendanceForPlayerDate(playerId, date);
  const attendance = {
    id: existingAttendance?.id ?? createId("attendance"),
    date,
    eventType: "entrenamiento",
    playerId,
    status,
    source: serializeAttendanceSource("admin", tags),
    createdAt: existingAttendance?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await persistAttendance(
    attendance,
    "Respuesta admin guardada",
    "Error al guardar respuesta admin",
    { admin: true },
  );
  elements.attendanceNoveltyMessage.textContent = saved ? "" : state.syncStatus;
});

function render() {
  const debts = calculateDebts(state.players, state.fees, state.payments);
  const defaulters = getDefaulters(state.players, state.fees, state.payments);
  const totalCollected = state.payments.reduce(
    (sum, payment) => sum + (isApprovedPayment(payment) ? Number(payment.amount) || 0 : 0),
    0,
  );
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);

  elements.summaryPlayers.textContent = String(state.players.length);
  elements.summaryCollected.textContent = formatMoney(totalCollected);
  elements.summaryDebt.textContent = formatMoney(totalDebt);
  elements.summaryDefaulters.textContent = String(defaulters.length);

  renderRoleVisibility();
  renderSelfService();
  renderPaymentOptions();
  renderPlayerPaymentOptions();
  renderAttendanceOptions();
  renderAttendanceNoveltyOptions();
  renderPlayerPaymentSummary();
  renderPlayersTable(debts);
  renderFeesList();
  renderDefaulters(defaulters);
  renderPendingPayments();
  renderPaymentsHistory();
  renderAttendances();
  renderTrainingVoteBeta();
  renderResponsibilityAdjustments();
  renderReportOptions();
  renderWhatsappReport(debts);
  renderAdminStats(debts);
  renderAdminCallups(debts);
  savePersistedState(state);
  syncSupabaseState();
}

function renderSelfService() {
  const sortedPlayers = getSortedPlayers();
  const selectedPlayer = state.players.find(
    (player) => player.id === state.selectedSelfServicePlayerId,
  );
  const fallbackPlayer = selectedPlayer ?? sortedPlayers[0];
  const selectedMonth = getSelectedSelfServiceMonth();

  state.selectedSelfServicePlayerId = fallbackPlayer?.id ?? "";
  elements.selfServicePlayer.innerHTML = sortedPlayers
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");
  elements.selfServicePlayer.value = state.selectedSelfServicePlayerId;
  renderSelfServiceMonthOptions(selectedMonth);

  if (!fallbackPlayer) {
    elements.selfAccessBox.hidden = true;
    elements.selfServiceProtectedContent.hidden = true;
    elements.selfTrainingCard.hidden = true;
    elements.selfCurrentExpected.textContent = formatMoney(0);
    elements.selfCurrentInterest.textContent = formatMoney(0);
    elements.selfCurrentPaid.textContent = formatMoney(0);
    elements.selfCurrentBalance.textContent = formatMoney(0);
    elements.selfCurrentDue.textContent = "-";
    elements.selfCurrentStatus.textContent = "Sin jugador";
    elements.selfLateDebt.textContent = formatMoney(0);
    elements.selfNextEstimate.textContent = formatMoney(0);
    elements.selfPaymentInstructions.hidden = true;
    elements.selfPaymentAlert.hidden = true;
    elements.selfPaymentForm.hidden = true;
    updateProgress(elements.selfMonthPercentBar, elements.selfMonthPercentText, 0);
    updateProgress(elements.selfYearPercentBar, elements.selfYearPercentText, 0);
    return;
  }

  const isAuthorized = canViewSelfServicePlayer(fallbackPlayer);
  elements.selfAccessBox.hidden = state.isAdminMode;
  elements.selfServiceProtectedContent.hidden = !isAuthorized;

  if (!isAuthorized) {
    elements.selfCurrentExpected.textContent = formatMoney(0);
    elements.selfCurrentInterest.textContent = formatMoney(0);
    elements.selfCurrentPaid.textContent = formatMoney(0);
    elements.selfCurrentBalance.textContent = formatMoney(0);
    elements.selfCurrentDue.textContent = "-";
    elements.selfCurrentStatus.textContent = "Codigo requerido";
    elements.selfCurrentStatus.className = "payment-status status-pendiente";
    elements.selfLateDebt.textContent = formatMoney(0);
    elements.selfNextEstimate.textContent = formatMoney(0);
    elements.selfPaymentInstructions.hidden = true;
    elements.selfPaymentAlert.hidden = true;
    elements.selfPaymentForm.hidden = true;
    elements.selfTrainingCard.hidden = true;
    elements.selfPaymentStatus.textContent = "";
    elements.selfAccessMessage.textContent =
      playerHasAccessCode(fallbackPlayer)
        ? "Ingresa tu codigo para ver tu cuota."
        : "Este jugador todavia no tiene codigo asignado.";
    updateProgress(elements.selfMonthPercentBar, elements.selfMonthPercentText, 0);
    updateProgress(elements.selfYearPercentBar, elements.selfYearPercentText, 0);
    return;
  }

  if (state.isAdminMode) {
    elements.selfAccessMessage.textContent = "Vista habilitada por modo admin.";
  }

  const currentMonth = selectedMonth;
  const currentFee = getSelectedSelfServiceFee();
  const currentExpected = currentFee
    ? getExpectedFeeForPlayer(fallbackPlayer, currentFee, state.players)
    : 0;
  const currentPaid = currentFee ? getPaidAmount(state.payments, fallbackPlayer.id, currentFee.id) : 0;
  const currentBalance = Math.max(currentExpected - currentPaid, 0);
  const currentInterest = currentFee ? getCurrentInterestAmount(currentBalance, currentFee) : 0;
  const currentPayable = currentBalance + currentInterest;
  const currentStatus = isBillablePlayer(fallbackPlayer)
    ? getCurrentPaymentStatus(currentPayable, currentFee)
    : { label: "Sin cuota mensual", className: "status-pendiente" };
  const lateDebt = getLateDebtForPlayer(fallbackPlayer, currentMonth);
  const nextEstimate = getNextMonthEstimate(fallbackPlayer, currentMonth);
  const nextMonth = getNextMonth(currentMonth);
  const monthPercent = getPaymentPercent(currentPaid, currentExpected);
  const yearPercent = getYearPaymentPercent(fallbackPlayer, currentMonth.slice(0, 4));
  const pendingAmount = getPendingAmountForPlayer(fallbackPlayer.id, currentFee?.id);
  const latestPayment = currentFee ? getLatestPaymentForPlayerFee(fallbackPlayer.id, currentFee.id) : null;
  const hasBlockingPayment = ["pendiente", "aprobado"].includes(latestPayment?.status);

  elements.selfCurrentExpected.textContent = formatMoney(currentExpected);
  elements.selfCurrentInterest.textContent = formatMoney(currentInterest);
  elements.selfCurrentPaid.textContent = formatMoney(currentPaid);
  elements.selfCurrentBalance.textContent = getMainPaymentText(
    fallbackPlayer,
    currentExpected,
    currentPayable,
  );
  elements.selfCurrentDue.textContent = currentFee ? getFeeDueDate(currentFee) : "Sin cuota cargada";
  elements.selfCurrentStatus.textContent = currentStatus.label;
  elements.selfCurrentStatus.className = `payment-status ${currentStatus.className}`;
  elements.selfLateDebt.textContent = formatMoney(lateDebt);
  elements.selfNextEstimate.textContent = formatMoney(nextEstimate);
  elements.selfNextEstimateDetail.textContent =
    `${formatMonthLabel(nextMonth)} estimada segun valores actuales.`;
  elements.selfPayButton.disabled =
    !state.treasuryConfig.paymentTestMode && !hasConfiguredPaymentMethod();
  elements.selfPayButton.hidden = currentExpected <= 0 || currentPayable <= 0 || hasBlockingPayment;
  renderSelfPaymentInstructions(hasBlockingPayment ? 0 : currentPayable);
  renderSelfPaymentAlert(latestPayment, pendingAmount, currentExpected, currentPayable, currentFee);
  elements.selfPaymentStatus.textContent = formatSelfPaymentStatus(
    latestPayment,
    pendingAmount,
    currentExpected,
    currentPayable,
  );
  elements.selfPaymentForm.hidden =
    currentExpected <= 0 || currentPayable <= 0 || hasBlockingPayment;
  updateSelfPaymentSuggestedAmount();
  updateProgress(elements.selfMonthPercentBar, elements.selfMonthPercentText, monthPercent);
  updateProgress(elements.selfYearPercentBar, elements.selfYearPercentText, yearPercent);
  renderSelfTrainingSignup(fallbackPlayer);
  renderPlayerTabs();
}

function renderPlayerTabs() {
  const activeTab = state.activePlayerTab || "quota";

  elements.playerTabButtons.forEach((button) => {
    const isActive = button.dataset.playerTab === activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.playerTabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.playerPanel !== activeTab;
  });
}

function renderAdminTabs() {
  const activeTab = state.activeAdminTab || "resumen";
  const activePanels = getAdminPanelsForTab(activeTab);
  const activeCard = getActiveAdminCard(activeTab, activePanels);
  const workspaceTabs = new Set([
    "jugadores",
    "cuotas",
    "pagos",
    "entrenamientos",
    "votaciones",
    "estadisticas",
    "convocatorias",
    "reportes",
    "vip",
    "configuracion",
  ]);

  elements.adminTabButtons.forEach((button) => {
    const isActive = button.dataset.adminTab === activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  elements.adminTabPanels.forEach((panel) => {
    const isActivePanel = panel.dataset.adminPanel === activeTab;
    const cardId = ensureAdminCardId(panel);
    panel.hidden = !isActivePanel || cardId !== activeCard;
  });

  renderAdminCardTabs(activeTab, activePanels, activeCard);
  elements.adminWorkspace.hidden = !workspaceTabs.has(activeTab);
  elements.adminWorkspace.classList.toggle("admin-card-mode", activePanels.length > 1);
}

function getAdminPanelsForTab(tab) {
  return Array.from(elements.adminTabPanels).filter((panel) => panel.dataset.adminPanel === tab);
}

function ensureAdminCardId(panel) {
  if (!panel.dataset.adminCard) {
    const tab = panel.dataset.adminPanel ?? "admin";
    const sameTabPanels = getAdminPanelsForTab(tab);
    const index = sameTabPanels.indexOf(panel);
    panel.dataset.adminCard = `${tab}-${index}`;
  }

  return panel.dataset.adminCard;
}

function getAdminCardLabel(panel) {
  return panel.dataset.adminCardLabel || panel.querySelector("h2")?.textContent?.trim() || "Seccion";
}

function getActiveAdminCard(tab, panels) {
  if (!panels.length) return "";

  const selectedCard = state.activeAdminCards[tab];
  const matchingPanel = panels.find((panel) => ensureAdminCardId(panel) === selectedCard);
  if (matchingPanel) return ensureAdminCardId(matchingPanel);

  const firstCard = ensureAdminCardId(panels[0]);
  state.activeAdminCards[tab] = firstCard;
  return firstCard;
}

function renderAdminCardTabs(tab, panels, activeCard) {
  if (panels.length <= 1) {
    elements.adminCardTabs.hidden = true;
    elements.adminCardTabs.innerHTML = "";
    return;
  }

  elements.adminCardTabs.hidden = false;
  elements.adminCardTabs.innerHTML = panels
    .map((panel) => {
      const cardId = ensureAdminCardId(panel);
      const isActive = cardId === activeCard;
      return `
        <button class="admin-card-button ${isActive ? "active" : ""}" type="button" data-admin-card-select="${cardId}" aria-selected="${isActive}">
          ${escapeHtml(getAdminCardLabel(panel))}
        </button>
      `;
    })
    .join("");
}

function renderPaymentOptions() {
  const selectedPlayer = elements.paymentPlayer.value;
  const selectedFee = state.selectedAdminPaymentFeeId || elements.paymentFee.value;
  const sortedPlayers = getSortedPlayers();
  const sortedFees = getSortedFees();

  elements.paymentPlayer.innerHTML = sortedPlayers
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.paymentFee.innerHTML = sortedFees
    .map((fee) => `<option value="${fee.id}">${escapeHtml(formatFeeOptionLabel(fee))}</option>`)
    .join("");

  elements.paymentPlayer.value = selectedPlayer || sortedPlayers[0]?.id || "";
  state.selectedAdminPaymentFeeId = getValidPaymentFeeId(selectedFee);
  elements.paymentFee.value = state.selectedAdminPaymentFeeId;
}

function renderPlayerPaymentOptions() {
  const selectedPlayer = elements.playerPaymentPlayer.value;
  const selectedFee = state.selectedPlayerPaymentFeeId || elements.playerPaymentFee.value;
  const sortedPlayers = getSortedPlayers();
  const sortedFees = getSortedFees();

  elements.playerPaymentPlayer.innerHTML = sortedPlayers
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.playerPaymentFee.innerHTML = sortedFees
    .map((fee) => `<option value="${fee.id}">${escapeHtml(formatFeeOptionLabel(fee))}</option>`)
    .join("");

  elements.playerPaymentPlayer.value = selectedPlayer || sortedPlayers[0]?.id || "";
  state.selectedPlayerPaymentFeeId = getValidPaymentFeeId(selectedFee);
  elements.playerPaymentFee.value = state.selectedPlayerPaymentFeeId;
}

function renderSelfServiceMonthOptions(selectedMonth) {
  const months = state.fees
    .map((fee) => fee.month)
    .filter((month, index, list) => list.indexOf(month) === index)
    .sort();

  elements.selfServiceMonth.innerHTML = months
    .map((month) => `<option value="${month}">${escapeHtml(formatMonthOptionLabel(month))}</option>`)
    .join("");
  elements.selfServiceMonth.value = selectedMonth;
}

function renderAttendanceOptions() {
  const selectedPlayer = elements.attendancePlayer.value;
  const sortedPlayers = getSortedPlayers();

  elements.attendancePlayer.innerHTML = sortedPlayers
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.attendancePlayer.value = selectedPlayer || sortedPlayers[0]?.id || "";
}

function renderAttendanceNoveltyOptions() {
  const selectedPlayer = elements.attendanceNoveltyPlayer.value;
  const sortedPlayers = getSortedPlayers();

  elements.attendanceNoveltyPlayer.innerHTML = sortedPlayers
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.attendanceNoveltyPlayer.value = selectedPlayer || sortedPlayers[0]?.id || "";
}

function renderPlayerPaymentSummary() {
  const player = state.players.find((item) => item.id === elements.playerPaymentPlayer.value);
  const fee = state.fees.find((item) => item.id === elements.playerPaymentFee.value);

  if (!player || !fee) {
    elements.playerPaymentDebt.textContent = formatMoney(0);
    return;
  }

  const expected = getExpectedFeeForPlayer(player, fee, state.players);
  const paid = getPaidAmount(state.payments, player.id, fee.id);
  const balance = Math.max(expected - paid, 0);

  elements.playerPaymentDebt.textContent = `Debe ${formatMoney(balance)}`;
  elements.playerPaymentAlias.textContent = `Alias: ${state.treasuryConfig.paymentAlias}`;
  elements.playerPaymentInstructions.textContent = state.treasuryConfig.paymentInstructions;
}

function renderPlayersTable(debts) {
  updateFilterButtons();

  const filteredDebts = debts
    .filter((debt) => matchesPlayerFilter(debt, state.playerFilter))
    .sort((a, b) => comparePlayersByName(a.player, b.player));

  elements.playersTable.innerHTML = filteredDebts
    .map((debt) => {
      const enabledClass = debt.player.internalEnabled ? "toggle-on" : "toggle-off";
      const enabledText = debt.player.internalEnabled ? "Si" : "No";
      const debtClass = debt.balance > 0 ? "debt-value" : "paid-value";
      const lastPayment = formatLastPayment(debt.lastPayment);

      return `
        <tr>
          <td><strong>${escapeHtml(getPlayerName(debt.player))}</strong></td>
          <td>${escapeHtml(debt.player.phone || "-")}</td>
          <td>${formatPlayerType(debt.player.type)}</td>
          <td>
            <select class="table-select" data-player-status="${debt.player.id}">
              ${renderPlayerStatusOptions(debt.player.status)}
            </select>
          </td>
          <td><strong>${getResponsibilityDetails(debt.player.id).score}</strong></td>
          <td>
            <input
              class="table-input"
              data-access-code-player="${debt.player.id}"
              value="${escapeHtml(debt.player.accessCode ?? "")}"
              placeholder="Sin codigo"
            />
          </td>
          <td>
            <button class="toggle-button ${enabledClass}" data-toggle-player="${debt.player.id}" type="button">
              ${enabledText}
            </button>
          </td>
          <td>${formatMoney(debt.totalPaid)}</td>
          <td>${formatMoney(debt.expectedMonthly)}</td>
          <td class="${debtClass}">${formatMoney(debt.balance)}</td>
          <td>${debt.isDefaulter ? "Si" : "No"}</td>
          <td>${debt.nextDueDate}</td>
          <td>${lastPayment}</td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("[data-toggle-player]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleInternalEnabled(button.dataset.togglePlayer);
    });
  });

  document.querySelectorAll("[data-player-status]").forEach((select) => {
    select.addEventListener("change", () => {
      updatePlayerStatus(select.dataset.playerStatus, select.value);
    });
  });

  document.querySelectorAll("[data-access-code-player]").forEach((input) => {
    input.addEventListener("change", () => {
      updatePlayerAccessCode(input.dataset.accessCodePlayer, input.value);
    });
  });
}

function updateFilterButtons() {
  elements.playerFilters.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.playerFilter);
  });
}

function matchesPlayerFilter(debt, filter) {
  const player = debt.player;
  const checks = {
    todos: true,
    competidores: player.type === "competidor",
    solo_entrenamientos: player.type === "solo_entrenamientos",
    morosos: debt.isDefaulter,
    habilitados: player.internalEnabled,
    no_habilitados: !player.internalEnabled,
    activos: player.status === "activo",
    lesionados: player.status === "lesionado",
    lista_espera: player.status === "lista_espera",
    esporadicos: player.status === "esporadico",
  };

  return checks[filter] ?? true;
}

async function createNextFeeFromLatest() {
  if (!requireAdmin()) return;

  const sortedFees = state.fees.slice().sort((a, b) => a.month.localeCompare(b.month));
  const latestFee = sortedFees[sortedFees.length - 1];

  if (!latestFee) {
    elements.feeMessage.textContent = "Primero carga una cuota base.";
    return;
  }

  const nextMonth = getNextMonth(latestFee.month);
  if (state.fees.some((fee) => fee.month === nextMonth)) {
    elements.feeMessage.textContent = `Ya existe una cuota cargada para ${formatMonthLabel(nextMonth)}.`;
    return;
  }

  const previousFees = state.fees;
  const nextFee = {
    ...latestFee,
    id: createId("fee"),
    month: nextMonth,
    fixedTrainingOnlyAmount: null,
    fixedCompetitorAmount: null,
  };

  const saved = await persistFee(
    nextFee,
    previousFees,
    "Cuota siguiente creada",
    "Error al crear cuota siguiente",
  );
  if (!saved) return;

  state.selectedSelfServiceMonth = nextMonth;
  state.selectedAdminPaymentFeeId = nextFee.id;
  state.selectedPlayerPaymentFeeId = nextFee.id;
  elements.feeMessage.textContent =
    `Cuota ${formatMonthLabel(nextMonth)} creada con valores actuales. Ya se pueden registrar pagos.`;
  render();
}

function formatLastPayment(payment) {
  if (!payment) return "-";
  return `${payment.paidAt} - ${formatMoney(Number(payment.amount) || 0)}`;
}

function renderFeesList() {
  elements.feesList.innerHTML = state.fees
    .map((fee) => {
      const breakdown = getFeeBreakdown(fee, state.players);
      const collected = state.players.reduce(
        (sum, player) => sum + getPaidAmount(state.payments, player.id, fee.id),
        0,
      );
      const expected = state.players.reduce(
        (sum, player) => sum + getExpectedFeeForPlayer(player, fee, state.players),
        0,
      );
      const trainingOnlyPlayer = state.players.find(
        (player) => player.type === "solo_entrenamientos" && player.status === "activo",
      );
      const competitorPlayer = state.players.find(
        (player) => player.type === "competidor" && player.status === "activo",
      );
      const expectedTrainingOnly = trainingOnlyPlayer
        ? getExpectedFeeForPlayer(trainingOnlyPlayer, fee, state.players)
        : 0;
      const expectedCompetitor = competitorPlayer
        ? getExpectedFeeForPlayer(competitorPlayer, fee, state.players)
        : 0;
      const fixedAmountLabel = breakdown.usesFixedAmounts
        ? `<span>Monto fijo historico: solo entrenamientos ${formatMoney(breakdown.fixedTrainingOnlyAmount ?? 0)} / competidor ${formatMoney(breakdown.fixedCompetitorAmount ?? 0)}</span>`
        : "";

      return `
        <article class="fee-row">
          <div>
            <strong>${fee.month}</strong>
            <span>${breakdown.tuesdays} martes, ${breakdown.thursdays} jueves, ${breakdown.sundays} domingos</span>
          </div>
          <div>
            <strong>Vence ${getFeeDueDate(fee)}</strong>
            <span>Cobrado ${formatMoney(collected)} de ${formatMoney(expected)}</span>
            <span>Jugadores reales: ${breakdown.totalPlayers} / Competidores reales: ${breakdown.competitors}</span>
            <span>Base de cobro: ${breakdown.trainingBillingBase} entrenamientos / ${breakdown.sundayBillingBase} domingos</span>
            <span>Solo entrenamientos ${formatMoney(expectedTrainingOnly)} / Competidor ${formatMoney(expectedCompetitor)}</span>
            ${fixedAmountLabel}
            <div class="fee-base-controls">
              <label>
                Base entrenamientos
                <input class="score-input" data-fee-base-field="trainingBillingBase" data-fee-base-id="${fee.id}" type="number" min="0" value="${fee.trainingBillingBase ?? ""}" placeholder="Auto" />
              </label>
              <label>
                Base domingos
                <input class="score-input" data-fee-base-field="sundayBillingBase" data-fee-base-id="${fee.id}" type="number" min="0" value="${fee.sundayBillingBase ?? ""}" placeholder="Auto" />
              </label>
              <label>
                Fijo solo entrenamientos
                <input class="score-input" data-fee-base-field="fixedTrainingOnlyAmount" data-fee-base-id="${fee.id}" type="number" min="0" value="${fee.fixedTrainingOnlyAmount ?? ""}" placeholder="Formula" />
              </label>
              <label>
                Fijo competidor
                <input class="score-input" data-fee-base-field="fixedCompetitorAmount" data-fee-base-id="${fee.id}" type="number" min="0" value="${fee.fixedCompetitorAmount ?? ""}" placeholder="Formula" />
              </label>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-fee-base-id]").forEach((input) => {
    input.addEventListener("change", () => {
      updateFeeBillingBase(input.dataset.feeBaseId, input.dataset.feeBaseField, input.value);
    });
  });
}

function renderDefaulters(defaulters) {
  if (defaulters.length === 0) {
    elements.defaultersList.innerHTML =
      '<p class="empty-state">No hay morosos con cuotas vencidas.</p>';
    return;
  }

  elements.defaultersList.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
                          <th>Jugador</th>
                          <th>Cuotas vencidas</th>
                          <th>Saldo</th>
                          <th>Interes</th>
                          <th>Interno</th>
                        </tr>
        </thead>
        <tbody>
          ${defaulters
            .map(
              (debt) => `
                <tr>
                  <td><strong>${escapeHtml(getPlayerName(debt.player))}</strong></td>
                  <td>${debt.overdueFees.map((fee) => fee.month).join(", ")}</td>
                  <td class="debt-value">${formatMoney(debt.balance)}</td>
                  <td>${formatMoney(debt.interestTotal)}</td>
                  <td>${debt.player.internalEnabled ? "Habilitado" : "No habilitado"}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPendingPayments() {
  const pendingPayments = getPendingPayments(state.payments);

  if (pendingPayments.length === 0) {
    elements.pendingPaymentsList.innerHTML =
      '<p class="empty-state">No hay pagos pendientes de validacion.</p>';
    return;
  }

  elements.pendingPaymentsList.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Cuota</th>
            <th>Metodo</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Operacion / observacion</th>
            <th>Estado</th>
            <th>Admin</th>
          </tr>
        </thead>
        <tbody>
          ${pendingPayments
            .map((payment) => {
              const player = state.players.find((item) => item.id === payment.playerId);
              const fee = state.fees.find((item) => item.id === payment.feeId);
              return `
                <tr>
                  <td><strong>${escapeHtml(player ? getPlayerName(player) : "Jugador")}</strong></td>
                  <td>${fee?.month ?? "-"}</td>
                  <td>${formatPaymentMethod(payment.method)}</td>
                  <td>${formatMoney(Number(payment.amount) || 0)}</td>
                  <td>${payment.paidAt}</td>
                  <td>${escapeHtml(payment.operationNumber || payment.note || "-")}</td>
                  <td><span class="payment-status status-pendiente">Pendiente</span></td>
                  <td>
                    <div class="admin-actions">
                      <button class="secondary-button" type="button" data-approve-payment="${payment.id}">Aprobar</button>
                      <button class="secondary-button danger-button" type="button" data-reject-payment="${payment.id}">Rechazar</button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll("[data-approve-payment]").forEach((button) => {
    button.addEventListener("click", () => {
      reviewPayment(button.dataset.approvePayment, "aprobado");
    });
  });

  document.querySelectorAll("[data-reject-payment]").forEach((button) => {
    button.addEventListener("click", () => {
      reviewPayment(button.dataset.rejectPayment, "rechazado");
    });
  });
}

function renderPaymentsHistory() {
  if (state.payments.length === 0) {
    elements.paymentsHistoryList.innerHTML =
      '<p class="empty-state">Todavía no hay pagos informados.</p>';
    return;
  }

  const sortedPayments = state.payments
    .slice()
    .sort((a, b) => (b.createdAt ?? b.paidAt ?? "").localeCompare(a.createdAt ?? a.paidAt ?? ""));

  elements.paymentsHistoryList.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Cuota</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Metodo</th>
            <th>Operacion / observacion</th>
            <th>Estado</th>
            <th>Admin</th>
          </tr>
        </thead>
        <tbody>
          ${sortedPayments
            .map((payment) => {
              const player = state.players.find((item) => item.id === payment.playerId);
              const fee = state.fees.find((item) => item.id === payment.feeId);
              const status = payment.status ?? "aprobado";

              return `
                <tr>
                  <td><strong>${escapeHtml(player ? getPlayerName(player) : "Jugador")}</strong></td>
                  <td>${fee?.month ?? "-"}</td>
                  <td>${formatMoney(Number(payment.amount) || 0)}</td>
                  <td>${payment.paidAt ?? "-"}</td>
                  <td>${formatPaymentMethod(payment.method)}</td>
                  <td>${escapeHtml(payment.operationNumber || payment.receiptNote || payment.note || "-")}</td>
                  <td><span class="payment-status status-${status}">${formatPaymentStatus(status)}</span></td>
                  <td>
                    <button class="secondary-button danger-button" type="button" data-delete-payment="${payment.id}">Eliminar</button>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll("[data-delete-payment]").forEach((button) => {
    button.addEventListener("click", () => {
      deletePayment(button.dataset.deletePayment);
    });
  });
}

function renderAttendances() {
  if (state.attendances.length === 0) {
    elements.attendanceList.innerHTML =
      '<p class="empty-state">Todavia no hay asistencias cargadas.</p>';
    return;
  }

  const sortedAttendances = state.attendances
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || getAttendanceDisplayName(a).localeCompare(getAttendanceDisplayName(b)));

  elements.attendanceList.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Evento</th>
            <th>Jugador</th>
            <th>Estado</th>
            <th>Admin</th>
          </tr>
        </thead>
        <tbody>
          ${sortedAttendances
            .map(
              (attendance) => `
                <tr>
                  <td>${attendance.date}</td>
                  <td>Entrenamiento</td>
                  <td><strong>${escapeHtml(getAttendanceDisplayName(attendance))}</strong>${isGuestAttendance(attendance) ? ' <span class="muted-detail">(invitado)</span>' : ""}</td>
                  <td>
                    <select class="table-select" data-attendance-status="${attendance.id}">
                      ${[
                        "voy",
                        "no_voy",
                        "avisa_mas_tarde",
                        "llega_sobre_la_hora",
                        "baja_sobre_la_hora",
                        "asistio",
                        "falto",
                        "aviso_tarde",
                      ]
                        .map(
                          (status) =>
                            `<option value="${status}" ${attendance.status === status ? "selected" : ""}>${formatAttendanceStatus(status)}</option>`,
                        )
                        .join("")}
                    </select>
                  </td>
                  <td>
                    ${isGuestAttendance(attendance) ? `<button class="secondary-button danger-button" type="button" data-delete-guest-attendance="${attendance.id}">Quitar invitado</button>` : "-"}
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll("[data-attendance-status]").forEach((select) => {
    select.addEventListener("change", () => {
      updateAttendanceStatus(select.dataset.attendanceStatus, select.value);
    });
  });

  elements.attendanceList.querySelectorAll("[data-delete-guest-attendance]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteGuestAttendance(button.dataset.deleteGuestAttendance);
    });
  });
}

function renderTrainingVoteBeta() {
  const dates = getTrainingVoteDates();

  if (dates.length === 0) {
    elements.trainingVoteDate.innerHTML = '<option value="">Sin entrenamientos</option>';
    elements.trainingVoteFirst.innerHTML = '<option value="">Sin candidatos</option>';
    elements.trainingVoteSecond.innerHTML = '<option value="">Sin candidatos</option>';
    elements.trainingVoteFirst.disabled = true;
    elements.trainingVoteAward.disabled = true;
    elements.trainingVoteSecond.disabled = true;
    elements.trainingVoteMessage.textContent = "Todavia no hay entrenamientos con respuestas cargadas.";
    elements.trainingVoteBetaPanel.innerHTML =
      '<p class="empty-state">Cuando haya asistencias, aca vas a poder simular la votacion de destacados.</p>';
    return;
  }

  if (!state.selectedTrainingVoteDate || !dates.includes(state.selectedTrainingVoteDate)) {
    state.selectedTrainingVoteDate = dates[0];
  }

  const candidates = getTrainingVoteCandidates(state.selectedTrainingVoteDate);
  const candidateIds = new Set(candidates.map((player) => player.id));

  if (!candidateIds.has(state.selectedTrainingVoteFirst)) {
    state.selectedTrainingVoteFirst = "";
  }
  if (!candidateIds.has(state.selectedTrainingVoteSecond)) {
    state.selectedTrainingVoteSecond = "";
  }

  elements.trainingVoteDate.innerHTML = dates
    .map(
      (date) =>
        `<option value="${date}">${formatTrainingDateLabel(date)} (${date})</option>`,
    )
    .join("");
  elements.trainingVoteDate.value = state.selectedTrainingVoteDate;

  const candidateOptions = [
    '<option value="">Elegir jugador</option>',
    ...candidates.map(
      (player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`,
    ),
  ].join("");

  elements.trainingVoteFirst.innerHTML = candidateOptions;
  elements.trainingVoteSecond.innerHTML = candidateOptions;
  elements.trainingVoteFirst.value = state.selectedTrainingVoteFirst;
  if (!["pelota", "copa"].includes(state.selectedTrainingVoteAward)) {
    state.selectedTrainingVoteAward = "pelota";
  }
  elements.trainingVoteAward.value = state.selectedTrainingVoteAward || "pelota";
  elements.trainingVoteSecond.value = state.selectedTrainingVoteSecond;
  elements.trainingVoteFirst.disabled = candidates.length < 2;
  elements.trainingVoteAward.disabled = candidates.length < 2;
  elements.trainingVoteSecond.disabled = candidates.length < 2;

  const firstPlayer = candidates.find((player) => player.id === state.selectedTrainingVoteFirst);
  const secondPlayer = candidates.find((player) => player.id === state.selectedTrainingVoteSecond);
  const award = getTrainingVoteAward(state.selectedTrainingVoteAward);
  const hasValidSelection =
    firstPlayer &&
    secondPlayer &&
    firstPlayer.id !== secondPlayer.id;

  if (candidates.length < 2) {
    elements.trainingVoteMessage.textContent =
      "Se necesitan al menos 2 participantes reales para simular destacado y esponja.";
  } else if (!firstPlayer || !secondPlayer) {
    elements.trainingVoteMessage.textContent =
      "Elegir un destacado, su premio y un voto esponja. Esta beta no guarda votos ni bloquea jugadores.";
  } else if (firstPlayer.id === secondPlayer.id) {
    elements.trainingVoteMessage.textContent = "Destacado y esponja tienen que ser jugadores distintos.";
  } else {
    elements.trainingVoteMessage.textContent =
      `Simulacion lista: ${award.label} para destacado y esponja asignada.`;
  }

  elements.trainingVoteBetaPanel.innerHTML = `
    <div class="vote-beta-grid">
      <article class="payment-summary">
        <span>Entrenamiento</span>
        <strong>${formatTrainingDateLabel(state.selectedTrainingVoteDate)}</strong>
        <span>No visible para jugadores. No guarda datos.</span>
      </article>
      <article class="payment-summary">
        <span>Candidatos</span>
        <strong>${candidates.length}</strong>
        <span>Solo jugadores reales que figuran como participantes.</span>
      </article>
    </div>
    <div class="vote-beta-columns">
      <div>
        <h3>Candidatos</h3>
        ${renderTrainingVoteCandidateList(candidates)}
      </div>
      <div>
        <h3>Resultado simulado</h3>
        ${
          hasValidSelection
            ? `<ol class="training-list">
                <li>${award.emoji} <strong>Destacado:</strong> ${escapeHtml(getPlayerName(firstPlayer))}</li>
                <li>🧽 <strong>Esponja:</strong> ${escapeHtml(getPlayerName(secondPlayer))}</li>
              </ol>`
            : '<p class="empty-state">Elegir destacado, premio y esponja para ver el resultado.</p>'
        }
      </div>
    </div>
  `;
}

function renderTrainingVoteCandidateList(candidates) {
  if (candidates.length === 0) {
    return '<p class="empty-state">No hay participantes reales para esta fecha.</p>';
  }

  return `
    <ol class="training-list">
      ${candidates.map((player) => `<li>${escapeHtml(getPlayerName(player))}</li>`).join("")}
    </ol>
  `;
}

function getTrainingVoteAward(value) {
  const awards = {
    pelota: { label: "Pelota", emoji: "🏀" },
    copa: { label: "Copa", emoji: "🏆" },
  };

  return awards[value] ?? awards.pelota;
}

function renderResponsibilityAdjustments() {
  const trainingCount = countTrainingDays(
    state.responsibilityConfig.attendanceStartDate,
    state.responsibilityConfig.attendanceEndDate,
    state.responsibilityConfig,
  );
  const baseScore = getBaseResponsibilityScore(state.responsibilityConfig);
  const completedTrainingDates = getCompletedTrainingDates();

  elements.responsibilityBaseInfo.innerHTML = `
    <strong>Base anual: ${baseScore} pts</strong>
    <span>Inicio ${state.responsibilityConfig.attendanceStartDate} / ${trainingCount} entrenamientos de martes y jueves / ${state.responsibilityConfig.pointsPerTraining} pts posibles por entrenamiento</span>
    <span>${completedTrainingDates.length} entrenamientos cerrados del calendario con control de ausentes activos.</span>
    <span>Si una fecha cerrada no tiene respuestas, todos los jugadores activos cuentan como ausentes inferidos.</span>
  `;

  elements.responsibilityAdjustmentsTable.innerHTML = getSortedPlayers()
    .map((player) => {
      const adjustment = getResponsibilityAdjustment(player.id);
      const details = getResponsibilityDetails(player.id, completedTrainingDates);

      return `
        <tr>
          <td><strong>${escapeHtml(getPlayerName(player))}</strong></td>
          <td>
            <input class="score-input" data-adjustment-field="accumulatedAbsences" data-adjustment-player="${player.id}" type="number" min="0" value="${adjustment.accumulatedAbsences}" />
          </td>
          <td>
            <input class="score-input" data-adjustment-field="accumulatedLateNotices" data-adjustment-player="${player.id}" type="number" min="0" value="${adjustment.accumulatedLateNotices}" />
          </td>
          <td>
            <input class="score-input" data-adjustment-field="accumulatedLastMinuteDrops" data-adjustment-player="${player.id}" type="number" min="0" value="${adjustment.accumulatedLastMinuteDrops}" />
          </td>
          <td>
            <input class="note-input" data-adjustment-field="observation" data-adjustment-player="${player.id}" value="${escapeHtml(adjustment.observation)}" />
          </td>
          <td>
            <strong>${details.score}</strong>
            <span class="muted-detail">-${details.historicalDiscount + details.attendanceDiscount} pts</span>
            <span class="muted-detail">Ausentes inferidos: -${details.implicitAbsenceDiscount} pts</span>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("[data-adjustment-player]").forEach((input) => {
    input.addEventListener("change", () => {
      updateResponsibilityAdjustment(
        input.dataset.adjustmentPlayer,
        input.dataset.adjustmentField,
        input.value,
      );
    });
  });
}

function renderAdminStats(debts) {
  const totalExpected = debts.reduce((sum, debt) => sum + debt.expectedMonthly, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.totalPaid, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const defaulterCount = debts.filter(
    (debt) => debt.balance > 0 && debt.overdueFees.length > 0,
  ).length;
  const paymentPercent = getPaymentPercent(totalPaid, totalExpected);
  const activePlayers = state.players.filter((player) => player.status === "activo").length;
  const completedTrainingDates = getCompletedTrainingDates();
  const completedTrainingDateSet = new Set(completedTrainingDates);
  const visibleAttendances = state.attendances.filter((attendance) =>
    completedTrainingDateSet.has(attendance.date) &&
    ["voy", "avisa_mas_tarde", "llega_sobre_la_hora", "asistio"].includes(attendance.status),
  );
  const lastMinuteDrops = state.attendances.filter((attendance) =>
    completedTrainingDateSet.has(attendance.date) &&
    ["baja_sobre_la_hora", "baja_sobre_hora"].includes(attendance.status),
  );
  const implicitAbsenceCount = getImplicitAbsenceCount(completedTrainingDates);
  const noRecordTrainingCount = getNoRecordTrainingCount(completedTrainingDates);
  const averageAttendance = completedTrainingDates.length
    ? Math.round(visibleAttendances.length / completedTrainingDates.length)
    : 0;
  const topResponsibilityPlayers = getSortedPlayers()
    .filter((player) => player.status === "activo")
    .slice()
    .sort(
      (a, b) =>
        getResponsibilityDetails(b.id, completedTrainingDates).score -
        getResponsibilityDetails(a.id, completedTrainingDates).score,
    )
    .slice(0, 5);

  elements.adminStatsPanel.innerHTML = `
    <div class="stats-grid">
      <article class="metric-card compact-stat">
        <span>Cobranza mensual</span>
        <strong>${paymentPercent}%</strong>
        <p>${formatMoney(totalPaid)} cobrados de ${formatMoney(totalExpected)}</p>
      </article>
      <article class="metric-card compact-stat">
        <span>Deuda actual</span>
        <strong>${formatMoney(totalDebt)}</strong>
        <p>${defaulterCount} morosos detectados.</p>
      </article>
      <article class="metric-card compact-stat">
        <span>Jugadores activos</span>
        <strong>${activePlayers}</strong>
        <p>Base para cuotas y entrenamientos.</p>
      </article>
      <article class="metric-card compact-stat">
        <span>Promedio asistencia</span>
        <strong>${averageAttendance}</strong>
        <p>Promedio por entrenamiento cerrado.</p>
      </article>
      <article class="metric-card compact-stat">
        <span>Jornadas cerradas</span>
        <strong>${completedTrainingDates.length}</strong>
        <p>${noRecordTrainingCount} sin ninguna respuesta.</p>
      </article>
      <article class="metric-card compact-stat">
        <span>Ausencias inferidas</span>
        <strong>${implicitAbsenceCount}</strong>
        <p>Activos sin registro en entrenamientos cerrados.</p>
      </article>
      <article class="metric-card compact-stat">
        <span>Bajas sobre hora</span>
        <strong>${lastMinuteDrops.length}</strong>
        <p>Descuentan responsabilidad.</p>
      </article>
    </div>
    <div class="placeholder-list">
      <strong>Responsabilidad destacada</strong>
      ${topResponsibilityPlayers
        .map(
          (player) =>
            `<span>${escapeHtml(getPlayerName(player))}: ${getResponsibilityDetails(player.id, completedTrainingDates).score} pts</span>`,
        )
        .join("")}
      <span>Las ausencias inferidas se calculan comparando jugadores activos contra todos los martes y jueves cerrados del calendario.</span>
    </div>
  `;
}

function renderAdminCallups(debts) {
  const debtByPlayerId = new Map(debts.map((debt) => [debt.player.id, debt]));
  const competitors = state.players.filter(
    (player) =>
      player.type === "competidor" &&
      player.status === "activo" &&
      player.internalEnabled &&
      !debtByPlayerId.get(player.id)?.overdueFees.length,
  );
  const suggested = competitors
    .slice()
    .sort((a, b) => getResponsibilityDetails(b.id).score - getResponsibilityDetails(a.id).score);
  const sundayMinimum = 8;
  const sundayMaximum = 12;

  elements.adminCallupsPanel.innerHTML = `
    <div class="placeholder-list">
      <strong>Convocatoria domingo</strong>
      <span>Minimo reglamentario: ${sundayMinimum}. Maximo reglamentario: ${sundayMaximum}.</span>
      <span>Estado actual: sugerencia visible para admin, todavia sin publicacion editable.</span>
      <span>Proximo paso: permitir editar lista antes de mostrarla a jugadores.</span>
    </div>
    <ol class="training-list">
      ${suggested
        .slice(0, sundayMaximum)
        .map(
          (player) =>
            `<li>${escapeHtml(getPlayerName(player))} <span class="muted-detail">(${getResponsibilityDetails(player.id).score} pts)</span></li>`,
        )
        .join("") || '<li class="muted-detail">Sin jugadores sugeridos.</li>'}
    </ol>
  `;
}

function renderReportOptions() {
  const sortedPlayers = getSortedPlayers();
  const feeMonths = getReportFeeMonths();

  if (!state.selectedReportPlayerId || !sortedPlayers.some((player) => player.id === state.selectedReportPlayerId)) {
    state.selectedReportPlayerId = sortedPlayers[0]?.id ?? "";
  }

  if (!state.selectedReportMonth || (state.selectedReportMonth !== "all" && !feeMonths.includes(state.selectedReportMonth))) {
    state.selectedReportMonth = feeMonths.includes(getCurrentMonth()) ? getCurrentMonth() : (feeMonths[0] ?? "all");
  }

  elements.reportType.value = state.selectedReportType;
  elements.reportPlayerField.hidden = state.selectedReportType !== "individual";
  elements.reportPlayer.innerHTML =
    sortedPlayers
      .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
      .join("") || '<option value="">Sin jugadores</option>';
  elements.reportPlayer.value = state.selectedReportPlayerId;
  elements.reportMonth.innerHTML = [
    '<option value="all">Todos los meses</option>',
    ...feeMonths.map((month) => `<option value="${month}">${formatMonthLabel(month)}</option>`),
  ].join("");
  elements.reportMonth.value = state.selectedReportMonth;
}

function generateDetailedReport() {
  state.selectedReportType = elements.reportType.value;
  state.selectedReportPlayerId = elements.reportPlayer.value;
  state.selectedReportMonth = elements.reportMonth.value;

  const report = buildDetailedReport();
  state.currentReportText = report.text;
  elements.detailedReportText.value = report.text;
  elements.reportVisualOutput.innerHTML = report.html;
  elements.reportMessage.textContent = report.message || "Informe generado.";
}

async function copyDetailedReport() {
  const text = state.currentReportText || elements.detailedReportText.value;
  if (!text.trim()) {
    elements.reportMessage.textContent = "Primero genera un informe.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    elements.reportMessage.textContent = "Informe copiado.";
  } catch {
    elements.reportMessage.textContent = "No se pudo copiar el informe.";
  }
}

function buildDetailedReport() {
  const type = state.selectedReportType;
  const context = getReportContext();

  if (type === "individual") return buildIndividualReport(context);
  if (type === "pagos_general") return buildGeneralPaymentsReport(context);
  if (type === "asistencia_general") return buildGeneralAttendanceReport(context);
  if (type === "responsabilidad_general") return buildGeneralResponsibilityReport(context);
  if (type === "graficos") return buildChartsReport(context);
  return buildTeamGeneralReport(context);
}

function getReportContext() {
  const fees = getReportFees();
  const completedTrainingDates = getReportCompletedTrainingDates();
  const scopeLabel = getReportScopeLabel();

  return {
    fees,
    completedTrainingDates,
    scopeLabel,
    players: getSortedPlayers(),
  };
}

function buildIndividualReport(context) {
  const player = state.players.find((item) => item.id === state.selectedReportPlayerId);
  if (!player) return createEmptyReport("No hay jugador seleccionado.");

  const paymentSummary = getPlayerPaymentReport(player, context.fees);
  const attendanceSummary = getPlayerAttendanceReport(player, context.completedTrainingDates);
  const responsibility = getResponsibilityDetails(player.id, context.completedTrainingDates);
  const discountTotal = responsibility.historicalDiscount + responsibility.attendanceDiscount;

  const lines = [
    `Informe individual - ${getPlayerName(player)}`,
    `Periodo: ${context.scopeLabel}`,
    "",
    "Pagos",
    `- Estado: ${paymentSummary.status}`,
    `- Cuota esperada: ${formatMoney(paymentSummary.expected)}`,
    `- Pagado aprobado: ${formatMoney(paymentSummary.approved)}`,
    `- Pagos pendientes: ${formatMoney(paymentSummary.pending)} (${paymentSummary.pendingCount})`,
    `- Interes: ${formatMoney(paymentSummary.interest)}`,
    `- Deuda: ${formatMoney(paymentSummary.debt)}`,
    "",
    "Asistencia",
    `- Jornadas cerradas: ${attendanceSummary.closed}`,
    `- Respuestas cargadas: ${attendanceSummary.registered}`,
    `- Voy / asistio: ${attendanceSummary.confirmed}`,
    `- No voy: ${attendanceSummary.noVoy}`,
    `- No respondio: ${attendanceSummary.noResponse}`,
    `- Llega sobre la hora: ${attendanceSummary.lateArrival}`,
    `- Baja sobre la hora: ${attendanceSummary.lastMinuteDrops}`,
    `- Cena: ${attendanceSummary.dinner}`,
    "",
    "Responsabilidad",
    `- Puntaje base: ${responsibility.baseScore}`,
    `- Descuentos: ${discountTotal}`,
    `- Ausencias inferidas: ${responsibility.implicitAbsenceDiscount}`,
    `- Puntaje actual: ${responsibility.score}`,
  ];

  const html = `
    <div class="report-card">
      <h3>${escapeHtml(getPlayerName(player))}</h3>
      <p>${escapeHtml(context.scopeLabel)}</p>
      <div class="stats-grid">
        ${renderReportMetric("Estado cuota", paymentSummary.status)}
        ${renderReportMetric("Deuda", formatMoney(paymentSummary.debt))}
        ${renderReportMetric("No respondio", attendanceSummary.noResponse)}
        ${renderReportMetric("Responsabilidad", `${responsibility.score} pts`)}
      </div>
    </div>
    ${renderReportTable(
      ["Cuota esperada", "Aprobado", "Pendiente", "Interes", "Deuda", "Estado"],
      [[
        formatMoney(paymentSummary.expected),
        formatMoney(paymentSummary.approved),
        formatMoney(paymentSummary.pending),
        formatMoney(paymentSummary.interest),
        formatMoney(paymentSummary.debt),
        paymentSummary.status,
      ]],
    )}
    ${renderReportTable(
      ["Cerradas", "Voy", "No voy", "No respondio", "Llega sobre hora", "Baja sobre hora", "Cena"],
      [[
        attendanceSummary.closed,
        attendanceSummary.confirmed,
        attendanceSummary.noVoy,
        attendanceSummary.noResponse,
        attendanceSummary.lateArrival,
        attendanceSummary.lastMinuteDrops,
        attendanceSummary.dinner,
      ]],
    )}
  `;

  return { text: lines.join("\n"), html };
}

function buildGeneralPaymentsReport(context) {
  const rows = context.players.map((player) => {
    const summary = getPlayerPaymentReport(player, context.fees);
    return {
      player,
      summary,
      text: [
        getPlayerName(player),
        formatMoney(summary.expected),
        formatMoney(summary.approved),
        formatMoney(summary.pending),
        formatMoney(summary.interest),
        formatMoney(summary.debt),
        summary.status,
      ],
    };
  });

  const lines = [
    "Informe de pagos general",
    `Periodo: ${context.scopeLabel}`,
    "",
    "Jugador | Esperado | Aprobado | Pendiente | Interes | Deuda | Estado",
    ...rows.map((row) => row.text.join(" | ")),
  ];

  return {
    text: lines.join("\n"),
    html: renderReportTable(
      ["Jugador", "Esperado", "Aprobado", "Pendiente", "Interes", "Deuda", "Estado"],
      rows.map((row) => row.text),
    ),
  };
}

function buildGeneralAttendanceReport(context) {
  const rows = context.players.map((player) => {
    const summary = getPlayerAttendanceReport(player, context.completedTrainingDates);
    return [
      getPlayerName(player),
      `${summary.registered}/${summary.closed}`,
      summary.confirmed,
      summary.noVoy,
      summary.noResponse,
      summary.lateArrival,
      summary.lastMinuteDrops,
    ];
  });

  const lines = [
    "Informe de asistencia general",
    `Periodo: ${context.scopeLabel}`,
    "",
    "Jugador | Cargados/Cerrados | Voy | No voy | No respondio | Llega sobre hora | Baja sobre hora",
    ...rows.map((row) => row.join(" | ")),
  ];

  return {
    text: lines.join("\n"),
    html: renderReportTable(
      ["Jugador", "Cargados/Cerrados", "Voy", "No voy", "No respondio", "Llega sobre hora", "Baja sobre hora"],
      rows,
    ),
  };
}

function buildGeneralResponsibilityReport(context) {
  const rows = context.players
    .map((player) => {
      const details = getResponsibilityDetails(player.id, context.completedTrainingDates);
      const discount = details.historicalDiscount + details.attendanceDiscount;
      const reason = getMainResponsibilityDiscountReason(player, details, context.completedTrainingDates);
      return { player, details, discount, reason };
    })
    .sort((a, b) => b.details.score - a.details.score);

  const textRows = rows.map((row, index) => [
    index + 1,
    getPlayerName(row.player),
    row.details.baseScore,
    row.discount,
    row.details.score,
    row.reason,
  ]);
  const lines = [
    "Informe de responsabilidad general",
    `Periodo: ${context.scopeLabel}`,
    "",
    "Pos | Jugador | Base | Descuentos | Final | Motivo principal",
    ...textRows.map((row) => row.join(" | ")),
  ];

  return {
    text: lines.join("\n"),
    html: renderReportTable(
      ["#", "Jugador", "Base", "Descuentos", "Final", "Motivo principal"],
      textRows,
    ),
  };
}

function buildTeamGeneralReport(context) {
  const totals = getPaymentTotalsForReport(context.fees);
  const pendingPayments = getScopedPayments(context.fees).filter((payment) => payment.status === "pendiente");
  const playersWithDebt = context.players
    .map((player) => ({ player, summary: getPlayerPaymentReport(player, context.fees) }))
    .filter((item) => item.summary.status === "moroso");
  const attendanceRows = context.players.map((player) => getPlayerAttendanceReport(player, context.completedTrainingDates));
  const totalClosed = context.completedTrainingDates.length;
  const totalConfirmed = attendanceRows.reduce((sum, row) => sum + row.confirmed, 0);
  const averageAttendance = totalClosed ? Math.round(totalConfirmed / totalClosed) : 0;
  const responsibilityRows = context.players
    .filter((player) => player.status === "activo")
    .map((player) => ({
      player,
      details: getResponsibilityDetails(player.id, context.completedTrainingDates),
      attendance: getPlayerAttendanceReport(player, context.completedTrainingDates),
    }))
    .sort((a, b) => b.details.score - a.details.score);
  const committed = responsibilityRows.slice(0, 5);
  const reviewPlayers = responsibilityRows
    .filter((row) => row.attendance.noResponse > 0 || row.attendance.lastMinuteDrops > 0)
    .slice(-5);

  const lines = [
    "Informe general del equipo",
    `Periodo: ${context.scopeLabel}`,
    "",
    `Total esperado: ${formatMoney(totals.expected)}`,
    `Total cobrado aprobado: ${formatMoney(totals.approved)}`,
    `Total pendiente/deuda: ${formatMoney(totals.debt)}`,
    `Morosos: ${playersWithDebt.length}`,
    `Pagos pendientes de validacion: ${pendingPayments.length}`,
    `Porcentaje de cobro: ${totals.percent}%`,
    `Asistencia promedio: ${averageAttendance}`,
    "",
    "Jugadores mas comprometidos:",
    ...committed.map((row, index) => `${index + 1}. ${getPlayerName(row.player)} - ${row.details.score} pts`),
    "",
    "Jugadores a revisar:",
    ...(reviewPlayers.length
      ? reviewPlayers.map((row) => `- ${getPlayerName(row.player)}: ${row.attendance.noResponse} no respuestas, ${row.attendance.lastMinuteDrops} bajas sobre hora`)
      : ["Sin alertas relevantes."]),
  ];

  const html = `
    <div class="stats-grid">
      ${renderReportMetric("Esperado", formatMoney(totals.expected))}
      ${renderReportMetric("Cobrado", formatMoney(totals.approved))}
      ${renderReportMetric("Pendiente", formatMoney(totals.debt))}
      ${renderReportMetric("Cobro", `${totals.percent}%`)}
      ${renderReportMetric("Morosos", playersWithDebt.length)}
      ${renderReportMetric("Pagos pendientes", pendingPayments.length)}
      ${renderReportMetric("Asistencia promedio", averageAttendance)}
      ${renderReportMetric("Jornadas cerradas", totalClosed)}
    </div>
    ${renderReportTable(
      ["Mas comprometidos", "Puntaje"],
      committed.map((row) => [getPlayerName(row.player), row.details.score]),
    )}
  `;

  return { text: lines.join("\n"), html };
}

function buildChartsReport(context) {
  const totals = getPaymentTotalsForReport(context.fees);
  const responsibilityRows = context.players
    .filter((player) => player.status === "activo")
    .map((player) => ({
      label: getPlayerName(player),
      value: getResponsibilityDetails(player.id, context.completedTrainingDates).score,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const attendanceRows = context.players
    .filter((player) => player.status === "activo")
    .map((player) => ({
      label: getPlayerName(player),
      value: getPlayerAttendanceReport(player, context.completedTrainingDates).confirmed,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const approvedPercent = totals.totalFlow > 0 ? Math.round((totals.approved / totals.totalFlow) * 100) : 0;
  const pendingPercent = totals.totalFlow > 0 ? Math.round((totals.pending / totals.totalFlow) * 100) : 0;
  const debtPercent = Math.max(100 - approvedPercent - pendingPercent, 0);

  const lines = [
    "Graficos basicos",
    `Periodo: ${context.scopeLabel}`,
    "",
    `Cobro del periodo: ${totals.percent}%`,
    `Aprobado: ${formatMoney(totals.approved)}`,
    `Pendiente de validacion: ${formatMoney(totals.pending)}`,
    `Deuda: ${formatMoney(totals.debt)}`,
  ];

  const html = `
    <div class="report-chart-card">
      <h3>Porcentaje de cobro del periodo</h3>
      ${renderReportProgressBar(totals.percent, `${totals.percent}% cobrado`)}
    </div>
    <div class="report-chart-card">
      <h3>Aprobados / pendientes / deuda</h3>
      <div class="stacked-bar" aria-label="Aprobados pendientes deuda">
        <span class="stack-approved" style="width:${approvedPercent}%"></span>
        <span class="stack-pending" style="width:${pendingPercent}%"></span>
        <span class="stack-debt" style="width:${debtPercent}%"></span>
      </div>
      <p class="muted-detail">Aprobado ${approvedPercent}% / Pendiente ${pendingPercent}% / Deuda ${debtPercent}%</p>
    </div>
    <div class="report-chart-card">
      <h3>Ranking de responsabilidad</h3>
      ${renderHorizontalBars(responsibilityRows)}
    </div>
    <div class="report-chart-card">
      <h3>Asistencia por jugador</h3>
      ${renderHorizontalBars(attendanceRows)}
    </div>
  `;

  return { text: lines.join("\n"), html };
}

function getReportFeeMonths() {
  return [...new Set(state.fees.map((fee) => fee.month))].sort().reverse();
}

function getReportFees() {
  const fees = state.selectedReportMonth === "all"
    ? state.fees
    : state.fees.filter((fee) => fee.month === state.selectedReportMonth);
  return fees.slice().sort((a, b) => a.month.localeCompare(b.month));
}

function getReportCompletedTrainingDates() {
  const dates = getCompletedTrainingDates();
  if (state.selectedReportMonth === "all") return dates;
  return dates.filter((date) => date.startsWith(state.selectedReportMonth));
}

function getReportScopeLabel() {
  return state.selectedReportMonth === "all"
    ? "Todos los meses cargados"
    : formatMonthLabel(state.selectedReportMonth);
}

function getPlayerPaymentReport(player, fees) {
  const expected = fees.reduce(
    (sum, fee) => sum + getExpectedFeeForPlayer(player, fee, state.players),
    0,
  );
  const approved = fees.reduce(
    (sum, fee) => sum + getPaidAmount(state.payments, player.id, fee.id),
    0,
  );
  const pendingPayments = getScopedPayments(fees, player.id).filter((payment) => payment.status === "pendiente");
  const pending = pendingPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const interest = fees.reduce((sum, fee) => {
    const feeExpected = getExpectedFeeForPlayer(player, fee, state.players);
    const feePaid = getPaidAmount(state.payments, player.id, fee.id);
    const balance = Math.max(feeExpected - feePaid, 0);
    return sum + getCurrentInterestAmount(balance, fee);
  }, 0);
  const debt = Math.max(expected + interest - approved, 0);
  const hasOverdue = fees.some((fee) => {
    const feeExpected = getExpectedFeeForPlayer(player, fee, state.players);
    const feePaid = getPaidAmount(state.payments, player.id, fee.id);
    return isFeeOverdue(fee) && feeExpected - feePaid > 0;
  });
  const status = expected <= 0 ? "sin cuota" : debt <= 0 ? "al dia" : hasOverdue ? "moroso" : "pendiente";

  return {
    expected,
    approved,
    pending,
    pendingCount: pendingPayments.length,
    interest,
    debt,
    status,
  };
}

function getScopedPayments(fees, playerId = null) {
  const feeIds = new Set(fees.map((fee) => fee.id));
  return state.payments.filter((payment) => {
    if (!feeIds.has(payment.feeId)) return false;
    if (playerId && payment.playerId !== playerId) return false;
    return !payment.deletedAt;
  });
}

function getPaymentTotalsForReport(fees) {
  const playerReports = state.players.map((player) => getPlayerPaymentReport(player, fees));
  const expected = playerReports.reduce((sum, report) => sum + report.expected, 0);
  const approved = playerReports.reduce((sum, report) => sum + report.approved, 0);
  const pending = playerReports.reduce((sum, report) => sum + report.pending, 0);
  const debt = playerReports.reduce((sum, report) => sum + report.debt, 0);
  const percent = getPaymentPercent(approved, expected);
  const totalFlow = approved + pending + debt;

  return { expected, approved, pending, debt, percent, totalFlow };
}

function getPlayerAttendanceReport(player, completedTrainingDates) {
  const records = completedTrainingDates
    .map((date) => getAttendanceForPlayerDate(player.id, date))
    .filter(Boolean);
  const countStatus = (statuses) =>
    records.filter((attendance) => statuses.includes(attendance.status)).length;

  return {
    closed: completedTrainingDates.length,
    registered: records.length,
    confirmed: countStatus(["voy", "asistio"]),
    noVoy: countStatus(["no_voy", "falto"]),
    noResponse: Math.max(completedTrainingDates.length - records.length, 0),
    lateArrival: countStatus(["llega_sobre_la_hora"]),
    lastMinuteDrops: countStatus(["baja_sobre_la_hora", "baja_sobre_hora"]),
    lateNotice: countStatus(["avisa_mas_tarde", "aviso_tarde"]),
    dinner: records.filter((attendance) => hasDinnerAttendanceTags(attendance)).length,
  };
}

function getMainResponsibilityDiscountReason(player, details, completedTrainingDates) {
  const adjustment = getResponsibilityAdjustment(player.id);
  const attendance = getPlayerAttendanceReport(player, completedTrainingDates);

  if (details.implicitAbsenceDiscount > 0) return "ausencias inferidas";
  if (attendance.lastMinuteDrops > 0 || adjustment.accumulatedLastMinuteDrops > 0) return "bajas sobre hora";
  if (attendance.noVoy > 0 || adjustment.accumulatedAbsences > 0) return "faltas/no voy";
  if (attendance.lateNotice > 0 || adjustment.accumulatedLateNotices > 0) return "avisos tarde";
  if (details.historicalDiscount > 0) return "ajuste inicial";
  return "sin descuentos";
}

function renderReportMetric(label, value) {
  return `
    <article class="metric-card compact-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderReportTable(headers, rows) {
  if (!rows.length) return '<p class="empty-state">Sin datos para mostrar.</p>';

  return `
    <div class="table-wrap report-table-wrap">
      <table class="report-table">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderReportProgressBar(percent, label) {
  const safePercent = Math.max(Math.min(Number(percent) || 0, 100), 0);
  return `
    <div class="report-progress">
      <span style="width:${safePercent}%"></span>
    </div>
    <p class="muted-detail">${escapeHtml(label)}</p>
  `;
}

function renderHorizontalBars(rows) {
  if (!rows.length) return '<p class="empty-state">Sin datos para mostrar.</p>';
  const maxValue = Math.max(...rows.map((row) => Number(row.value) || 0), 1);

  return `
    <div class="horizontal-bars">
      ${rows
        .map((row) => {
          const percent = Math.round(((Number(row.value) || 0) / maxValue) * 100);
          return `
            <div class="horizontal-bar-row">
              <span>${escapeHtml(row.label)}</span>
              <div class="report-progress"><span style="width:${percent}%"></span></div>
              <strong>${escapeHtml(row.value)}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function createEmptyReport(message) {
  return {
    text: message,
    html: `<p class="empty-state">${escapeHtml(message)}</p>`,
    message,
  };
}

function renderWhatsappReport(debts) {
  const debtByPlayerId = new Map(debts.map((debt) => [debt.player.id, debt]));
  const competitors = state.players.filter((player) => player.type === "competidor");
  const eligible = competitors
    .filter((player) => {
      const debt = debtByPlayerId.get(player.id);
      return player.status === "activo" && player.internalEnabled && !debt?.overdueFees.length;
    })
    .sort((a, b) => getResponsibilityDetails(b.id).score - getResponsibilityDetails(a.id).score);
  const called = eligible.slice(0, 10);
  const waitlist = eligible.slice(10, 12);
  const review = competitors.filter((player) => !eligible.includes(player));

  const lines = [
    "Convocatoria Maxi Basquet",
    "",
    "Citados:",
    ...formatNumberedPlayers(called, 1),
    "",
    "Lista de espera:",
    ...formatNumberedPlayers(waitlist, 11),
    "",
    "No disponibles / revisar:",
    ...review.map((player) => `- ${getPlayerName(player)}: ${getReviewReason(player, debtByPlayerId.get(player.id))}`),
  ];

  elements.whatsappReport.value = lines.join("\n");
}

function formatNumberedPlayers(players, startAt) {
  if (players.length === 0) return ["Sin jugadores para mostrar."];
  return players.map(
    (player, index) =>
      `${startAt + index}. ${getPlayerName(player)} (${getResponsibilityDetails(player.id).score} pts)`,
  );
}

function getReviewReason(player, debt) {
  const reasons = [];
  if (player.status !== "activo") reasons.push(player.status);
  if (!player.internalEnabled) reasons.push("no habilitado interno");
  if (debt?.overdueFees.length) reasons.push("moroso");
  return reasons.join(", ") || "revisar";
}

function exportBackup() {
  const backup = {
    ...createPersistedState(state),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `maxi-basquet-backup-${getTodayString()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  elements.backupMessage.textContent = "Backup exportado.";
}

function importBackupFile(file) {
  if (!file) return;

  if (!confirm("Importar un backup reemplaza los datos actuales de esta app. ¿Continuar?")) {
    elements.importBackupFile.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsedBackup = JSON.parse(String(reader.result));
      const normalizedBackup = normalizePersistedState(parsedBackup, initialAppState);
      applyPersistentState(normalizedBackup);
      savePersistedState(state);
      elements.backupMessage.textContent = "Backup importado correctamente.";
      render();
    } catch {
      elements.backupMessage.textContent = "No se pudo importar: JSON invalido.";
    } finally {
      elements.importBackupFile.value = "";
    }
  });
  reader.readAsText(file);
}

function resetSampleData() {
  if (
    !confirm(
      "Restablecer datos de prueba borra los datos actuales guardados en este navegador. ¿Continuar?",
    )
  ) {
    return;
  }

  clearPersistedState();
  applyPersistentState(createInitialAppState());
  elements.backupMessage.textContent = "Datos de prueba restablecidos.";
  render();
}

function removeSampleData() {
  if (
    !confirm(
      "Quitar datos de prueba borra Juan Perez, Martin Gomez, Diego Lopez y sus pagos/asistencias relacionados. ¿Continuar?",
    )
  ) {
    return;
  }

  const samplePlayerIds = new Set(["player-1", "player-2", "player-3"]);
  state.players = state.players.filter((player) => !samplePlayerIds.has(player.id));
  state.payments = state.payments.filter((payment) => !samplePlayerIds.has(payment.playerId));
  state.attendances = state.attendances.filter(
    (attendance) => !samplePlayerIds.has(attendance.playerId),
  );
  state.responsibilityAdjustments = state.responsibilityAdjustments.filter(
    (adjustment) => !samplePlayerIds.has(adjustment.playerId),
  );
  state.selectedSelfServicePlayerId = state.players[0]?.id ?? "";
  elements.backupMessage.textContent = "Datos de prueba quitados.";
  render();
}

function applyPersistentState(nextState) {
  const selfServiceSnapshot = getSelfServiceUiSnapshot();
  const previousPlayerFilter = state.playerFilter;
  state.players = nextState.players.map((player) => ({
    ...player,
    accessCode: player.accessCode ?? "",
    hasAccessCode:
      player.hasAccessCode === null || player.hasAccessCode === undefined
        ? Boolean(player.accessCode?.trim())
        : Boolean(player.hasAccessCode),
    hasPrivateAccessCode: Boolean(player.hasPrivateAccessCode),
  }));
  state.fees = nextState.fees.map((fee) => ({ ...fee }));
  state.payments = nextState.payments.map((payment) => ({ ...payment }));
  state.attendances = nextState.attendances.map((attendance) => ({ ...attendance }));
  state.responsibilityAdjustments = nextState.responsibilityAdjustments.map((adjustment) => ({
    ...adjustment,
  }));
  state.responsibilityConfig = { ...nextState.responsibilityConfig };
  state.attendanceConfig = {
    ...state.attendanceConfig,
    ...nextState.attendanceConfig,
    openWeekdays: {
      ...state.attendanceConfig.openWeekdays,
      ...(nextState.attendanceConfig?.openWeekdays ?? {}),
    },
  };
  if (typeof nextState.attendanceSyncReady === "boolean") {
    state.attendanceSyncReady = nextState.attendanceSyncReady;
  }
  state.treasuryConfig = { ...nextState.treasuryConfig };
  state.playerFilter = previousPlayerFilter || "todos";
  state.selectedSelfServicePlayerId =
    state.players.find((player) => player.id === selfServiceSnapshot.playerId)?.id ??
    state.players.find((player) => player.id === persistedSelfServiceSession?.playerId)?.id ??
    state.players.find((player) => player.id === initialUrlPlayerId)?.id ??
    state.selectedSelfServicePlayerId ??
    state.players[0]?.id ??
    "";
  state.selectedSelfServiceMonth = getValidSelfServiceMonth(
    selfServiceSnapshot.month || state.selectedSelfServiceMonth,
  );
  syncFormValuesFromState();
  restoreSelfServiceSession();
  restoreSelfServiceUiSnapshot(selfServiceSnapshot);
}

function syncFormValuesFromState({ forceTreasury = false } = {}) {
  if (!elements.attendanceNoveltyDate.value) {
    elements.attendanceNoveltyDate.value = getDefaultTrainingResponseDate();
  }
  if (treasuryFormDirty && !forceTreasury) return;

  elements.treasuryAlias.value = state.treasuryConfig.paymentAlias;
  elements.treasuryHolder.value = state.treasuryConfig.accountHolder;
  elements.treasuryPaymentLink.value = state.treasuryConfig.paymentLink;
  elements.treasuryPaymentTestMode.checked = Boolean(state.treasuryConfig.paymentTestMode);
  elements.treasuryInstructions.value = state.treasuryConfig.paymentInstructions;
}

function getSelfServiceUiSnapshot() {
  return {
    playerId: elements.selfServicePlayer.value || state.selectedSelfServicePlayerId,
    month: elements.selfServiceMonth.value || state.selectedSelfServiceMonth,
    paymentMethod: elements.selfPaymentMethod.value,
    paymentAmount: elements.selfPaymentAmount.value,
    paymentDate: elements.selfPaymentDate.value,
    paymentNote: elements.selfPaymentNote.value,
    activeElementId: document.activeElement?.id ?? "",
  };
}

function hasConfiguredPaymentMethod() {
  return Boolean(
    state.treasuryConfig.paymentLink?.trim() ||
      state.treasuryConfig.paymentAlias?.trim(),
  );
}

function renderSelfPaymentInstructions(payableAmount) {
  if (payableAmount <= 0 || !hasConfiguredPaymentMethod()) {
    elements.selfPaymentInstructions.hidden = true;
    elements.selfPaymentInstructions.innerHTML = "";
    return;
  }

  const alias = state.treasuryConfig.paymentAlias?.trim();
  const holder = state.treasuryConfig.accountHolder?.trim();
  const instructions = state.treasuryConfig.paymentInstructions?.trim();
  const paymentLink = state.treasuryConfig.paymentLink?.trim();
  const primaryLine = state.treasuryConfig.paymentTestMode
    ? "Modo prueba: no hagas pagos reales todavia."
    : "Paga desde Mercado Pago, banco o billetera y despues informa el pago aca.";

  elements.selfPaymentInstructions.hidden = false;
  elements.selfPaymentInstructions.innerHTML = `
    <strong>${escapeHtml(primaryLine)}</strong>
    ${alias ? `<span>Alias: <b>${escapeHtml(alias)}</b></span>` : ""}
    ${holder ? `<span>Titular: ${escapeHtml(holder)}</span>` : ""}
    ${paymentLink ? "<span>El boton Pagar abre el medio de pago configurado.</span>" : ""}
    ${instructions ? `<span>${escapeHtml(instructions)}</span>` : ""}
  `;
}

function renderSelfPaymentAlert(payment, pendingAmount, expectedAmount, payableAmount, fee) {
  if (expectedAmount <= 0) {
    elements.selfPaymentAlert.hidden = true;
    elements.selfPaymentAlert.innerHTML = "";
    return;
  }

  const monthLabel = fee ? formatMonthLabel(fee.month) : "este mes";
  let className = "pending";
  let title = "Tenes pendiente esta cuota";
  let detail = `Para ${monthLabel}, primero paga y despues informa el pago con monto, fecha y observacion.`;

  if (pendingAmount > 0 || payment?.status === "pendiente") {
    className = "pending";
    title = "Ya informaste un pago";
    detail =
      `Tu pago de ${monthLabel} esta pendiente de validacion. No hace falta cargarlo otra vez; si hay un error, avisale al administrador.`;
  } else if (payment?.status === "aprobado" || payableAmount <= 0) {
    className = "approved";
    title = "Pago confirmado";
    detail = `Tu pago de ${monthLabel} ya fue aprobado.`;
  } else if (payment?.status === "rechazado") {
    className = "rejected";
    title = "Pago rechazado";
    detail = "Revisa el dato con el administrador y volve a informar el pago si corresponde.";
  }

  elements.selfPaymentAlert.hidden = false;
  elements.selfPaymentAlert.className = `self-payment-alert ${className}`;
  elements.selfPaymentAlert.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(detail)}</span>
  `;
}

function renderSelfTrainingSignup(player) {
  const session = getOpenTrainingSession();
  if (!isBillablePlayer(player)) {
    renderSelfTrainingUnavailable(
      "Entrenamientos",
      "Este jugador no participa de los listados de entrenamiento.",
    );
    return;
  }

  if (isSupabaseEnabled() && !state.attendanceSyncReady) {
    renderSelfTrainingUnavailable(
      "Entrenamientos",
      "La asistencia todavia no esta disponible en este dispositivo. Volve a abrir la app en unos minutos.",
    );
    return;
  }

  if (!session) {
    renderSelfTrainingUnavailable(
      "Entrenamientos",
      "No hay listado temporal abierto en este momento.",
    );
    return;
  }

  const sessionAttendances = getAttendancesForDate(session.date);
  const currentAttendance = getAttendanceForPlayerDate(player.id, session.date);
  const isDinnerDay = isDinnerTrainingDate(session.date);
  const visibleAttendances = sessionAttendances.filter((attendance) =>
    ["voy", "avisa_mas_tarde", "llega_sobre_la_hora"].includes(attendance.status),
  );
  const dinnerAttendances = sessionAttendances.filter((attendance) =>
    isDinnerDay && hasDinnerAttendanceTags(attendance),
  );
  const activePlayers = state.players.filter((item) => item.status === "activo");
  const respondedPlayerIds = new Set(sessionAttendances.map((attendance) => attendance.playerId));
  const noResponsePlayers = activePlayers.filter((item) => !respondedPlayerIds.has(item.id));
  const missingCount = Math.max(
    (Number(state.attendanceConfig.trainingMinimumPlayers) || 10) - visibleAttendances.length,
    0,
  );

  elements.selfTrainingCard.hidden = false;
  elements.selfTrainingActions.hidden = false;
  elements.selfTrainingLists.hidden = false;
  elements.selfTrainingGuestForm.hidden = !state.isAdminMode;
  elements.selfTrainingTitle.textContent = `${formatTrainingDateLabel(session.date)} - listado temporal`;
  elements.selfTrainingWindow.textContent =
    `Abierto hasta ${state.attendanceConfig.closeAt}. Minimo sugerido: ${state.attendanceConfig.trainingMinimumPlayers}.`;
  elements.selfTrainingNoResponseTitle.textContent =
    `${state.attendanceConfig.publicNoResponseLabel ?? "No me interesa"} (${noResponsePlayers.length})`;
  elements.selfTrainingMainTitle.textContent = `Listado (${visibleAttendances.length})`;
  elements.selfTrainingDinnerTitle.textContent = `Cena (${dinnerAttendances.length})`;
  elements.selfTrainingDinnerPanel.hidden = !isDinnerDay;
  elements.selfTrainingMainList.innerHTML = renderTrainingListItems(
    visibleAttendances.map((attendance) => ({
      id: attendance.id,
      name: getAttendanceDisplayName(attendance),
      suffix: getAttendancePublicSuffix(attendance),
      tags: getAttendanceTags(attendance),
      removable: state.isAdminMode && isGuestAttendance(attendance),
    })),
  );
  elements.selfTrainingDinnerList.innerHTML = renderTrainingListItems(
    dinnerAttendances.map((attendance) => ({
      id: attendance.id,
      name: getAttendanceDisplayName(attendance),
      suffix: getDinnerAttendanceSuffix(attendance),
      tags: getAttendanceTags(attendance),
      removable: state.isAdminMode && isGuestAttendance(attendance),
    })),
  );
  elements.selfTrainingNoResponseList.innerHTML = renderTrainingListItems(
    noResponsePlayers.map((item) => ({ name: getPlayerName(item), suffix: "", tags: [] })),
  );

  elements.selfTrainingMessage.textContent =
    missingCount > 0
      ? `Anotados: ${visibleAttendances.length}. Faltan ${missingCount} para llegar a ${state.attendanceConfig.trainingMinimumPlayers}.`
      : `Anotados: ${visibleAttendances.length}. Ya llegan al minimo sugerido.`;

  document
    .querySelectorAll("[data-self-training-status]")
    .forEach((button) => {
      const status = button.dataset.selfTrainingStatus;
      const isDinnerOnly = button.dataset.selfTrainingDinnerOnly === "true";
      const hasDinnerTags = hasDinnerAttendanceTags(currentAttendance);
      const isLastMinuteDrop = status === "baja_sobre_la_hora";
      const canDrop =
        isLastMinuteDrop &&
        isLastMinuteDropWindow(session) &&
        currentAttendance &&
        currentAttendance.status !== "no_voy" &&
        currentAttendance.status !== "baja_sobre_la_hora";

      button.hidden = (isLastMinuteDrop && !canDrop) || (isDinnerOnly && !isDinnerDay);
      let isActive = currentAttendance?.status === status;
      if (status === "no_voy") {
        isActive = isActive && (isDinnerOnly ? hasDinnerTags : !hasDinnerTags);
      }
      button.classList.toggle("active", isActive);
    });

  elements.selfTrainingLists.querySelectorAll("[data-delete-guest-attendance]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteGuestAttendance(button.dataset.deleteGuestAttendance);
    });
  });

  renderTrainingTagButtons(currentAttendance, isDinnerDay);
}

function renderSelfTrainingUnavailable(title, message) {
  elements.selfTrainingCard.hidden = false;
  elements.selfTrainingActions.hidden = true;
  elements.selfTrainingTags.hidden = true;
  elements.selfTrainingGuestForm.hidden = true;
  elements.selfTrainingLists.hidden = true;
  elements.selfTrainingTitle.textContent = title;
  elements.selfTrainingWindow.textContent = "";
  elements.selfTrainingMessage.textContent = message;
  elements.selfTrainingMainTitle.textContent = "Listado";
  elements.selfTrainingDinnerTitle.textContent = "Cena";
  elements.selfTrainingMainList.innerHTML = "";
  elements.selfTrainingDinnerPanel.hidden = true;
  elements.selfTrainingDinnerList.innerHTML = "";
  elements.selfTrainingNoResponseList.innerHTML = "";
}

function renderTrainingListItems(items) {
  if (!items.length) return '<li class="muted-detail">Sin jugadores.</li>';

  return items
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)}${formatAttendanceTags(item.tags)}${item.suffix ? ` <span class="muted-detail">(${escapeHtml(item.suffix)})</span>` : ""}${item.removable ? ` <button class="secondary-button danger-button guest-remove-button" type="button" data-delete-guest-attendance="${item.id}">Quitar</button>` : ""}</li>`,
    )
    .join("");
}

function getPublicAttendanceSuffix(status) {
  const labels = {
    avisa_mas_tarde: "avisa mas tarde",
    llega_sobre_la_hora: "llega sobre la hora",
  };

  return labels[status] ?? "";
}

function getAttendancePublicSuffix(attendance) {
  const suffix = getPublicAttendanceSuffix(attendance.status);
  if (!isGuestAttendance(attendance)) return suffix;
  return suffix ? `invitado, ${suffix}` : "invitado";
}

function getDinnerAttendanceSuffix(attendance) {
  const suffix = attendance.status === "no_voy" ? "solo cena" : "";
  if (!isGuestAttendance(attendance)) return suffix;
  return suffix ? `invitado, ${suffix}` : "invitado";
}

function isDinnerTrainingDate(dateValue) {
  return parseDateInputValue(dateValue)?.getDay() === 4;
}

function renderTrainingTagButtons(currentAttendance, isDinnerDay) {
  elements.selfTrainingTags.hidden = !isDinnerDay;
  if (!isDinnerDay) return;

  const currentTags = new Set(getAttendanceTags(currentAttendance));
  const hasAnswered = Boolean(currentAttendance);

  elements.selfTrainingTags.querySelectorAll("[data-self-training-tag]").forEach((button) => {
    button.disabled = !hasAnswered;
    button.classList.toggle("active", currentTags.has(button.dataset.selfTrainingTag));
  });
}

async function submitSelfTrainingStatus(status, options = {}) {
  const player = state.players.find((item) => item.id === state.selectedSelfServicePlayerId);
  const session = getOpenTrainingSession();
  if (!player || !canViewSelfServicePlayer(player)) {
    elements.selfTrainingMessage.textContent = "Ingresa tu codigo antes de responder.";
    return;
  }

  if (!session) {
    elements.selfTrainingMessage.textContent = "No hay listado abierto en este momento.";
    return;
  }

  if (options.dinnerOnly && !isDinnerTrainingDate(session.date)) {
    elements.selfTrainingMessage.textContent = "Solo cena se usa en entrenamientos de jueves.";
    return;
  }

  if (status === "baja_sobre_la_hora" && !isLastMinuteDropWindow(session)) {
    elements.selfTrainingMessage.textContent =
      `Baja sobre la hora se habilita desde ${state.attendanceConfig.lastMinuteDropStartsAt}.`;
    return;
  }

  const existingAttendance = getAttendanceForPlayerDate(player.id, session.date);
  const nextTags = getNextAttendanceTags(existingAttendance, status, options);
  const attendance = {
    id: existingAttendance?.id ?? createId("attendance"),
    date: session.date,
    eventType: "entrenamiento",
    playerId: player.id,
    status,
    source: serializeAttendanceSource("jugador", nextTags),
    createdAt: existingAttendance?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const saved = await persistAttendance(
    attendance,
    "Respuesta guardada",
    "Error al guardar respuesta",
    { admin: state.isAdminMode },
  );

  elements.selfTrainingMessage.textContent = saved
    ? `Respuesta guardada: ${options.dinnerOnly ? "Solo cena" : formatAttendanceStatus(status)}.`
    : state.syncStatus;
}

async function addTrainingGuest() {
  if (!requireAdmin()) return;

  const session = getOpenTrainingSession();
  const guestName = normalizeGuestName(elements.selfTrainingGuestName.value);

  if (!session) {
    elements.selfTrainingMessage.textContent = "No hay listado abierto para agregar invitados.";
    return;
  }

  if (!guestName) {
    elements.selfTrainingMessage.textContent = "Escribi el nombre del invitado.";
    return;
  }

  const guestPlayerId = createGuestPlayerId(session.date, guestName);
  const existingAttendance = getAttendanceForPlayerDate(guestPlayerId, session.date);
  const attendance = {
    id: existingAttendance?.id ?? createId("attendance"),
    date: session.date,
    eventType: "entrenamiento",
    playerId: guestPlayerId,
    status: "voy",
    source: serializeGuestAttendanceSource(guestName),
    participantType: "guest",
    guestName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await persistAttendance(
    attendance,
    "Invitado agregado",
    "Error al agregar invitado",
    { admin: true },
  );

  if (saved) {
    elements.selfTrainingGuestName.value = "";
    elements.selfTrainingMessage.textContent = `${guestName} agregado como invitado.`;
  } else {
    elements.selfTrainingMessage.textContent = state.syncStatus;
  }
}

async function deleteGuestAttendance(attendanceId) {
  if (!requireAdmin()) return;

  const attendance = state.attendances.find((item) => item.id === attendanceId);
  if (!attendance || !isGuestAttendance(attendance)) {
    elements.selfTrainingMessage.textContent = "Solo se pueden quitar invitados desde esta accion.";
    return;
  }

  const guestName = getAttendanceDisplayName(attendance);
  if (!confirm(`Quitar a ${guestName} del listado temporal?`)) return;

  const previousAttendances = state.attendances;
  state.attendances = state.attendances.filter((item) => item.id !== attendanceId);

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = "Quitando invitado...";
    renderRoleVisibility();

    try {
      const mutationResult = await adminDeleteGuestAttendance(adminConfig.pin, attendance);
      state.syncStatus = getPaymentMutationMessage("Invitado quitado", mutationResult);
    } catch (error) {
      state.attendances = previousAttendances;
      state.syncStatus = `Error al quitar invitado: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = "Invitado quitado localmente";
  }

  suppressNextSupabaseSync = true;
  render();
  elements.selfTrainingMessage.textContent = `${guestName} quitado del listado.`;
}

async function toggleSelfTrainingTag(tag) {
  const player = state.players.find((item) => item.id === state.selectedSelfServicePlayerId);
  const session = getOpenTrainingSession();
  if (!player || !canViewSelfServicePlayer(player)) {
    elements.selfTrainingMessage.textContent = "Ingresa tu codigo antes de usar emoticones.";
    return;
  }

  if (!session) {
    elements.selfTrainingMessage.textContent = "No hay listado abierto en este momento.";
    return;
  }

  if (!isDinnerTrainingDate(session.date)) {
    elements.selfTrainingMessage.textContent =
      "Los emoticones de cena se usan en entrenamientos de jueves.";
    return;
  }

  const existingAttendance = getAttendanceForPlayerDate(player.id, session.date);
  if (!existingAttendance) {
    elements.selfTrainingMessage.textContent =
      "Primero marca tu respuesta y despues agrega emoticones.";
    return;
  }

  const nextTags = toggleAttendanceTag(existingAttendance, tag);
  const sourceBase = state.isAdminMode ? getAttendanceBaseSource(existingAttendance) : "jugador";
  const saved = await persistAttendance(
    {
      ...existingAttendance,
      source: serializeAttendanceSource(sourceBase, nextTags),
      updatedAt: new Date().toISOString(),
    },
    "Emoticon guardado",
    "Error al guardar emoticon",
    { admin: state.isAdminMode },
  );

  elements.selfTrainingMessage.textContent = saved
    ? `Emoticones: ${formatAttendanceTags(nextTags) || "sin emoticones"}.`
    : state.syncStatus;
}

async function persistAttendance(attendance, successMessage, errorMessage, options = {}) {
  const previousAttendances = state.attendances;
  state.attendances = upsertAttendanceInList(state.attendances, attendance);

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = `${successMessage}...`;
    renderRoleVisibility();

    try {
      const mutationResult = options.admin
        ? await adminUpsertAttendance(adminConfig.pin, attendance)
        : await submitTrainingAttendance(
            attendance.playerId,
            selfServiceAccessCodesByPlayerId.get(attendance.playerId) ?? "",
            attendance,
          );
      state.syncStatus = getPaymentMutationMessage(successMessage, mutationResult);
    } catch (error) {
      state.attendances = previousAttendances;
      state.syncStatus = `${errorMessage}: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return false;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = `${successMessage} localmente`;
  }

  suppressNextSupabaseSync = true;
  render();
  return true;
}

function upsertAttendanceInList(attendances, attendance) {
  const exists = attendances.some(
    (item) =>
      item.date === attendance.date &&
      item.playerId === attendance.playerId &&
      (item.eventType ?? "entrenamiento") === (attendance.eventType ?? "entrenamiento"),
  );

  if (!exists) return [attendance, ...attendances];

  return attendances.map((item) =>
    item.date === attendance.date &&
    item.playerId === attendance.playerId &&
    (item.eventType ?? "entrenamiento") === (attendance.eventType ?? "entrenamiento")
      ? { ...item, ...attendance }
      : item,
  );
}

function restoreSelfServiceUiSnapshot(snapshot) {
  state.selectedSelfServicePlayerId =
    state.players.find((player) => player.id === snapshot.playerId)?.id ??
    state.players.find((player) => player.id === persistedSelfServiceSession?.playerId)?.id ??
    state.selectedSelfServicePlayerId;
  state.selectedSelfServiceMonth = getValidSelfServiceMonth(snapshot.month);
  elements.selfPaymentMethod.value = snapshot.paymentMethod || elements.selfPaymentMethod.value;
  elements.selfPaymentAmount.value = snapshot.paymentAmount;
  elements.selfPaymentDate.value = snapshot.paymentDate || elements.selfPaymentDate.value;
  elements.selfPaymentNote.value = snapshot.paymentNote;

  if (snapshot.activeElementId) {
    const activeElement = document.getElementById(snapshot.activeElementId);
    if (activeElement) activeElement.focus();
  }
}

function importBulkPlayers(rawValue) {
  const existingNames = new Set(
    state.players.flatMap((player) => [
      normalizePlayerName(getPlayerName(player)),
      normalizePlayerName(`${player.firstName ?? ""} ${player.lastName ?? ""}`.trim()),
    ]),
  );
  const records = getBulkPlayerRecords(rawValue);
  const result = {
    imported: 0,
    ignored: 0,
    duplicates: 0,
    errors: 0,
  };
  const newPlayers = [];

  records.forEach((record) => {
    const parsedRecord = parseBulkPlayerRecord(record);
    const name = parsedRecord.name;

    if (!name || normalizePlayerName(name) === "nombre") {
      result.ignored += 1;
      return;
    }

    const normalizedName = normalizePlayerName(name);
    if (existingNames.has(normalizedName)) {
      result.duplicates += 1;
      return;
    }

    const type = parsedRecord.type;
    const status = parsedRecord.status;
    const phone = parsedRecord.phone;
    const internalEnabled = parsedRecord.internalEnabled;
    const responsibilityScore = parsedRecord.responsibilityScore;
    const accessCode = parsedRecord.accessCode;

    if (!type || !status || internalEnabled === null) {
      result.errors += 1;
      return;
    }

    existingNames.add(normalizedName);
    newPlayers.push({
      id: createId("player"),
      firstName: name,
      lastName: "",
      phone,
      type,
      status,
      internalEnabled,
      responsibilityScore,
      accessCode,
      hasAccessCode: Boolean(accessCode),
      hasPrivateAccessCode: true,
    });
    result.imported += 1;
  });

  state.players = [...state.players, ...newPlayers];
  return result;
}

function getBulkPlayerRecords(rawValue) {
  const rows = rawValue
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const hasSpreadsheetRows = rows.some((row) => row.includes("\t") || row.includes("|") || row.includes(","));

  return hasSpreadsheetRows ? rows : buildBulkPlayerRecords(rawValue);
}

function buildBulkPlayerRecords(rawValue) {
  const lines = rawValue
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const records = [];
  let pending = "";

  lines.forEach((line) => {
    const lineRecord = parseBulkPlayerRecord(line);

    if (lineRecord.name && lineRecord.type && lineRecord.status) {
      if (pending) {
        records.push(pending);
        pending = "";
      }
      records.push(line);
      return;
    }

    if (pending && isLikelyNameOnly(line)) {
      records.push(`${pending} ${line}`);
      pending = "";
      return;
    }

    const nextPending = [pending, line].filter(Boolean).join(" ");
    const parsedRecord = parseBulkPlayerRecord(nextPending);

    if (parsedRecord.name && parsedRecord.type && parsedRecord.status) {
      records.push(nextPending);
      pending = "";
      return;
    }

    if (pending) records.push(pending);
    pending = line;
  });

  if (pending) records.push(pending);
  return records;
}

function parseBulkPlayerRecord(record) {
  const columns = splitBulkPlayerRow(record);
  const hasDelimitedColumns = columns.length > 1;

  if (hasDelimitedColumns) {
    const name = columns[0]?.trim() ?? "";
    const type = normalizePlayerType(columns[1]);
    const status = normalizePlayerStatus(columns[2]);
    const internalEnabled = columns[4]?.trim()
      ? normalizeYesNo(columns[4])
      : defaultInternalEnabled(status);
    return {
      name,
      type,
      status,
      phone: columns[3]?.trim() ?? "",
      internalEnabled,
      responsibilityScore: Number(columns[5]) || 0,
      accessCode: columns[6]?.trim() ?? "",
    };
  }

  return parseLooseBulkPlayerRecord(record);
}

function splitBulkPlayerRow(row) {
  if (row.includes("|")) return row.split("|").map((column) => column.trim());
  if (row.includes("\t")) return row.split("\t").map((column) => column.trim());
  if (row.includes(";")) return row.split(";").map((column) => column.trim());
  if (row.includes(",") && row.split(",").length >= 3) {
    return row.split(",").map((column) => column.trim());
  }
  return [row.trim()];
}

function parseLooseBulkPlayerRecord(record) {
  const words = record.split(/\s+/).filter(Boolean);
  const normalizedWords = words.map(normalizePlayerName);
  const typeMatch = findLooseType(normalizedWords);
  const statusMatch = findLooseStatus(normalizedWords);

  if (!typeMatch || !statusMatch) {
    return {
      name: "",
      type: null,
      status: null,
      phone: "",
      internalEnabled: null,
      responsibilityScore: 0,
      accessCode: "",
    };
  }

  const excludedIndexes = new Set([...typeMatch.indexes, ...statusMatch.indexes]);
  const name = words.filter((_, index) => !excludedIndexes.has(index)).join(" ").trim();

  return {
    name,
    type: typeMatch.value,
    status: statusMatch.value,
    phone: "",
    internalEnabled: defaultInternalEnabled(statusMatch.value),
    responsibilityScore: 0,
    accessCode: "",
  };
}

function isLikelyNameOnly(value) {
  const normalizedValue = normalizePlayerName(value);
  const words = normalizedValue.split(" ").filter(Boolean);

  return (
    words.length >= 2 &&
    !findLooseType(words) &&
    !findLooseStatus(words) &&
    !normalizeYesNo(normalizedValue)
  );
}

function findLooseType(normalizedWords) {
  for (let index = 0; index < normalizedWords.length; index += 1) {
    const oneWord = normalizedWords[index];
    const twoWords = `${normalizedWords[index]} ${normalizedWords[index + 1] ?? ""}`.trim();

    if (normalizePlayerType(oneWord)) {
      return { value: normalizePlayerType(oneWord), indexes: [index] };
    }

    if (normalizePlayerType(twoWords)) {
      return { value: normalizePlayerType(twoWords), indexes: [index, index + 1] };
    }
  }

  return null;
}

function findLooseStatus(normalizedWords) {
  for (let index = 0; index < normalizedWords.length; index += 1) {
    const oneWord = normalizedWords[index];
    const twoWords = `${normalizedWords[index]} ${normalizedWords[index + 1] ?? ""}`.trim();
    const threeWords = `${normalizedWords[index]} ${normalizedWords[index + 1] ?? ""} ${normalizedWords[index + 2] ?? ""}`.trim();

    if (normalizePlayerStatus(oneWord)) {
      return { value: normalizePlayerStatus(oneWord), indexes: [index] };
    }

    if (normalizePlayerStatus(twoWords)) {
      return { value: normalizePlayerStatus(twoWords), indexes: [index, index + 1] };
    }

    if (normalizePlayerStatus(threeWords)) {
      return { value: normalizePlayerStatus(threeWords), indexes: [index, index + 1, index + 2] };
    }
  }

  return null;
}

function defaultInternalEnabled(status) {
  return status === "activo";
}

function normalizePlayerName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizePlayerType(value) {
  const normalized = normalizePlayerName(value ?? "");
  if (["competidor", "competencia", "compite", "c"].includes(normalized)) return "competidor";
  if (
    [
      "solo_entrenamientos",
      "solo entrenamientos",
      "entrenamiento",
      "entrenamientos",
      "solo entrenamiento",
      "e",
    ].includes(normalized)
  ) {
    return "solo_entrenamientos";
  }

  return null;
}

function normalizePlayerStatus(value) {
  const normalized = normalizePlayerName(value ?? "");
  if (["activo", "activa", "a"].includes(normalized)) return "activo";
  if (["lesionado", "lesion", "l"].includes(normalized)) return "lesionado";
  if (
    [
      "lista_espera",
      "lista espera",
      "en espera",
      "espera",
      "lista de espera",
      "le",
    ].includes(normalized)
  ) {
    return "lista_espera";
  }
  if (["esporadico", "esporadica", "eventual", "viene a veces", "e"].includes(normalized)) {
    return "esporadico";
  }
  if (["baja", "b"].includes(normalized)) return "baja";
  return null;
}

function normalizeYesNo(value) {
  const normalized = normalizePlayerName(value ?? "");
  if (["si", "s", "true", "1", "habilitado", "habilitado interno"].includes(normalized)) {
    return true;
  }
  if (["no", "n", "false", "0", "no habilitado"].includes(normalized)) return false;
  return null;
}

function getUrlPlayerId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("player") || params.get("id") || "";
}

function loadSelfServiceSession() {
  try {
    const rawSession = localStorage.getItem(SELF_SERVICE_SESSION_KEY);
    if (!rawSession) return null;

    const session = JSON.parse(rawSession);
    if (!session || typeof session !== "object") return null;

    return {
      playerId: String(session.playerId ?? ""),
      accessCode: String(session.accessCode ?? ""),
    };
  } catch {
    return null;
  }
}

function saveSelfServiceSession(playerId, accessCode) {
  localStorage.setItem(
    SELF_SERVICE_SESSION_KEY,
    JSON.stringify({
      playerId,
      accessCode,
      savedAt: new Date().toISOString(),
    }),
  );
}

function restoreSelfServiceSession() {
  if (!persistedSelfServiceSession?.playerId || !persistedSelfServiceSession?.accessCode) return;

  const player = state.players.find((item) => item.id === persistedSelfServiceSession.playerId);
  if (!player) return;

  authorizedSelfServicePlayerIds.add(player.id);
  selfServiceAccessCodesByPlayerId.set(player.id, persistedSelfServiceSession.accessCode);
}

function canViewSelfServicePlayer(player) {
  return state.isAdminMode || authorizedSelfServicePlayerIds.has(player.id);
}

function playerHasAccessCode(player) {
  return Boolean(player.accessCode?.trim()) || Boolean(player.hasAccessCode);
}

async function authorizeSelfServicePlayer() {
  const player = state.players.find((item) => item.id === state.selectedSelfServicePlayerId);
  const accessCode = elements.selfAccessCode.value.trim();

  if (!player) return;

  if (!playerHasAccessCode(player)) {
    elements.selfAccessMessage.textContent = "Este jugador todavia no tiene codigo asignado.";
    return;
  }

  if (!accessCode) {
    elements.selfAccessMessage.textContent = "Ingresa tu codigo.";
    return;
  }

  if (isSupabaseEnabled() && supabaseHydrated) {
    elements.selfAccessMessage.textContent = "Validando codigo...";

    try {
      const isValid = await validatePlayerAccess(player.id, accessCode);
      if (!isValid) {
        elements.selfAccessMessage.textContent = "Codigo incorrecto.";
        return;
      }
    } catch (error) {
      elements.selfAccessMessage.textContent = `No se pudo validar codigo: ${error.message}`;
      return;
    }
  } else if (accessCode !== player.accessCode?.trim()) {
    elements.selfAccessMessage.textContent = "Codigo incorrecto.";
    return;
  }

  authorizedSelfServicePlayerIds.add(player.id);
  selfServiceAccessCodesByPlayerId.set(player.id, accessCode);
  saveSelfServiceSession(player.id, accessCode);
  elements.selfAccessCode.value = "";
  elements.selfAccessMessage.textContent = "Acceso habilitado.";
  renderSelfService();
}

async function enterAdmin(pin) {
  if (pin !== adminConfig.pin) {
    elements.adminModeStatus.textContent = "PIN incorrecto.";
    return;
  }

  state.isAdminMode = true;
  state.isAdminLoginVisible = false;
  elements.adminPin.value = "";
  elements.adminModeStatus.textContent = "Modo admin activo.";
  state.syncStatus = "Modo admin activo.";

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = "Cargando datos de admin...";
    renderRoleVisibility();

    try {
      const remoteState = await loadSupabaseState(createPersistedState(state), {
        adminPin: adminConfig.pin,
      });
      applyPersistentState(remoteState);
      state.syncStatus = "Modo admin activo.";
    } catch (error) {
      state.syncStatus = `Error al cargar datos de admin: ${error.message}`;
    } finally {
      supabaseSyncInProgress = false;
    }
  }

  suppressNextSupabaseSync = true;
  render();
}

function exitAdmin() {
  state.isAdminMode = false;
  state.isAdminLoginVisible = false;
  if (isSupabaseEnabled()) {
    state.players = state.players.map((player) => ({
      ...player,
      accessCode: "",
      hasPrivateAccessCode: false,
    }));
  }
  elements.adminModeStatus.textContent = "";
  suppressNextSupabaseSync = true;
  render();
}

function renderRoleVisibility() {
  elements.playerView.hidden = false;
  elements.adminView.hidden = !state.isAdminMode;
  elements.adminSummary.hidden = !state.isAdminMode;
  elements.adminLoginBox.hidden = state.isAdminMode || !state.isAdminLoginVisible;
  elements.showAdminLoginButton.hidden = state.isAdminMode;
  elements.adminLogoutButton.hidden = !state.isAdminMode;
  elements.backToPlayerViewButton.hidden = !state.isAdminMode;
  renderAdminTabs();
  if (state.syncStatus) elements.adminModeStatus.textContent = state.syncStatus;
}

function requireAdmin() {
  if (!state.isAdminMode) {
    alert("Accion solo disponible en modo administrador");
    return false;
  }

  return true;
}

async function reviewPayment(paymentId, status) {
  if (!requireAdmin()) return;

  const previousPayments = state.payments;
  const actionLabel = status === "aprobado" ? "aprobar" : "rechazar";
  const resultLabel = status === "aprobado" ? "aprobado" : "rechazado";
  state.payments = state.payments.map((payment) =>
    payment.id === paymentId
      ? {
          ...payment,
          status,
          reviewedAt: new Date().toISOString(),
          reviewedBy: "admin",
        }
      : payment,
  );

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = status === "aprobado" ? "Aprobando pago..." : "Rechazando pago...";
    renderRoleVisibility();

    try {
      const mutationResult = await adminReviewPayment(adminConfig.pin, paymentId, status);
      state.syncStatus = getPaymentMutationMessage(`Pago ${resultLabel}`, mutationResult);
    } catch (error) {
      state.payments = previousPayments;
      state.syncStatus = `Error al ${actionLabel} pago: ${error.message}`;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = `Pago ${resultLabel} localmente`;
  }

  suppressNextSupabaseSync = true;
  render();
}

async function deletePayment(paymentId) {
  if (!requireAdmin()) return;
  if (!confirm("Eliminar este pago de prueba? Esta accion recalcula la deuda.")) return;

  await removePayments([paymentId]);
}

async function removePayments(paymentIds) {
  const previousPayments = state.payments;
  state.payments = state.payments.filter((payment) => !paymentIds.includes(payment.id));

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = paymentIds.length > 1 ? "Eliminando pagos..." : "Eliminando pago...";
    renderRoleVisibility();

    try {
      const mutationResults = await Promise.all(
        paymentIds.map((paymentId) => adminSoftDeletePayment(adminConfig.pin, paymentId)),
      );
      state.syncStatus = getPaymentMutationMessage(
        paymentIds.length > 1 ? "Pagos eliminados" : "Pago eliminado",
        getCombinedMutationResult(mutationResults),
      );
    } catch (error) {
      state.payments = previousPayments;
      state.syncStatus = `Error al eliminar pago: ${error.message}`;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = paymentIds.length > 1 ? "Pagos eliminados localmente" : "Pago eliminado localmente";
  }

  suppressNextSupabaseSync = true;
  render();
}

async function persistAdminPlayers(players, previousPlayers, successMessage, errorMessage) {
  if (!players.length) return true;

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = `${successMessage}...`;
    renderRoleVisibility();

    try {
      const mutationResults = await Promise.all(
        players.map((player) => adminUpsertPlayer(adminConfig.pin, player)),
      );
      state.syncStatus = getPaymentMutationMessage(
        successMessage,
        getCombinedMutationResult(mutationResults),
      );
    } catch (error) {
      state.players = previousPlayers;
      state.syncStatus = `${errorMessage}: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return false;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = `${successMessage} localmente`;
  }

  suppressNextSupabaseSync = true;
  render();
  return true;
}

async function updateAttendanceStatus(attendanceId, status) {
  if (!requireAdmin()) return;

  const attendance = state.attendances.find((item) => item.id === attendanceId);
  if (!attendance) return;

  await persistAttendance(
    { ...attendance, status, source: attendance.source ?? "admin", updatedAt: new Date().toISOString() },
    "Asistencia actualizada",
    "Error al actualizar asistencia",
    { admin: true },
  );
}

async function toggleInternalEnabled(playerId) {
  if (!requireAdmin()) return;

  const previousPlayers = state.players;
  let updatedPlayer = null;
  state.players = state.players.map((player) =>
    player.id === playerId
      ? (updatedPlayer = { ...player, internalEnabled: !player.internalEnabled })
      : player,
  );

  if (!updatedPlayer) return;
  await persistAdminPlayers(
    [updatedPlayer],
    previousPlayers,
    "Jugador actualizado",
    "Error al actualizar jugador",
  );
}

async function updatePlayerStatus(playerId, status) {
  if (!requireAdmin()) return;

  const previousPlayers = state.players;
  let updatedPlayer = null;
  state.players = state.players.map((player) =>
    player.id === playerId
      ? (updatedPlayer = { ...player, status })
      : player,
  );

  if (!updatedPlayer) return;
  await persistAdminPlayers(
    [updatedPlayer],
    previousPlayers,
    "Estado de jugador actualizado",
    "Error al actualizar estado",
  );
}

async function updatePlayerAccessCode(playerId, value) {
  if (!requireAdmin()) return;

  const accessCode = value.trim();
  const previousPlayers = state.players;
  let updatedPlayer = null;
  state.players = state.players.map((player) =>
    player.id === playerId
      ? (updatedPlayer = {
          ...player,
          accessCode,
          hasAccessCode: Boolean(accessCode),
          hasPrivateAccessCode: true,
        })
      : player,
  );

  if (!updatedPlayer) return;
  await persistAdminPlayers(
    [updatedPlayer],
    previousPlayers,
    "Codigo actualizado",
    "Error al actualizar codigo",
  );
}

async function persistFee(fee, previousFees, successMessage, errorMessage) {
  state.fees = [...previousFees.filter((item) => item.id !== fee.id), fee].sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = `${successMessage}...`;
    renderRoleVisibility();

    try {
      const mutationResult = await adminUpsertFee(adminConfig.pin, fee);
      state.syncStatus = getPaymentMutationMessage(successMessage, mutationResult);
    } catch (error) {
      state.fees = previousFees;
      state.syncStatus = `${errorMessage}: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return false;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = `${successMessage} localmente`;
  }

  suppressNextSupabaseSync = true;
  render();
  return true;
}

function updateResponsibilityAdjustment(playerId, field, value) {
  if (!requireAdmin()) return;

  const existingAdjustment = getResponsibilityAdjustment(playerId);
  const nextValue = field === "observation" ? value : Math.max(Number(value) || 0, 0);
  const nextAdjustment = {
    ...existingAdjustment,
    [field]: nextValue,
    updatedAt: new Date().toISOString(),
  };

  const exists = state.responsibilityAdjustments.some((item) => item.playerId === playerId);
  state.responsibilityAdjustments = exists
    ? state.responsibilityAdjustments.map((item) =>
        item.playerId === playerId ? nextAdjustment : item,
      )
    : [...state.responsibilityAdjustments, nextAdjustment];

  render();
}

async function updateFeeBillingBase(feeId, field, value) {
  if (!requireAdmin()) return;

  const nextValue = Number(value) > 0 ? Number(value) : null;
  const previousFees = state.fees;
  let updatedFee = null;
  state.fees = state.fees.map((fee) =>
    fee.id === feeId
      ? (updatedFee = {
          ...fee,
          [field]: nextValue,
        })
      : fee,
  );

  if (!updatedFee) return;

  if (isSupabaseEnabled() && supabaseHydrated) {
    supabaseSyncInProgress = true;
    state.syncStatus = "Actualizando cuota...";
    renderRoleVisibility();

    try {
      const mutationResult = await adminUpsertFee(adminConfig.pin, updatedFee);
      state.syncStatus = getPaymentMutationMessage("Cuota actualizada", mutationResult);
    } catch (error) {
      state.fees = previousFees;
      state.syncStatus = `Error al actualizar cuota: ${error.message}`;
      supabaseSyncInProgress = false;
      suppressNextSupabaseSync = true;
      render();
      return;
    } finally {
      supabaseSyncInProgress = false;
    }
  } else {
    state.syncStatus = "Cuota actualizada localmente";
  }

  suppressNextSupabaseSync = true;
  render();
}

function formatPlayerType(type) {
  return type === "competidor" ? "Competidor" : "Solo entrenamientos";
}

function formatPlayerStatus(status) {
  const labels = {
    activo: "Activo",
    lesionado: "Lesionado",
    lista_espera: "Lista de espera",
    esporadico: "Esporadico",
    baja: "Baja",
  };

  return labels[status] ?? status;
}

function renderPlayerStatusOptions(selectedStatus) {
  return ["activo", "lesionado", "lista_espera", "esporadico", "baja"]
    .map(
      (status) =>
        `<option value="${status}" ${selectedStatus === status ? "selected" : ""}>${formatPlayerStatus(status)}</option>`,
    )
    .join("");
}

function formatPaymentMethod(method) {
  return method === "efectivo" ? "Efectivo" : "Transferencia";
}

function formatPaymentStatus(status) {
  const labels = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
  };

  return labels[status] ?? status;
}

function formatAttendanceStatus(status) {
  const labels = {
    voy: "Voy",
    no_voy: "No voy",
    avisa_mas_tarde: "Avisa mas tarde",
    llega_sobre_la_hora: "Llega sobre la hora",
    baja_sobre_la_hora: "Baja sobre la hora",
    anotado: "Anotado",
    asistio: "Asistio",
    falto: "Falto",
    aviso_tarde: "Aviso tarde",
  };

  return labels[status] ?? status;
}

function normalizeAdminAttendanceResponse(selectedStatus) {
  const responseMap = {
    voy_cena: { status: "voy", tags: ["meat"] },
    solo_cena: { status: "no_voy", tags: ["meat"] },
  };

  return responseMap[selectedStatus] ?? { status: selectedStatus, tags: [] };
}

function getAttendanceTagOption(tagId) {
  return attendanceTagOptions.find((tag) => tag.id === tagId);
}

function normalizeAttendanceTags(tags = []) {
  const selectedTags = new Set(tags);

  return attendanceTagOptions
    .map((tag) => tag.id)
    .filter((tagId) => selectedTags.has(tagId));
}

function getAttendanceBaseSource(attendance) {
  return String(attendance?.source ?? "jugador").split("|")[0] || "jugador";
}

function getAttendanceSourceValue(attendance, key) {
  const prefix = `${key}=`;
  const part = String(attendance?.source ?? "")
    .split("|")
    .find((sourcePart) => sourcePart.startsWith(prefix));

  if (!part) return "";

  try {
    return decodeURIComponent(part.replace(prefix, ""));
  } catch {
    return part.replace(prefix, "");
  }
}

function getGuestName(attendance) {
  return String(attendance?.guestName ?? "").trim() || getAttendanceSourceValue(attendance, "guest").trim();
}

function isGuestAttendance(attendance) {
  return attendance?.participantType === "guest" ||
    Boolean(getGuestName(attendance)) ||
    String(attendance?.playerId ?? "").startsWith("guest-");
}

function getAttendanceDisplayName(attendance) {
  const guestName = getGuestName(attendance);
  return guestName || getPlayerNameById(attendance.playerId);
}

function getAttendanceTags(attendance) {
  if (!attendance) return [];

  const tagsPart = String(attendance.source ?? "")
    .split("|")
    .find((part) => part.startsWith("tags="));

  if (!tagsPart) return [];

  return normalizeAttendanceTags(
    tagsPart
      .replace("tags=", "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
}

function serializeAttendanceSource(baseSource, tags = []) {
  const normalizedTags = normalizeAttendanceTags(tags);
  const source = baseSource || "jugador";

  return normalizedTags.length ? `${source}|tags=${normalizedTags.join(",")}` : source;
}

function serializeGuestAttendanceSource(guestName) {
  return `admin|guest=${encodeURIComponent(guestName)}`;
}

function normalizeGuestName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function createGuestPlayerId(date, guestName) {
  const normalizedName = normalizeGuestName(guestName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `guest-${date}-${normalizedName || "invitado"}`;
}

function hasDinnerAttendanceTags(attendance) {
  return getAttendanceTags(attendance).some((tag) => dinnerAttendanceTags.has(tag));
}

function toggleAttendanceTag(attendance, tag) {
  const selectedTags = new Set(getAttendanceTags(attendance));

  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
  } else {
    selectedTags.add(tag);
  }

  return normalizeAttendanceTags([...selectedTags]);
}

function getNextAttendanceTags(existingAttendance, status, options = {}) {
  if (status === "no_voy" && !options.dinnerOnly) return [];

  const tags = new Set(getAttendanceTags(existingAttendance));
  if (options.dinnerOnly) tags.add("meat");

  return normalizeAttendanceTags([...tags]);
}

function formatAttendanceTags(tags = []) {
  const emojis = normalizeAttendanceTags(tags)
    .map((tag) => getAttendanceTagOption(tag)?.emoji)
    .filter(Boolean);

  return emojis.length ? ` ${emojis.join(" ")}` : "";
}

function getPaymentMutationMessage(baseMessage, mutationResult) {
  if (mutationResult?.mode === "rpc") return `${baseMessage} con RPC`;
  if (mutationResult?.mode === "fallback") return `${baseMessage} con fallback temporal`;
  return baseMessage;
}

function getCombinedMutationResult(results) {
  return results.every((result) => result.mode === "rpc")
    ? { mode: "rpc" }
    : { mode: "fallback" };
}

function getSortedPlayers(players = state.players) {
  return [...players].sort(comparePlayersByName);
}

function comparePlayersByName(a, b) {
  return getPlayerName(a).localeCompare(getPlayerName(b), "es", {
    sensitivity: "base",
  });
}

function getPlayerNameById(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  return player ? getPlayerName(player) : "Jugador";
}

function isTrainingDate(dateValue) {
  return Boolean(dateValue) && isTrainingWeekday(dateValue, state.responsibilityConfig);
}

function getOpenTrainingSession(now = new Date()) {
  for (let offset = -5; offset <= 8; offset += 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const dateValue = formatDateInputValue(date);
    if (!isTrainingDate(dateValue)) continue;

    const session = getTrainingSessionWindow(dateValue);
    if (session && now >= session.openAt && now <= session.closeAt) return session;
  }

  return null;
}

function getDefaultTrainingResponseDate() {
  const session = getOpenTrainingSession();
  if (session) return session.date;

  const today = getTodayString();
  const baseDate =
    today < state.responsibilityConfig.attendanceStartDate
      ? state.responsibilityConfig.attendanceStartDate
      : today;

  return getNextTrainingDate(baseDate) ?? baseDate;
}

function getNextTrainingDate(dateValue) {
  const date = parseDateInputValue(dateValue);
  if (!date) return null;

  for (let offset = 0; offset <= 7; offset += 1) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + offset);
    const nextDateValue = formatDateInputValue(nextDate);
    if (isTrainingDate(nextDateValue)) return nextDateValue;
  }

  return null;
}

function getTrainingSessionWindow(dateValue) {
  const date = parseDateInputValue(dateValue);
  if (!date) return null;

  const weekday = date.getDay();
  const openWeekday = Number(state.attendanceConfig.openWeekdays?.[weekday]);
  if (!Number.isFinite(openWeekday)) return null;

  const openAt = new Date(date);
  const daysSinceOpenWeekday = (weekday - openWeekday + 7) % 7;
  openAt.setDate(openAt.getDate() - daysSinceOpenWeekday);
  openAt.setHours(0, 0, 0, 0);

  const closeAt = withTime(date, state.attendanceConfig.closeAt ?? "20:30");
  const lastMinuteDropStartsAt = withTime(
    date,
    state.attendanceConfig.lastMinuteDropStartsAt ?? "12:00",
  );

  return {
    date: dateValue,
    openAt,
    closeAt,
    lastMinuteDropStartsAt,
  };
}

function isLastMinuteDropWindow(session, now = new Date()) {
  return now >= session.lastMinuteDropStartsAt && now <= session.closeAt;
}

function parseDateInputValue(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function withTime(date, timeValue) {
  const [hours, minutes] = String(timeValue).split(":").map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours || 0, minutes || 0, 0, 0);
  return nextDate;
}

function formatTrainingDateLabel(dateValue) {
  const date = parseDateInputValue(dateValue);
  if (!date) return dateValue;

  const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  return `${dayNames[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getAttendancesForDate(date) {
  return state.attendances.filter(
    (attendance) =>
      attendance.date === date && (attendance.eventType ?? "entrenamiento") === "entrenamiento",
  );
}

function getTrainingVoteDates() {
  return Array.from(
    new Set(
      state.attendances
        .filter((attendance) => (attendance.eventType ?? "entrenamiento") === "entrenamiento")
        .map((attendance) => attendance.date)
        .filter(Boolean),
    ),
  ).sort((a, b) => b.localeCompare(a));
}

function getTrainingVoteCandidates(date) {
  const playersById = new Map(state.players.map((player) => [player.id, player]));
  const candidateIds = new Set();

  getAttendancesForDate(date).forEach((attendance) => {
    if (isGuestAttendance(attendance)) return;
    if (!trainingVoteCandidateStatuses.has(attendance.status)) return;
    if (!playersById.has(attendance.playerId)) return;
    candidateIds.add(attendance.playerId);
  });

  return Array.from(candidateIds)
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean)
    .sort(comparePlayersByName);
}

function getCompletedTrainingDates(now = new Date()) {
  const start = parseDateInputValue(state.responsibilityConfig.attendanceStartDate);
  const configuredEnd = parseDateInputValue(state.responsibilityConfig.attendanceEndDate);
  if (!start || !configuredEnd) return [];

  const end = new Date(Math.min(configuredEnd.getTime(), now.getTime()));
  const completedDates = [];
  const current = new Date(start);

  while (current <= end) {
    const dateValue = formatDateInputValue(current);
    if (isTrainingDate(dateValue) && isTrainingSessionClosed(dateValue, now)) {
      completedDates.push(dateValue);
    }
    current.setDate(current.getDate() + 1);
  }

  return completedDates;
}

function isTrainingSessionClosed(dateValue, now = new Date()) {
  const session = getTrainingSessionWindow(dateValue);
  if (session) return now > session.closeAt;

  const date = parseDateInputValue(dateValue);
  if (!date) return false;
  date.setHours(23, 59, 59, 999);
  return now > date;
}

function getImplicitAbsenceCount(completedTrainingDates = getCompletedTrainingDates()) {
  const activePlayers = state.players.filter((player) => player.status === "activo");

  return completedTrainingDates.reduce((total, date) => {
    const registeredPlayerIds = new Set(
      getAttendancesForDate(date).map((attendance) => attendance.playerId),
    );

    return (
      total +
      activePlayers.filter((player) => !registeredPlayerIds.has(player.id)).length
    );
  }, 0);
}

function getNoRecordTrainingCount(completedTrainingDates = getCompletedTrainingDates()) {
  return completedTrainingDates.filter((date) => getAttendancesForDate(date).length === 0).length;
}

function getAttendanceForPlayerDate(playerId, date) {
  return (
    state.attendances.find(
      (attendance) =>
        attendance.playerId === playerId &&
        attendance.date === date &&
        (attendance.eventType ?? "entrenamiento") === "entrenamiento",
    ) ?? null
  );
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentFee() {
  return state.fees.find((fee) => fee.month === getCurrentMonth());
}

function getSelectedSelfServiceMonth() {
  return getValidSelfServiceMonth(state.selectedSelfServiceMonth);
}

function getValidSelfServiceMonth(preferredMonth) {
  const months = state.fees.map((fee) => fee.month).sort();
  const currentMonth = getCurrentMonth();

  if (preferredMonth && months.includes(preferredMonth)) {
    state.selectedSelfServiceMonth = preferredMonth;
    return preferredMonth;
  }

  if (months.includes(currentMonth)) {
    state.selectedSelfServiceMonth = currentMonth;
    return currentMonth;
  }

  const fallbackMonth = months[months.length - 1] ?? currentMonth;
  state.selectedSelfServiceMonth = fallbackMonth;
  return fallbackMonth;
}

function getSelectedSelfServiceFee() {
  const selectedMonth = getSelectedSelfServiceMonth();
  return state.fees.find((fee) => fee.month === selectedMonth);
}

function formatMonthLabel(month) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

function formatMonthOptionLabel(month) {
  const label = formatMonthLabel(month);
  const currentMonth = getCurrentMonth();

  if (month === currentMonth) return `${label} - mes actual`;
  if (month < currentMonth) return `${label} - mes anterior`;
  return `${label} - cuota futura`;
}

function formatFeeOptionLabel(fee) {
  return formatMonthOptionLabel(fee.month);
}

function getSortedFees() {
  return state.fees.slice().sort((a, b) => a.month.localeCompare(b.month));
}

function getDefaultPaymentFeeId() {
  const sortedFees = getSortedFees();
  const currentFee = sortedFees.find((fee) => fee.month === getCurrentMonth());
  return currentFee?.id ?? sortedFees[sortedFees.length - 1]?.id ?? "";
}

function getValidPaymentFeeId(preferredFeeId) {
  return state.fees.some((fee) => fee.id === preferredFeeId)
    ? preferredFeeId
    : getDefaultPaymentFeeId();
}

function getCurrentPaymentStatus(balance, fee) {
  if (!fee) return { label: "Sin cuota", className: "status-pendiente" };
  if (balance <= 0) return { label: "Al dia", className: "status-aprobado" };

  const today = getTodayString();
  return today > getFeeDueDate(fee)
    ? { label: "Moroso", className: "status-rechazado" }
    : { label: "Pendiente", className: "status-pendiente" };
}

function getCurrentInterestAmount(balance, fee) {
  if (!fee || balance <= 0 || !isFeeOverdue(fee)) return 0;
  return getInterestAmount(balance, fee);
}

function getInterestAmountForPaymentDate(balance, fee, paidAt) {
  if (!fee || balance <= 0 || !paidAt) return 0;
  return paidAt > getFeeDueDate(fee) ? getInterestAmount(balance, fee) : 0;
}

function updateSelfPaymentSuggestedAmount(force = false) {
  if (!force && elements.selfPaymentAmount.value) return;

  const player = state.players.find((item) => item.id === state.selectedSelfServicePlayerId);
  const fee = getSelectedSelfServiceFee();
  if (!player || !fee || !canViewSelfServicePlayer(player)) return;

  const expected = getExpectedFeeForPlayer(player, fee, state.players);
  const paid = getPaidAmount(state.payments, player.id, fee.id);
  const balance = Math.max(expected - paid, 0);
  const interest = getInterestAmountForPaymentDate(balance, fee, elements.selfPaymentDate.value);
  const suggestedAmount = balance + interest;

  elements.selfPaymentAmount.value = suggestedAmount > 0 ? String(suggestedAmount) : "";
}

function clearSelfPaymentDraft() {
  elements.selfPaymentAmount.value = "";
  elements.selfPaymentNote.value = "";
  elements.selfPaymentStatus.textContent = "";
}

function getMainPaymentText(player, expected, balance) {
  if (!isBillablePlayer(player) || expected <= 0) return "Sin cuota mensual";
  if (balance <= 0) return "Estas al dia";
  return `Debes ${formatMoney(balance)}`;
}

function getLateDebtForPlayer(player, currentMonth) {
  return state.fees
    .filter((fee) => fee.month < currentMonth)
    .reduce((sum, fee) => sum + getBalanceForPlayerFee(player, fee), 0);
}

function getNextMonthEstimate(player, currentMonth) {
  const nextMonth = getNextMonth(currentMonth);
  const existingFee = state.fees.find((fee) => fee.month === nextMonth);
  const fee = existingFee ?? createEstimatedFee(nextMonth);

  return fee ? getExpectedFeeForPlayer(player, fee, state.players) : 0;
}

function getNextMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const nextDate = new Date(year, month, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
}

function createEstimatedFee(month) {
  const sortedFees = state.fees.slice().sort((a, b) => a.month.localeCompare(b.month));
  const lastFee = sortedFees[sortedFees.length - 1];
  if (!lastFee) return null;

  return {
    ...lastFee,
    id: "estimated-next-fee",
    month,
  };
}

function getBalanceForPlayerFee(player, fee) {
  const expected = getExpectedFeeForPlayer(player, fee, state.players);
  const paid = getPaidAmount(state.payments, player.id, fee.id);
  return Math.max(expected - paid, 0);
}

function getPendingAmountForPlayer(playerId, feeId) {
  return state.payments.reduce((sum, payment) => {
    if (payment.playerId !== playerId || payment.status !== "pendiente") return sum;
    if (feeId && payment.feeId !== feeId) return sum;
    return sum + (Number(payment.amount) || 0);
  }, 0);
}

function getLatestPaymentForPlayerFee(playerId, feeId) {
  return (
    state.payments.find((payment) => payment.playerId === playerId && payment.feeId === feeId) ??
    null
  );
}

function getActivePaymentsForPlayerFee(playerId, feeId) {
  return state.payments.filter(
    (payment) =>
      payment.playerId === playerId &&
      payment.feeId === feeId &&
      ["pendiente", "aprobado"].includes(payment.status ?? "aprobado"),
  );
}

function getActivePaymentForPlayerFee(playerId, feeId) {
  return getActivePaymentsForPlayerFee(playerId, feeId)[0] ?? null;
}

function formatSelfPaymentStatus(payment, pendingAmount, expectedAmount, payableAmount) {
  if (expectedAmount <= 0) return "";
  if (pendingAmount > 0) return "Informaste un pago, pendiente de validación";
  if (!payment) return payableAmount > 0 ? "Tenés pendiente esta cuota" : "Pago confirmado";

  const statusMessages = {
    aprobado: "Pago confirmado",
    pendiente: "Informaste un pago, pendiente de validación",
    rechazado: "Pago rechazado, revisar con el administrador",
  };

  return statusMessages[payment.status] ?? "";
}

async function hydrateFromSupabase() {
  if (!isSupabaseEnabled()) {
    return;
  }

  try {
    state.syncStatus = "Cargando datos compartidos...";
    renderRoleVisibility();
    const remoteState = await loadSupabaseState(createPersistedState(state));
    applyPersistentState(remoteState);
    supabaseHydrated = true;
    state.syncStatus = "Supabase conectado";
    render();
  } catch (error) {
    supabaseHydrated = true;
    state.syncStatus = `Error Supabase: ${error.message}`;
    renderRoleVisibility();
  }
}

async function refreshFromSupabase() {
  if (!isSupabaseEnabled() || !supabaseHydrated || supabaseSyncInProgress) return;

  try {
    const remoteState = await loadSupabaseState(createPersistedState(state), {
      adminPin: state.isAdminMode ? adminConfig.pin : null,
    });
    applyPersistentState(remoteState);
    state.syncStatus = "Datos actualizados";
    render();
  } catch (error) {
    state.syncStatus = `Error Supabase: ${error.message}`;
    renderRoleVisibility();
  }
}

async function syncSupabaseState() {
  if (!isSupabaseEnabled()) {
    return;
  }
  if (suppressNextSupabaseSync) {
    suppressNextSupabaseSync = false;
    return;
  }
  if (!supabaseHydrated) {
    return;
  }
  if (supabaseSyncInProgress) {
    return;
  }

  supabaseSyncInProgress = true;
  try {
    await saveSupabaseState(state);
    state.syncStatus = "Supabase sincronizado";
  } catch (error) {
    state.syncStatus = `Error Supabase: ${error.message}`;
  } finally {
    supabaseSyncInProgress = false;
    renderRoleVisibility();
  }
}

function getPaymentPercent(paid, expected) {
  if (expected <= 0) return 0;
  return Math.min(Math.round((paid / expected) * 100), 100);
}

function getYearPaymentPercent(player, year) {
  const yearFees = state.fees.filter((fee) => fee.month.startsWith(year));
  const expected = yearFees.reduce(
    (sum, fee) => sum + getExpectedFeeForPlayer(player, fee, state.players),
    0,
  );
  const paid = yearFees.reduce(
    (sum, fee) => sum + getPaidAmount(state.payments, player.id, fee.id),
    0,
  );

  return getPaymentPercent(paid, expected);
}

function updateProgress(barElement, textElement, percent) {
  barElement.style.width = `${percent}%`;
  textElement.textContent = `${percent}%`;
}

function getResponsibilityAdjustment(playerId) {
  return (
    state.responsibilityAdjustments.find((item) => item.playerId === playerId) ?? {
      id: createId("responsibility-adjustment"),
      playerId,
      accumulatedAbsences: 0,
      accumulatedLateNotices: 0,
      accumulatedLastMinuteDrops: 0,
      observation: "",
    }
  );
}

function getResponsibilityDetails(playerId, completedTrainingDates = getCompletedTrainingDates()) {
  return calculateResponsibilityScore({
    playerId,
    attendances: state.attendances,
    adjustments: state.responsibilityAdjustments,
    config: state.responsibilityConfig,
    players: state.players,
    completedTrainingDates,
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

restoreSelfServiceSession();
render();
hydrateFromSupabase();

if (isSupabaseEnabled()) {
  setInterval(refreshFromSupabase, 10000);
}
