import "server-only";

/**
 * How each service actually authenticates, and how to prove a credential works.
 *
 *   token    — personal/bot token you paste (GitHub, Slack bot, Notion…)
 *   webhook  — URL that accepts posts (legacy Slack incoming webhooks)
 *   oauth    — needs a client id/secret registered with the provider
 */

export type AuthKind = "token" | "webhook" | "oauth";

export interface Provider {
  kind: AuthKind;
  label: string;
  help: string;
  docs?: string;
  verify?: (secret: string) => Promise<{ ok: boolean; account?: string; error?: string }>;
}

const json = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export const PROVIDERS: Record<string, Provider> = {
  github: {
    kind: "token",
    label: "Personal access token",
    help: "GitHub → Settings → Developer settings → Personal access tokens. Give it repo scope.",
    docs: "https://github.com/settings/tokens",
    async verify(secret) {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "trove",
        },
      });
      if (!res.ok) {
        return {
          ok: false,
          error:
            res.status === 401
              ? "GitHub rejected that token."
              : `GitHub returned ${res.status}.`,
        };
      }
      const me = await json(res);
      return { ok: true, account: me?.login ? `@${me.login}` : "connected" };
    },
  },

  slack: {
    kind: "token",
    label: "Bot token (xoxb-) or incoming webhook URL",
    help:
      "Preferred: Slack app → OAuth & Permissions → Bot User OAuth Token (xoxb-…) with channels:history, channels:read, groups:history, chat:write. " +
      "Or: Incoming Webhooks → webhook URL (post only, cannot read messages).",
    docs: "https://api.slack.com/authentication/token-types",
    async verify(secret) {
      const s = secret.trim();
      if (/^xox[bpoa]-/i.test(s)) {
        const res = await fetch("https://slack.com/api/auth.test", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${s}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
        const data = await json(res);
        if (!data?.ok) {
          return {
            ok: false,
            error: data?.error
              ? `Slack rejected that token (${data.error}).`
              : "Slack rejected that token.",
          };
        }
        const team = data.team ? String(data.team) : "workspace";
        const user = data.user ? String(data.user) : "";
        return { ok: true, account: user ? `${team} · ${user}` : team };
      }
      if (/^https:\/\/hooks\.slack\.com\//.test(s)) {
        const res = await fetch(s, { method: "POST", body: "" });
        const body = await res.text().catch(() => "");
        if (res.status === 404 || /no_service|no_team/i.test(body)) {
          return { ok: false, error: "Slack does not recognise that webhook." };
        }
        return { ok: true, account: "workspace webhook (send-only)" };
      }
      return {
        ok: false,
        error:
          "Paste a Slack bot token (xoxb-…) to read channels, or an incoming webhook URL to post only.",
      };
    },
  },

  notion: {
    kind: "token",
    label: "Internal integration secret",
    help: "Notion → Settings → Connections → Develop or manage integrations → New integration.",
    docs: "https://www.notion.so/my-integrations",
    async verify(secret) {
      const res = await fetch("https://api.notion.com/v1/users/me", {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Notion-Version": "2022-06-28",
        },
      });
      if (!res.ok) return { ok: false, error: `Notion returned ${res.status}.` };
      const me = await json(res);
      return { ok: true, account: me?.bot?.workspace_name ?? me?.name ?? "connected" };
    },
  },

  linear: {
    kind: "token",
    label: "API key",
    help: "Linear → Settings → API → Personal API keys.",
    docs: "https://linear.app/settings/api",
    async verify(secret) {
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { Authorization: secret, "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ viewer { name email } }" }),
      });
      const data = await json(res);
      if (!res.ok || data?.errors) {
        return { ok: false, error: "Linear rejected that key." };
      }
      return {
        ok: true,
        account: data?.data?.viewer?.email ?? data?.data?.viewer?.name ?? "connected",
      };
    },
  },
};

export function providerFor(service: string): Provider {
  return (
    PROVIDERS[service] ?? {
      kind: "oauth",
      label: "OAuth",
      help: "This service needs an OAuth app registered with the provider.",
    }
  );
}
