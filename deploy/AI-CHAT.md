# Fixpoint AI chat (Hostinger)

Public widget → `POST /api/ai/chat` → OpenAI when `OPENAI_API_KEY` is set; otherwise failsafe:

> The assistant is not configured or cannot complete an automated assessment right now…

## Required environment variable

| Name | Example | Get key |
|------|---------|---------|
| `OPENAI_API_KEY` | `sk-...` | https://platform.openai.com/api-keys → **Create new secret key** |
| `OPENAI_MODEL` | `gpt-4o-mini` (optional) | Defaults to `gpt-4o-mini` |

Exact name: **`OPENAI_API_KEY`** (not `OPEN_AI_API_KEY`, not `NEXT_PUBLIC_OPENAI_API_KEY`).

## Hostinger

1. OpenAI account with billing enabled (gpt-4o-mini is cheap; free trial may work briefly).
2. Create API key → copy `sk-...` once.
3. Hostinger hPanel → your **Web App** (fixpoint.ae) → **Environment Variables**.
4. Add:
   - `OPENAI_API_KEY` = `sk-...` (your real key)
   - Optional: `OPENAI_MODEL` = `gpt-4o-mini`
5. **Save** → **Redeploy** / restart the Web App (required for env to load).
6. Smoke-test: open https://fixpoint.ae/en → AI widget → send “hi”. You should get a normal assistant reply, not the failsafe sentence.

## Verify from logs

Server logs for failsafe include:

```json
{"provider":"failsafe","error":"missing_openai_api_key",...}
```

If the key is set but OpenAI errors/timeouts:

```json
{"provider":"failsafe","error":"openai_unavailable",...}
```

## Local

Set the same vars in `.env` (never commit). `.env.example` documents the names.

## Code path

- Widget: `src/components/ai/AiWidget.tsx` / `AiPanel.tsx`
- Route: `src/app/api/ai/chat/route.ts`
- Orchestrator: `src/lib/ai/orchestrator.ts`
- OpenAI provider: `src/lib/ai/openai.ts`
- Failsafe: `src/lib/ai/failsafe.ts`
