import { supabaseConfig } from "../config/supabaseConfig.js";

let clientPromise = null;

export function isSupabaseEnabled() {
  return Boolean(supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey);
}

export async function loadSupabaseState(fallbackState, options = {}) {
  const client = await getSupabaseClient();
  const [playersResult, feesResult, paymentsResult, treasuryResult, attendancesResult] = await Promise.all([
    loadPlayers(client, options),
    client.from("fees").select("*").order("month", { ascending: true }),
    client
      .from("payments")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    client.from("treasury_config").select("*").eq("id", "main").maybeSingle(),
    loadAttendances(client),
  ]);

  assertSupabaseResult(playersResult, "players");
  assertSupabaseResult(feesResult, "fees");
  assertSupabaseResult(paymentsResult, "payments");
  assertSupabaseResult(treasuryResult, "treasury_config");
  assertSupabaseResult(attendancesResult, "attendances");

  const players = playersResult.data.map(fromSupabasePlayer);
  const fees = feesResult.data.map(fromSupabaseFee);
  const payments = paymentsResult.data.map(fromSupabasePayment);
  const attendances = attendancesResult.data
    .map(fromSupabaseAttendance)
    .filter((attendance) => !isRemovedGuestAttendance(attendance));
  const treasuryConfig = treasuryResult.data
    ? fromSupabaseTreasuryConfig(treasuryResult.data)
    : fallbackState.treasuryConfig;

  return {
    ...fallbackState,
    players: players.length > 0 ? players : fallbackState.players,
    fees: fees.length > 0 ? fees : fallbackState.fees,
    payments,
    attendances,
    attendanceSyncReady: !attendancesResult.disabled,
    treasuryConfig,
  };
}

export async function saveSupabaseState() {
  return;
}

export async function validatePlayerAccess(playerId, accessCode) {
  const client = await getSupabaseClient();
  const rpcResult = await client.rpc("validate_player_access", {
    p_player_id: playerId,
    p_access_code: accessCode,
  });

  if (!rpcResult.error) {
    return Boolean(rpcResult.data);
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "validate_player_access");
  }

  const fallbackResult = await client
    .from("players")
    .select("access_code")
    .eq("id", playerId)
    .maybeSingle();

  assertSupabaseResult(fallbackResult, "players");
  return Boolean(fallbackResult.data?.access_code?.trim() === accessCode);
}

export async function adminUpsertPlayer(adminPin, player) {
  const client = await getSupabaseClient();
  const payload = toSupabasePlayer(player);
  const rpcResult = await client.rpc("admin_upsert_player", {
    p_admin_pin: adminPin,
    p_player: payload,
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "admin_upsert_player");
  }

  const fallbackResult = await client.from("players").upsert(payload, { onConflict: "id" });
  assertSupabaseResult(fallbackResult, "players");
  return logMutationMode("fallback");
}

export async function adminUpsertFee(adminPin, fee) {
  const client = await getSupabaseClient();
  const payload = toSupabaseFee(fee);
  const rpcResult = await client.rpc("admin_upsert_fee", {
    p_admin_pin: adminPin,
    p_fee: payload,
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "admin_upsert_fee");
  }

  const fallbackResult = await client.from("fees").upsert(payload, { onConflict: "id" });
  assertSupabaseResult(fallbackResult, "fees");
  return logMutationMode("fallback");
}

export async function adminUpdateTreasuryConfig(adminPin, treasuryConfig) {
  const client = await getSupabaseClient();
  const payload = toSupabaseTreasuryConfig(treasuryConfig);
  const rpcResult = await client.rpc("admin_update_treasury_config", {
    p_admin_pin: adminPin,
    p_config: payload,
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "admin_update_treasury_config");
  }

  const fallbackResult = await client
    .from("treasury_config")
    .upsert(payload, { onConflict: "id" });

  assertSupabaseResult(fallbackResult, "treasury_config");
  return logMutationMode("fallback");
}

