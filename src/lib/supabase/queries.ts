import type { UserInsert, UserUpdate, MessageLogInsert } from "@/types/database";
import { createAdminClient } from "./admin";

function getSupabase() {
  return createAdminClient();
}

export async function upsertUser(data: UserInsert) {
  const { data: user, error } = await getSupabase()
    .from("users")
    .upsert(data, { onConflict: "auth_user_id" })
    .select()
    .single();

  if (error) throw error;
  return user;
}

export async function getUserByAuthId(authUserId: string) {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function updateUser(authUserId: string, updates: UserUpdate) {
  const { data, error } = await getSupabase()
    .from("users")
    .update(updates)
    .eq("auth_user_id", authUserId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createMessageLog(log: MessageLogInsert) {
  const { data, error } = await getSupabase()
    .from("message_log")
    .insert(log)
    .select()
    .single();

  if (error) throw error;
  return data;
}
