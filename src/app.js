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
  adminSoftDeletePayment,
  adminUpdateTreasuryConfig,
  isSupabaseEnabled,
  loadSupabaseState,
  saveSupabaseState,
  submitPayment,
} from "./domain/supabaseRepository.js";

const initialAppState = createInitialAppState();
const persistedAppState = loadPersistedState(initialAppState);
const initialUrlPlayerId = getUrlPlayerId();
let supabaseHydrated = !isSupabaseEnabled();
let supabaseSyncInProgress = false;
let suppressNextSupabaseSync = false;
let treasuryFormDirty = false;
const authorizedSelfServicePlayerIds = new Set();
const state = {
  ...persistedAppState,
  playerFilter: "todos",
  selectedSelfServicePlayerId:
    persistedAppState.players.find((player) => player.id === initialUrlPlayerId)?.id ??
    persistedAppState.players[0]?.id ??
    "",
  selectedSelfServiceMonth: "",
  isAdminMode: false,
  isAdminLoginVisible: false,
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
  selfPaymentForm: document.querySelector("#selfPaymentForm"),
  selfPaymentMethod: document.querySelector("#selfPaymentMethod"),
  selfPaymentAmount: document.querySelector("#selfPaymentAmount"),
  selfPaymentDate: document.querySelector("#selfPaymentDate"),
  selfPaymentNote: document.querySelector("#selfPaymentNote"),
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
  responsibilityBaseInfo: document.querySelector("#responsibilityBaseInfo"),
  responsibilityAdjustmentsTable: document.querySelector("#responsibilityAdjustmentsTable"),
  playersTable: document.querySelector("#playersTable"),
  playerFilters: document.querySelector("#playerFilters"),
  feesList: document.querySelector("#feesList"),
  defaultersList: document.querySelector("#defaultersList"),
  pendingPaymentsList: document.querySelector("#pendingPaymentsList"),
  paymentsHistoryList: document.querySelector("#paymentsHistoryList"),
  attendanceList: document.querySelector("#attendanceList"),
  whatsappReport: document.querySelector("#whatsappReport"),
};

elements.paymentDate.value = new Date().toISOString().slice(0, 10);
elements.selfPaymentDate.value = new Date().toISOString().slice(0, 10);
elements.playerPaymentDate.value = new Date().toISOString().slice(0, 10);
elements.attendanceDate.value = new Date().toISOString().slice(0, 10);
elements.attendanceNoveltyDate.value = state.responsibilityConfig.attendanceStartDate;
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
  renderSelfService();
});

elements.selfServiceMonth.addEventListener("change", () => {
  state.selectedSelfServiceMonth = elements.selfServiceMonth.value;
  renderSelfService();
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
    elements.selfPaymentStatus.textContent = "Todavia no hay link de pago configurado.";
    return;
  }

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

elements.playerFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  state.playerFilter = button.dataset.filter;
  render();
});

elements.playerForm.addEventListener("submit", (event) => {
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

  state.players.push({
    id: createId("player"),
    firstName,
    lastName,
    phone,
    accessCode,
    type,
    status,
    internalEnabled,
  });

  elements.playerForm.reset();
  document.querySelector("#playerInternalEnabled").checked = true;
  render();
});

elements.bulkPlayersForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const result = importBulkPlayers(elements.bulkPlayersInput.value);
  elements.bulkPlayersMessage.textContent =
    `Importados: ${result.imported}. Ignorados: ${result.ignored}. Duplicados: ${result.duplicates}. Errores: ${result.errors}.`;

  if (result.imported > 0) {
    elements.bulkPlayersInput.value = "";
    render();
  }
});

