
# Project: OpenBotAuth Demos (LangChain Agent + Apps Widget)

## Purpose

Create a public, reproducible demo pack that proves:
**Unsigned agent ⇒ teaser/402; Signed agent (RFC 9421 + JWKS) ⇒ full content**
Targets:

* **HN + GitHub**: a LangChain agent you can run locally.
* **OpenAI internal**: a minimal “Apps-SDK widget” that calls a backend which performs **server-side signed fetch** and shows headers + verdicts.

Non-goals:

* No hosted signer; private keys stay local (env/OS keychain).
* No CDN dependency; origin-first verification (WordPress plugin or sidecar) is assumed to be live at a demo URL.

---

## High-Level Architecture

```mermaid
flowchart LR
  A[Agent (LangChain)] -- unsigned fetch --> O[(Origin with OBA WP Plugin)]
  A2[Agent (LangChain)] -- signed fetch (RFC 9421) --> O

  subgraph Apps Widget
    UI[Chat UI iframe/app] --> B[Backend / Signed Fetch API]
  end

  B -- unsigned or signed fetch --> O

  O -->|teaser/402/allow + X-OBA-Decision| A & B
```

* **Signing strategy**: HTTP Message Signatures (RFC 9421).
  Components to sign: `@method @authority @path` + (optionally) `x-oba-kid` and `x-oba-enterprise-id`.
  Headers set: `Signature-Input`, `Signature`, `Signature-Agent`.
  `created`/`expires` window ≤ 300s. Algorithm **Ed25519** (EdDSA).
* **Directory/JWKS**: point `Signature-Agent` to your published directory doc with JWKS for the key id (KID).

---

## Repository Layout

Create a monorepo `openbotauth-demos/`:

```
openbotauth-demos/
  README.md
  LICENSE
  .gitignore
  .env.example

  /examples/
    /langchain-agent/
      demo_agent.py
      signed_fetch.py
      requirements.txt
      .env.example

  /packages/
    /signing-ts/
      package.json
      tsconfig.json
      src/index.ts          # TS signer for server-side widget
      src/rfc9421.ts        # canonicalization helpers
      src/ed25519.ts        # noble/ed25519 bindings
      test/signing.test.ts

  /apps/
    /widget-backend/
      package.json
      tsconfig.json
      src/server.ts         # Express: /api/fetch (unsigned|signed param)
      src/config.ts
      src/types.ts
      src/logger.ts

    /widget-frontend/
      package.json
      vite.config.ts
      src/main.tsx
      src/App.tsx           # URL input, toggle unsigned/signed, result panel
      src/components/HeadersDiff.tsx
      public/index.html
```

> Rationale: Python for the agent demo (LangChain ecosystem), TypeScript for the widget (fast HTTP server + reusability). Shared signing logic is in `/packages/signing-ts`.

---

## Environment Variables

Top-level `.env.example` (duplicate per app as needed):

```bash
# Key material (dev only; do not commit private keys)
OBA_PRIVATE_KEY_BASE64URL=             # Ed25519 private key (base64url)
OBA_PUBLIC_KEY_BASE64URL=              # Ed25519 public key (base64url)
OBA_KID=oba-demo-kid-001               # stable identifier (hash of pubkey or short label)
OBA_SIGNATURE_AGENT_URL=https://registry.openbotauth.org/u/your-handle/agent.json

# Demo origin to fetch (your WP site with OBA plugin)
DEMO_URL=https://demo.openbotauth.org/premium-post

# Widget backend
WIDGET_PORT=8089
WIDGET_SIGNED_DEFAULT=false
```

For Python agent (`examples/langchain-agent/.env.example`), mirror the same four key vars.

---

## LangChain Agent Demo (Python)

### Requirements

`examples/langchain-agent/requirements.txt`:

```
langchain>=0.2
httpx>=0.27
python-dotenv>=1.0
pydantic>=2
```

### `signed_fetch.py` (core signer functions)

Implement:

