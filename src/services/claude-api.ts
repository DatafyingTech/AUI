import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { join } from "@/utils/paths";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Load the API key from .aui/settings.json
 */
export async function getApiKey(projectPath: string): Promise<string | null> {
  try {
    const settingsPath = join(projectPath, ".aui", "settings.json");
    if (!(await exists(settingsPath))) return null;
    const raw = await readTextFile(settingsPath);
    const parsed = JSON.parse(raw);
    return parsed.apiKey || null;
  } catch {
    return null;
  }
}

/**
 * Test whether the API key is valid by making a minimal request.
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Generate text using Claude API.
 * Returns the assistant's response content.
 */
export async function generateText(
  apiKey: string,
  prompt: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
  },
): Promise<string> {
  const model = options?.model ?? "claude-haiku-4-5-20251001";
  const maxTokens = options?.maxTokens ?? 1024;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };

  if (options?.systemPrompt) {
    body.system = options.systemPrompt;
  }

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    throw new Error(
      `Network error calling Claude API: ${message}. Check your internet connection and try again.`,
    );
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "Unknown error");
    if (resp.status === 401) {
      throw new Error("Invalid API key. Check your key in Settings.");
    }
    if (resp.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }
    throw new Error(`Claude API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const textBlock = data.content?.find((c: { type: string }) => c.type === "text");
  return textBlock?.text ?? "";
}