elements.feeForm.addEventListener("submit", (event) => {
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

  state.fees.push({
    id: createId("fee"),
    month,
    trainingSessionCost,
    sundayCost,
    trainingBillingBase,
    sundayBillingBase,
    interestPercent,
    dueDay: 10,
  });
  state.fees.sort((a, b) => a.month.localeCompare(b.month));

  elements.feeForm.reset();
  document.querySelector("#feeTrainingCost").value = "55000";
  document.querySelector("#feeSundayCost").value = "90000";
  document.querySelector("#feeTrainingBillingBase").value = "";
  document.querySelector("#feeSundayBillingBase").value = "";
  document.querySelector("#feeInterestPercent").value = "5";
  render();
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

elements.playerPaymentPlayer.addEventListener("change", renderPlayerPaymentSummary);
elements.playerPaymentFee.addEventListener("change", renderPlayerPaymentSummary);

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

elements.attendanceForm.addEventListener("submit", (event) => {
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

  const existingAttendance = state.attendances.find(
    (attendance) => attendance.date === date && attendance.playerId === playerId,
  );

  if (existingAttendance) {
    if (["falto", "aviso_tarde", "baja_sobre_hora"].includes(existingAttendance.status)) {
      elements.attendanceMessage.textContent =
        "Ese entrenamiento ya tiene una novedad admin cargada.";
      return;
    }

    state.attendances = state.attendances.map((attendance) =>
      attendance.id === existingAttendance.id
        ? { ...attendance, status: "asistio", source: "jugador", updatedAt: new Date().toISOString() }
        : attendance,
    );
  } else {
    state.attendances.unshift({
      id: createId("attendance"),
      date,
      eventType: "entrenamiento",
      playerId,
      status: "asistio",
      source: "jugador",
      createdAt: new Date().toISOString(),
    });
  }

  elements.attendanceMessage.textContent = "";
  render();
});

elements.attendanceNoveltyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!requireAdmin()) return;

  const date = elements.attendanceNoveltyDate.value;
  const playerId = elements.attendanceNoveltyPlayer.value;
  const status = elements.attendanceNoveltyStatus.value;

  if (!isTrainingDate(date)) {
    elements.attendanceNoveltyMessage.textContent =
      "Las novedades solo se pueden cargar para martes o jueves.";
    return;
  }

  if (date < state.responsibilityConfig.attendanceStartDate) {
    elements.attendanceNoveltyMessage.textContent =
      `La fecha minima para novedades es ${state.responsibilityConfig.attendanceStartDate}.`;
    return;
  }

  const existingAttendance = state.attendances.find(
    (attendance) => attendance.date === date && attendance.playerId === playerId,
  );

  if (existingAttendance) {
    state.attendances = state.attendances.map((attendance) =>
      attendance.id === existingAttendance.id
        ? { ...attendance, status, source: "admin", updatedAt: new Date().toISOString() }
        : attendance,
    );
  } else {
    state.attendances.unshift({
      id: createId("attendance"),
      date,
      eventType: "entrenamiento",
      playerId,
      status,
      source: "admin",
      createdAt: new Date().toISOString(),
    });
  }

  elements.attendanceNoveltyMessage.textContent = "";
  render();
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
  renderResponsibilityAdjustments();
  renderWhatsappReport(debts);
  savePersistedState(state);
  syncSupabaseState();
}