* `build_signature_input(method, url, extra_headers: dict, created: int, expires: int, kid: str) -> str`
* `sign_ed25519(message: bytes, private_key_b64url: str) -> str` → returns signature in base64url
* `make_signed_headers(method, url, headers: dict, kid: str, sig_agent_url: str, privkey_b64url: str) -> dict`

  * Canonicalize `@method @authority @path` plus lowercase header names (like `x-oba-kid`, `x-oba-enterprise-id` if present).
  * Construct `Signature-Input: sig1=(...);created=...;expires=...;keyid="<kid>";alg="ed25519"`.
  * Construct `Signature: sig1=:<base64url(signature)>:`.
  * Set `Signature-Agent: <sig_agent_url>`.

Keep implementation ≈100–150 lines. Use stable base64url (no padding). Enforce `(expires - created) <= 300`.

### `demo_agent.py` (two modes: unsigned/signed)

* CLI args: `--mode [unsigned|signed]`, `--url <URL> (default from env DEMO_URL)`
* Tools:

  * `fetch_unsigned(url) -> {status, bytes, headers, text[:N]}`
  * `fetch_signed(url) -> same`, calling `make_signed_headers(...)`
* Agent (simple): “Fetch → summarize” (prompt the LLM with content; or skip the LLM and just print sizes/headers if you prefer minimal footprint).
* Print:

  * HTTP status, response bytes, selected headers (e.g., `X-OBA-Decision`, `Signature-Input`, `Signature-Agent` echoed by origin if any).
  * First 200 chars of body with an indicator `[TEASER]` vs `[FULL]` if you can detect.
* Exit codes: `0` on allow (full), `2` on teaser/402, `1` on error.

**Acceptance:**
`python demo_agent.py --mode unsigned` ⇒ teaser/402.
`python demo_agent.py --mode signed` ⇒ full + `X-OBA-Decision: allow`.

---

## Apps Widget (Backend + Frontend)

This is a tiny web app you can host anywhere; it **does not** need OpenAI-specific SDK calls. The idea: an iframe-friendly UI that hits your backend `/api/fetch` with `signed: true|false`. Your backend performs the fetch and returns `{status, headers, bodySnippet, bytes, signed, trace}`.

### `/packages/signing-ts/`

* Depend on `@noble/ed25519` and a small base64url helper.
* Export `makeSignedHeaders(method, url, headers, opts)` mirroring Python logic:

  * Canonicalize `@method @authority @path`.
  * Add `Signature-Input`, `Signature`, `Signature-Agent`.
  * Enforce 300s window.

Tests:

* Unit test that a known `(method, url, created/expires, kid, privkey)` yields a stable `Signature-Input` and `Signature` (golden vector).

### `/apps/widget-backend/src/server.ts` (Express)

Endpoints:

* `POST /api/fetch`

  * Body: `{ url: string, signed?: boolean, extraHeaders?: Record<string,string> }`
  * If `signed`, call `makeSignedHeaders(...)` and merge with `extraHeaders`.
  * Perform fetch with reasonable timeout.
  * Return JSON:

    ```ts
    {
      status: number,
      bytes: number,
      headers: Record<string,string>,
      bodySnippet: string,        // first ~400 chars, strip tags
      signed: boolean,
      request: { method, url, headers },   // sanitized
      trace: {
        created, expires, kid, signatureInput // if signed
      }
    }
    ```
* Health check: `GET /healthz`.

Config:

* Load keys and KID from env.
* Log each request with latency and whether signed.

### `/apps/widget-frontend/`

Simple Vite + React app:

* Inputs: URL, toggle [Unsigned | Signed], button “Fetch”.
* Panels:

  * Result summary: status, bytes, `X-OBA-Decision` if present.
  * Headers diff: show added `Signature-Input`/`Signature`/`Signature-Agent` when signed.
  * Body preview (first N chars) with `[TEASER]` vs `[FULL]` tag if detectable.

Build: `pnpm -F @oba/widget-frontend build`
Serve via the backend (optional) or static host. Make sure CSP is friendly to iframe embedding.

---

## Commands & Tooling

Top-level:

