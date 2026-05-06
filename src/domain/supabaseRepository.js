import { supabaseConfig } from "../config/supabaseConfig.js";

let clientPromise = null;

export function isSupabaseEnabled() {
  return Boolean(supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey);
}

export async function loadSupabaseState(fallbackState) {
  const client = await getSupabaseClient();
  const [playersResult, feesResult, paymentsResult, treasuryResult] = await Promise.all([
    client.from("players").select("*").order("first_name", { ascending: true }),
    client.from("fees").select("*").order("month", { ascending: true }),
    client
      .from("payments")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    client.from("treasury_config").select("*").eq("id", "main").maybeSingle(),
  ]);

  assertSupabaseResult(playersResult, "players");
  assertSupabaseResult(feesResult, "fees");
  assertSupabaseResult(paymentsResult, "payments");
  assertSupabaseResult(treasuryResult, "treasury_config");

  const players = playersResult.data.map(fromSupabasePlayer);
  const fees = feesResult.data.map(fromSupabaseFee);
  const payments = paymentsResult.data.map(fromSupabasePayment);
  const treasuryConfig = treasuryResult.data
    ? fromSupabaseTreasuryConfig(treasuryResult.data)
    : fallbackState.treasuryConfig;

  return {
    ...fallbackState,
    players: players.length > 0 ? players : fallbackState.players,
    fees: fees.length > 0 ? fees : fallbackState.fees,
    payments,
    treasuryConfig,
  };
}

export async function saveSupabaseState(state) {
  const client = await getSupabaseClient();
  const players = state.players.map(toSupabasePlayer);
  const fees = state.fees.map(toSupabaseFee);
  const payments = state.payments.map(toSupabasePayment);
  const treasuryConfig = toSupabaseTreasuryConfig(state.treasuryConfig);

  const results = await Promise.all([
    players.length
      ? client.from("players").upsert(players, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    fees.length
      ? client.from("fees").upsert(fees, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    payments.length
      ? client.from("payments").upsert(payments, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    client.from("treasury_config").upsert(treasuryConfig, { onConflict: "id" }),
  ]);

  results.forEach((result, index) => {
    assertSupabaseResult(result, ["players", "fees", "payments", "treasury_config"][index]);
  });
}

export async function deleteSupabasePayment(paymentId) {
  const client = await getSupabaseClient();
  const result = await client
    .from("payments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", paymentId);

  assertSupabaseResult(result, "payments");
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

function assertSupabaseResult(result, tableName) {
  if (result.error) {
    throw new Error(`${tableName}: ${result.error.message}`);
  }
}

function fromSupabasePlayer(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? "",
    phone: row.phone ?? "",
    type: row.type,
    status: row.status,
    internalEnabled: Boolean(row.internal_enabled),
    responsibilityScore: Number(row.responsibility_score) || 0,
    accessCode: row.access_code ?? "",
  };
}

function toSupabasePlayer(player) {
  return {
    id: player.id,
    first_name: player.firstName,
    last_name: player.lastName ?? "",
    phone: player.phone ?? "",
    type: player.type,
    status: player.status,
    internal_enabled: Boolean(player.internalEnabled),
    responsibility_score: Number(player.responsibilityScore) || 0,
    access_code: player.accessCode ?? "",
    updated_at: new Date().toISOString(),
  };
}

function fromSupabaseFee(row) {
  return {
    id: row.id,
    month: row.month,
    trainingSessionCost: Number(row.training_session_cost) || 0,
    sundayCost: Number(row.sunday_cost) || 0,
    trainingBillingBase: row.training_billing_base === null ? null : Number(row.training_billing_base),
    sundayBillingBase: row.sunday_billing_base === null ? null : Number(row.sunday_billing_base),
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

function fromSupabaseTreasuryConfig(row) {
  return {
    paymentAlias: row.payment_alias ?? "",
    accountHolder: row.account_holder ?? "",
    paymentLink: row.payment_link ?? "",
    paymentTestMode: Boolean(row.payment_test_mode),
    paymentInstructions: row.payment_instructions ?? "",
  };
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
