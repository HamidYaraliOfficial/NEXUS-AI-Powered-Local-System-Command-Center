import { invoke as tauriInvoke } from "@tauri-apps/api/core";

/** Thin wrapper so every call funnels through one place for logging/errors. */
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (err) {
    console.error(`[NEXUS] command "${cmd}" failed:`, err);
    throw err;
  }
}