* `pnpm i`
* `pnpm -r build`
* `pnpm -F @oba/widget-backend dev` ([http://localhost:${WIDGET_PORT}](http://localhost:${WIDGET_PORT}))
* `pnpm -F @oba/widget-frontend dev`

Python agent:

* `cd examples/langchain-agent`
* `python -m venv .venv && source .venv/bin/activate`
* `pip install -r requirements.txt`
* `cp .env.example .env && edit`
* `python demo_agent.py --mode unsigned`
* `python demo_agent.py --mode signed`

---

## Security & Key Handling

* **No hosted signer.** Private keys only in local env (demo scope). In production, prefer passkey-gated browser signer or SSH PoP → ephemeral session key.
* Do **not** log private keys. Redact `Signature` in logs beyond the first 10 chars.
* Enforce `(expires - created) ≤ 300`. Reject if clock skew > 5 minutes (optional).
* Support multi-alg in the future (ES256/WebAuthn), but ship Ed25519 now.

---

## Tests

* **TS unit tests** in `/packages/signing-ts/test/`:

  * Deterministic `Signature-Input` for known inputs.
  * Ed25519 signature matches fixture.
* **Python smoke test**:

  * If `DEMO_URL` is reachable, assert `unsigned.status in (200,402)` and `signed.status==200`, and `bytes_signed > bytes_unsigned`.

---

## README Quickstart (top-level)

Include:

1. What it does (teaser/402 vs allow).
2. One-liner to run **widget backend** and **frontend**.
3. Python agent quickstart (`unsigned` then `signed`).
4. Link to RFC 9421 and your JWKS/directory doc format.
5. Note on origin policy (assumes a WP plugin/sidecar is enforcing).

---

## Video Script (90 seconds)

1. Terminal: `python demo_agent.py --mode unsigned …` → show teaser/`X-OBA-Decision: teaser`.
2. Terminal: `python demo_agent.py --mode signed …` → show full/`X-OBA-Decision: allow`.
3. Switch to widget UI: enter same URL → Unsigned (teaser) → toggle Signed → Full + headers diff (Signature-Input/Signature visible).
4. End: “Origin-first, provider-neutral. Code and docs in repo.”

---

## HN Post (draft)

**Title**: Agents that prove identity get full content; others get a teaser/402 (OSS demo)

**Body (bullets)**

* Open-source demos showing **unsigned ⇒ teaser/402**, **signed (RFC 9421) ⇒ full**.
* Includes a **LangChain agent** and a tiny **widget** that does **server-side signed fetch**.
* Provider-neutral: no CDN dependency; origin enforces via plugin/sidecar.
* Keys: Ed25519 (JWKS published). Headers: `Signature-Input`, `Signature`, `Signature-Agent`.
* Repo + 90-sec video + policy examples (tag-based, time windows, optional 402).
* Roadmap: NGINX sidecar, provider catalog, payouts.

---

## Acceptance Criteria (must pass before posting)

* **Unsigned agent** ⇒ teaser or 402, visible in terminal and widget.
* **Signed agent** ⇒ full content; `X-OBA-Decision: allow` present.
* Widget returns signed trace (created/expires/kid) and shows headers diff.
* Keys never printed; `Signature` partially redacted in logs.
* README quickstart works on a fresh machine.

---

## Tasks for Codegen (Cursor/Claude)

1. Scaffold the repo structure above.
2. Implement `/packages/signing-ts` with Ed25519 signer + RFC 9421 canonicalization for `@method @authority @path`.
3. Implement `/apps/widget-backend` Express server with `/api/fetch`.
4. Implement `/apps/widget-frontend` React UI (URL input, Unsigned/Signed toggle, results + headers diff).
5. Implement `/examples/langchain-agent/signed_fetch.py` and `demo_agent.py`.
6. Add unit tests (TS) and a Python smoke test.
7. Generate `.env.example` files and wire config.
8. Write the top-level README with Quickstart and the video script.
9. Ensure all commands run with `pnpm` and `python` v3.10+.
10. (Optional) Provide a Dockerfile/compose for the widget.

---

## Nice-to-Have (if time permits)

* Add a `--headers` option to agent demo to show signature headers inline.
* Add `x-oba-kid` and `x-oba-enterprise-id` to the signed set (and include them in `Signature-Input`).
* Frontend “copy curl” button for both modes.

---

**End of design-doc prompt. Build this repo now.**