export async function submitPayment(payment) {
  const client = await getSupabaseClient();
  const rpcResult = await client.rpc("submit_payment", {
    p_payment: toSupabasePayment(payment),
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "submit_payment");
  }

  const fallbackResult = await client.from("payments").insert(toSupabasePayment(payment));
  assertSupabaseResult(fallbackResult, "payments");
  return logMutationMode("fallback");
}

export async function submitTrainingAttendance(playerId, accessCode, attendance) {
  const client = await getSupabaseClient();
  const payload = toSupabaseAttendance(attendance);
  const rpcResult = await client.rpc("submit_training_attendance", {
    p_player_id: playerId,
    p_access_code: accessCode,
    p_attendance: payload,
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "submit_training_attendance");
  }

  const fallbackResult = await client
    .from("attendances")
    .upsert(payload, { onConflict: "date,player_id,event_type" });
  assertSupabaseResult(fallbackResult, "attendances");
  return logMutationMode("fallback");
}

export async function adminUpsertAttendance(adminPin, attendance) {
  const client = await getSupabaseClient();
  const payload = toSupabaseAttendance(attendance);
  const rpcResult = await client.rpc("admin_upsert_attendance", {
    p_admin_pin: adminPin,
    p_attendance: payload,
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "admin_upsert_attendance");
  }

  const fallbackResult = await client
    .from("attendances")
    .upsert(payload, { onConflict: "date,player_id,event_type" });
  assertSupabaseResult(fallbackResult, "attendances");
  return logMutationMode("fallback");
}

export async function adminDeleteGuestAttendance(adminPin, attendance) {
  const client = await getSupabaseClient();
  const rpcResult = await client.rpc("admin_delete_guest_attendance", {
    p_admin_pin: adminPin,
    p_attendance_id: attendance.id,
    p_attendance_date: attendance.date,
    p_guest_name: getGuestNameForAttendance(attendance),
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "admin_delete_guest_attendance");
  }

  const fallbackPayload = toSupabaseAttendance({
    ...attendance,
    status: "no_voy",
    source: "admin|removed=1",
    updatedAt: new Date().toISOString(),
  });
  const fallbackResult = await client.rpc("admin_upsert_attendance", {
    p_admin_pin: adminPin,
    p_attendance: fallbackPayload,
  });

  assertSupabaseResult(fallbackResult, "attendances");
  return logMutationMode("fallback");
}

export async function adminReviewPayment(adminPin, paymentId, status) {
  const client = await getSupabaseClient();
  const rpcResult = await client.rpc("admin_review_payment", {
    p_admin_pin: adminPin,
    p_payment_id: paymentId,
    p_status: status,
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "admin_review_payment");
  }

  const fallbackResult = await client
    .from("payments")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "admin",
    })
    .eq("id", paymentId)
    .is("deleted_at", null);

  assertSupabaseResult(fallbackResult, "payments");
  return logMutationMode("fallback");
}

export async function adminSoftDeletePayment(adminPin, paymentId) {
  const client = await getSupabaseClient();
  const rpcResult = await client.rpc("admin_soft_delete_payment", {
    p_admin_pin: adminPin,
    p_payment_id: paymentId,
  });

  if (!rpcResult.error) {
    return logMutationMode("rpc");
  }

  if (!isRpcUnavailableError(rpcResult.error)) {
    throwSupabaseError(rpcResult, "admin_soft_delete_payment");
  }

  const fallbackResult = await client
    .from("payments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", paymentId);

  assertSupabaseResult(fallbackResult, "payments");
  return logMutationMode("fallback");
}

async function getSupabaseClient() {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase no esta configurado");
  }

  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2").then(({ createClient }) =>
      createClient(supabaseConfig.url, supabaseConfig.anonKey),
    );
  }

  return clientPromise;
}