function renderSelfService() {
  const selectedPlayer = state.players.find(
    (player) => player.id === state.selectedSelfServicePlayerId,
  );
  const fallbackPlayer = selectedPlayer ?? state.players[0];
  const selectedMonth = getSelectedSelfServiceMonth();

  state.selectedSelfServicePlayerId = fallbackPlayer?.id ?? "";
  elements.selfServicePlayer.innerHTML = state.players
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");
  elements.selfServicePlayer.value = state.selectedSelfServicePlayerId;
  renderSelfServiceMonthOptions(selectedMonth);

  if (!fallbackPlayer) {
    elements.selfAccessBox.hidden = true;
    elements.selfServiceProtectedContent.hidden = true;
    elements.selfCurrentExpected.textContent = formatMoney(0);
    elements.selfCurrentInterest.textContent = formatMoney(0);
    elements.selfCurrentPaid.textContent = formatMoney(0);
    elements.selfCurrentBalance.textContent = formatMoney(0);
    elements.selfCurrentDue.textContent = "-";
    elements.selfCurrentStatus.textContent = "Sin jugador";
    elements.selfLateDebt.textContent = formatMoney(0);
    elements.selfNextEstimate.textContent = formatMoney(0);
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
    elements.selfPaymentStatus.textContent = "";
    elements.selfAccessMessage.textContent =
      fallbackPlayer.accessCode?.trim()
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
  elements.selfPayButton.disabled = !state.treasuryConfig.paymentTestMode && !state.treasuryConfig.paymentLink;
  elements.selfPayButton.hidden = currentExpected <= 0 || currentPayable <= 0;
  elements.selfPaymentStatus.textContent = formatSelfPaymentStatus(
    latestPayment,
    pendingAmount,
    currentExpected,
    currentPayable,
  );
  updateSelfPaymentSuggestedAmount();
  updateProgress(elements.selfMonthPercentBar, elements.selfMonthPercentText, monthPercent);
  updateProgress(elements.selfYearPercentBar, elements.selfYearPercentText, yearPercent);
}

function renderPaymentOptions() {
  const selectedPlayer = elements.paymentPlayer.value;
  const selectedFee = elements.paymentFee.value;

  elements.paymentPlayer.innerHTML = state.players
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.paymentFee.innerHTML = state.fees
    .map((fee) => `<option value="${fee.id}">${fee.month}</option>`)
    .join("");

  elements.paymentPlayer.value = selectedPlayer || state.players[0]?.id || "";
  elements.paymentFee.value = selectedFee || state.fees[0]?.id || "";
}

function renderPlayerPaymentOptions() {
  const selectedPlayer = elements.playerPaymentPlayer.value;
  const selectedFee = elements.playerPaymentFee.value;

  elements.playerPaymentPlayer.innerHTML = state.players
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.playerPaymentFee.innerHTML = state.fees
    .map((fee) => `<option value="${fee.id}">${fee.month}</option>`)
    .join("");

  elements.playerPaymentPlayer.value = selectedPlayer || state.players[0]?.id || "";
  elements.playerPaymentFee.value = selectedFee || state.fees[state.fees.length - 1]?.id || "";
}

function renderSelfServiceMonthOptions(selectedMonth) {
  const months = state.fees
    .map((fee) => fee.month)
    .filter((month, index, list) => list.indexOf(month) === index)
    .sort();

  elements.selfServiceMonth.innerHTML = months
    .map((month) => `<option value="${month}">${formatMonthLabel(month)}</option>`)
    .join("");
  elements.selfServiceMonth.value = selectedMonth;
}

function renderAttendanceOptions() {
  const selectedPlayer = elements.attendancePlayer.value;

  elements.attendancePlayer.innerHTML = state.players
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.attendancePlayer.value = selectedPlayer || state.players[0]?.id || "";
}

function renderAttendanceNoveltyOptions() {
  const selectedPlayer = elements.attendanceNoveltyPlayer.value;

  elements.attendanceNoveltyPlayer.innerHTML = state.players
    .map((player) => `<option value="${player.id}">${escapeHtml(getPlayerName(player))}</option>`)
    .join("");

  elements.attendanceNoveltyPlayer.value = selectedPlayer || state.players[0]?.id || "";
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

  const filteredDebts = debts.filter((debt) => matchesPlayerFilter(debt, state.playerFilter));

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
          <td><span class="status status-${debt.player.status}">${formatPlayerStatus(debt.player.status)}</span></td>
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
            <div class="fee-base-controls">
              <label>
                Base entrenamientos
                <input class="score-input" data-fee-base-field="trainingBillingBase" data-fee-base-id="${fee.id}" type="number" min="0" value="${fee.trainingBillingBase ?? ""}" placeholder="Auto" />
              </label>
              <label>
                Base domingos
                <input class="score-input" data-fee-base-field="sundayBillingBase" data-fee-base-id="${fee.id}" type="number" min="0" value="${fee.sundayBillingBase ?? ""}" placeholder="Auto" />
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
            <th>Operacion / nota</th>
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
            <th>Observacion / comprobante</th>
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
    .sort((a, b) => b.date.localeCompare(a.date) || getPlayerNameById(a.playerId).localeCompare(getPlayerNameById(b.playerId)));

  elements.attendanceList.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Evento</th>
            <th>Jugador</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${sortedAttendances
            .map(
              (attendance) => `
                <tr>
                  <td>${attendance.date}</td>
                  <td>Entrenamiento</td>
                  <td><strong>${escapeHtml(getPlayerNameById(attendance.playerId))}</strong></td>
                  <td>
                    <select class="table-select" data-attendance-status="${attendance.id}">
                      <option value="anotado" ${attendance.status === "anotado" ? "selected" : ""}>Anotado</option>
                  <option value="asistio" ${attendance.status === "asistio" ? "selected" : ""}>Asistio</option>
                      <option value="falto" ${attendance.status === "falto" ? "selected" : ""}>Falto</option>
                      <option value="aviso_tarde" ${attendance.status === "aviso_tarde" ? "selected" : ""}>Aviso tarde</option>
                      <option value="baja_sobre_hora" ${attendance.status === "baja_sobre_hora" ? "selected" : ""}>Baja sobre la hora</option>
                    </select>
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
}

function renderResponsibilityAdjustments() {
  const trainingCount = countTrainingDays(
    state.responsibilityConfig.attendanceStartDate,
    state.responsibilityConfig.attendanceEndDate,
    state.responsibilityConfig,
  );
  const baseScore = getBaseResponsibilityScore(state.responsibilityConfig);

  elements.responsibilityBaseInfo.innerHTML = `
    <strong>Base anual: ${baseScore} pts</strong>
    <span>Inicio ${state.responsibilityConfig.attendanceStartDate} / ${trainingCount} entrenamientos de martes y jueves / ${state.responsibilityConfig.pointsPerTraining} pts posibles por entrenamiento</span>
  `;

  elements.responsibilityAdjustmentsTable.innerHTML = state.players
    .map((player) => {
      const adjustment = getResponsibilityAdjustment(player.id);
      const details = getResponsibilityDetails(player.id);

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
  state.players = nextState.players.map((player) => ({ ...player, accessCode: player.accessCode ?? "" }));
  state.fees = nextState.fees.map((fee) => ({ ...fee }));
  state.payments = nextState.payments.map((payment) => ({ ...payment }));
  state.attendances = nextState.attendances.map((attendance) => ({ ...attendance }));
  state.responsibilityAdjustments = nextState.responsibilityAdjustments.map((adjustment) => ({
    ...adjustment,
  }));
  state.responsibilityConfig = { ...nextState.responsibilityConfig };
  state.treasuryConfig = { ...nextState.treasuryConfig };
  state.playerFilter = previousPlayerFilter || "todos";
  state.selectedSelfServicePlayerId =
    state.players.find((player) => player.id === selfServiceSnapshot.playerId)?.id ??
    state.players.find((player) => player.id === initialUrlPlayerId)?.id ??
    state.selectedSelfServicePlayerId ??
    state.players[0]?.id ??
    "";
  state.selectedSelfServiceMonth = getValidSelfServiceMonth(
    selfServiceSnapshot.month || state.selectedSelfServiceMonth,
  );
  syncFormValuesFromState();
  restoreSelfServiceUiSnapshot(selfServiceSnapshot);
}

function syncFormValuesFromState({ forceTreasury = false } = {}) {
  elements.attendanceNoveltyDate.value = state.responsibilityConfig.attendanceStartDate;
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

function restoreSelfServiceUiSnapshot(snapshot) {
  state.selectedSelfServicePlayerId = snapshot.playerId || state.selectedSelfServicePlayerId;
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
  const existingNames = new Set(state.players.map((player) => normalizePlayerName(getPlayerName(player))));
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

function canViewSelfServicePlayer(player) {
  return state.isAdminMode || authorizedSelfServicePlayerIds.has(player.id);
}

function authorizeSelfServicePlayer() {
  const player = state.players.find((item) => item.id === state.selectedSelfServicePlayerId);
  const accessCode = elements.selfAccessCode.value.trim();

  if (!player) return;

  if (!player.accessCode?.trim()) {
    elements.selfAccessMessage.textContent = "Este jugador todavia no tiene codigo asignado.";
    return;
  }

  if (accessCode !== player.accessCode.trim()) {
    elements.selfAccessMessage.textContent = "Codigo incorrecto.";
    return;
  }

  authorizedSelfServicePlayerIds.add(player.id);
  elements.selfAccessCode.value = "";
  elements.selfAccessMessage.textContent = "Acceso habilitado.";
  renderSelfService();
}

function enterAdmin(pin) {
  if (pin !== adminConfig.pin) {
    elements.adminModeStatus.textContent = "PIN incorrecto.";
    return;
  }

  state.isAdminMode = true;
  state.isAdminLoginVisible = false;
  elements.adminPin.value = "";
  elements.adminModeStatus.textContent = "Modo admin activo.";
  render();
}

function exitAdmin() {
  state.isAdminMode = false;
  state.isAdminLoginVisible = false;
  elements.adminModeStatus.textContent = "";
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

function updateAttendanceStatus(attendanceId, status) {
  if (!requireAdmin()) return;

  state.attendances = state.attendances.map((attendance) =>
    attendance.id === attendanceId ? { ...attendance, status } : attendance,
  );
  render();
}

function toggleInternalEnabled(playerId) {
  if (!requireAdmin()) return;

  state.players = state.players.map((player) =>
    player.id === playerId
      ? { ...player, internalEnabled: !player.internalEnabled }
      : player,
  );
  render();
}

function updatePlayerAccessCode(playerId, value) {
  if (!requireAdmin()) return;

  state.players = state.players.map((player) =>
    player.id === playerId ? { ...player, accessCode: value.trim() } : player,
  );
  render();
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

function updateFeeBillingBase(feeId, field, value) {
  if (!requireAdmin()) return;

  const nextValue = Number(value) > 0 ? Number(value) : null;
  state.fees = state.fees.map((fee) =>
    fee.id === feeId
      ? {
          ...fee,
          [field]: nextValue,
        }
      : fee,
  );
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

function getPlayerNameById(playerId) {
  const player = state.players.find((item) => item.id === playerId);
  return player ? getPlayerName(player) : "Jugador";
}

function isTrainingDate(dateValue) {
  return Boolean(dateValue) && isTrainingWeekday(dateValue, state.responsibilityConfig);
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
    const remoteState = await loadSupabaseState(createPersistedState(state));
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

function getResponsibilityDetails(playerId) {
  return calculateResponsibilityScore({
    playerId,
    attendances: state.attendances,
    adjustments: state.responsibilityAdjustments,
    config: state.responsibilityConfig,
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

render();
hydrateFromSupabase();

if (isSupabaseEnabled()) {
  setInterval(refreshFromSupabase, 10000);
}