async function loadPlayers(client, options = {}) {
  if (options.adminPin) {
    const adminResult = await client.rpc("admin_list_players", {
      p_admin_pin: options.adminPin,
    });

    if (!adminResult.error) {
      return adminResult;
    }

    if (!isRpcUnavailableError(adminResult.error)) {
      return adminResult;
    }
  } else {
    const publicResult = await client.rpc("list_public_players");

    if (!publicResult.error) {
      return publicResult;
    }

    if (!isRpcUnavailableError(publicResult.error)) {
      return publicResult;
    }
  }

  return client.from("players").select("*").order("first_name", { ascending: true });
}

async function loadAttendances(client) {
  const result = await client
    .from("attendances")
    .select("*")
    .order("date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (result.error && isMissingRelationError(result.error)) {
    return { data: [], error: null, disabled: true };
  }

  return result;
}

function assertSupabaseResult(result, tableName) {
  if (result.error) {
    throw new Error(`${tableName}: ${result.error.message}`);
  }
}

function throwSupabaseError(result, tableName) {
  throw new Error(`${tableName}: ${result.error.message}`);
}

function isRpcUnavailableError(error) {
  const message = error?.message ?? "";
  return (
    error?.code === "PGRST202" ||
    message.includes("Could not find the function") ||
    message.includes("function") && message.includes("does not exist") ||
    message.includes("function") && message.includes("schema cache")
  );
}

function isMissingRelationError(error) {
  const message = error?.message ?? "";
  return (
    error?.code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

function logMutationMode(mode) {
  const detail = mode === "rpc" ? "RPC OK" : "Fallback temporal usado: RPC no disponible";
  console.info(detail);
  return { mode, detail };
}

function fromSupabasePlayer(row) {
  const hasAccessCodeColumn = Object.prototype.hasOwnProperty.call(row, "access_code");
  const accessCode = hasAccessCodeColumn ? row.access_code ?? "" : "";

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? "",
    phone: row.phone ?? "",
    type: row.type,
    status: row.status,
    internalEnabled: Boolean(row.internal_enabled),
    responsibilityScore: Number(row.responsibility_score) || 0,
    accessCode,
    hasAccessCode:
      row.has_access_code === null || row.has_access_code === undefined
        ? Boolean(accessCode.trim())
        : Boolean(row.has_access_code),
    hasPrivateAccessCode: hasAccessCodeColumn,
  };
}

function toSupabasePlayer(player) {
  const row = {
    id: player.id,
    first_name: player.firstName,
    last_name: player.lastName ?? "",
    phone: player.phone ?? "",
    type: player.type,
    status: player.status,
    internal_enabled: Boolean(player.internalEnabled),
    responsibility_score: Number(player.responsibilityScore) || 0,
    updated_at: new Date().toISOString(),
  };

  if (player.hasPrivateAccessCode || player.accessCode?.trim()) {
    row.access_code = player.accessCode ?? "";
  }

  return row;
}

function fromSupabaseFee(row) {
  return {
    id: row.id,
    month: row.month,
    trainingSessionCost: Number(row.training_session_cost) || 0,
    sundayCost: Number(row.sunday_cost) || 0,
    trainingBillingBase: row.training_billing_base === null ? null : Number(row.training_billing_base),
    sundayBillingBase: row.sunday_billing_base === null ? null : Number(row.sunday_billing_base),
    fixedTrainingOnlyAmount:
      row.fixed_training_only_amount === null || row.fixed_training_only_amount === undefined
        ? null
        : Number(row.fixed_training_only_amount),
    fixedCompetitorAmount:
      row.fixed_competitor_amount === null || row.fixed_competitor_amount === undefined
        ? null
        : Number(row.fixed_competitor_amount),
    interestPercent: Number(row.interest_percent) || 0,
    dueDay: Number(row.due_day) || 10,
  };
}

function toSupabaseFee(fee) {
  return {
    id: fee.id,
    month: fee.month,
    training_session_cost: Number(fee.trainingSessionCost) || 0,
    sunday_cost: Number(fee.sundayCost) || 0,
    training_billing_base: fee.trainingBillingBase ?? null,
    sunday_billing_base: fee.sundayBillingBase ?? null,
    fixed_training_only_amount: fee.fixedTrainingOnlyAmount ?? null,
    fixed_competitor_amount: fee.fixedCompetitorAmount ?? null,
    interest_percent: Number(fee.interestPercent) || 0,
    due_day: Number(fee.dueDay) || 10,
    updated_at: new Date().toISOString(),
  };
}

function fromSupabasePayment(row) {
  return {
    id: row.id,
    playerId: row.player_id,
    feeId: row.fee_id,
    amount: Number(row.amount) || 0,
    paidAt: row.paid_at,
    method: row.method,
    status: row.status,
    operationNumber: row.operation_number ?? "",
    receiptNote: row.receipt_note ?? "",
    note: row.note ?? "",
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    deletedAt: row.deleted_at,
  };
}

function fromSupabaseAttendance(row) {
  const participantType = row.participant_type ?? (row.guest_name ? "guest" : "player");
  const guestName = row.guest_name ?? "";

  return {
    id: row.id,
    date: row.date,
    eventType: row.event_type ?? "entrenamiento",
    playerId: row.player_id ?? createGuestPlayerId(row.date, guestName),
    status: row.status,
    source: row.source ?? "jugador",
    participantType,
    guestName,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupabasePayment(payment) {
  return {
    id: payment.id,
    player_id: payment.playerId,
    fee_id: payment.feeId,
    amount: Number(payment.amount) || 0,
    paid_at: payment.paidAt,
    method: payment.method ?? "transferencia",
    status: payment.status ?? "aprobado",
    operation_number: payment.operationNumber ?? "",
    receipt_note: payment.receiptNote ?? "",
    note: payment.note ?? "",
    created_at: payment.createdAt ?? new Date().toISOString(),
    reviewed_at: payment.reviewedAt ?? null,
    reviewed_by: payment.reviewedBy ?? null,
  };
}

function toSupabaseAttendance(attendance) {
  const participantType = attendance.participantType ?? (attendance.guestName ? "guest" : "player");

  return {
    id: attendance.id,
    date: attendance.date,
    event_type: attendance.eventType ?? "entrenamiento",
    player_id: participantType === "guest" ? null : attendance.playerId,
    status: attendance.status,
    source: attendance.source ?? "jugador",
    participant_type: participantType,
    guest_name: participantType === "guest" ? attendance.guestName ?? "" : null,
    created_at: attendance.createdAt ?? new Date().toISOString(),
    updated_at: attendance.updatedAt ?? new Date().toISOString(),
  };
}

function createGuestPlayerId(date, guestName) {
  const normalizedName = String(guestName ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `guest-${date}-${normalizedName || "invitado"}`;
}

function fromSupabaseTreasuryConfig(row) {
  return {
    paymentAlias: row.payment_alias ?? "",
    accountHolder: row.account_holder ?? "",
    paymentLink: row.payment_link ?? "",
    paymentTestMode: Boolean(row.payment_test_mode),
    paymentInstructions: row.payment_instructions ?? "",
  };
}

function getGuestNameForAttendance(attendance) {
  return String(attendance?.guestName ?? "").trim();
}

function isRemovedGuestAttendance(attendance) {
  return (
    attendance?.participantType === "guest" &&
    String(attendance?.source ?? "").split("|").includes("removed=1")
  );
}

function toSupabaseTreasuryConfig(config) {
  return {
    id: "main",
    payment_alias: config.paymentAlias ?? "",
    account_holder: config.accountHolder ?? "",
    payment_link: config.paymentLink ?? "",
    payment_test_mode: Boolean(config.paymentTestMode),
    payment_instructions: config.paymentInstructions ?? "",
    updated_at: new Date().toISOString(),
  };
}
