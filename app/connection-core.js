(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RVConnectionCore = factory();
})(globalThis, () => {
  "use strict";
  class SingleFlight {
    constructor() {
      this.promise = null;
    }
    run(fn) {
      if (this.promise) return this.promise;
      this.promise = Promise.resolve()
        .then(fn)
        .finally(() => {
          this.promise = null;
        });
      return this.promise;
    }
  }
  const timeout = (promise, ms = 12000) => {
    let t;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        t = setTimeout(
          () =>
            reject(
              Object.assign(Error("The service did not respond in time."), {
                status: 408,
              }),
            ),
          ms,
        );
      }),
    ]).finally(() => clearTimeout(t));
  };
  function publicKey(key) {
    if (typeof key !== "string" || !key.trim())
      throw Error("Enter the project public key.");
    if (/^sb_secret_/i.test(key))
      throw Error("Secret Supabase keys cannot be stored in a browser.");
    if (key.split(".").length === 3) {
      let p;
      try {
        const part = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        p = JSON.parse(
          typeof atob === "function"
            ? atob(part)
            : Buffer.from(part, "base64").toString(),
        );
      } catch {
        throw Error("The public key is not a valid token.");
      }
      if (p.role && p.role !== "anon")
        throw Error(
          "Use an anon or publishable key, never a privileged server key.",
        );
    }
    return key.trim();
  }
  function configuration(url, key) {
    let u;
    try {
      u = new URL(url);
    } catch {
      throw Error("Enter your Supabase project HTTPS URL.");
    }
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      !["", "/"].includes(u.pathname)
    )
      throw Error(
        "Use the HTTPS project origin without a path or credentials.",
      );
    return { url: u.origin, key: publicKey(key) };
  }
  const stable = (value) => {
    if (value === null || typeof value !== "object")
      return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    return (
      "{" +
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => JSON.stringify(k) + ":" + stable(value[k]))
        .join(",") +
      "}"
    );
  };
  async function hash(value) {
    const data = new TextEncoder().encode(stable(value)),
      digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  function createSync({
    client,
    getData,
    replace,
    canReplace = () => true,
    validate,
    onState = () => {},
    readState = () => ({}),
    writeState = () => {},
    digest = hash,
    now = Date.now,
  }) {
    const flight = new SingleFlight();
    let state = {
        status: "idle",
        message: "Private cloud synchronization is optional.",
        ...readState(),
      },
      user = null;
    const emit = (status, message) => {
      state = { ...state, status, message };
      onState({ ...state });
      return state;
    };
    const persist = () =>
      writeState({ ...state, status: undefined, message: undefined });
    async function authenticate() {
      const a = await timeout(client.auth.getSession());
      if (a.error) throw a.error;
      let session = a.data?.session;
      if (!session) {
        user = null;
        emit("signed-out", "Sign in to your configured cloud account.");
        return null;
      }
      if (
        Number.isFinite(session.expires_at) &&
        session.expires_at < now() / 1000 + 60
      ) {
        const r = await timeout(client.auth.refreshSession());
        if (r.error) throw r.error;
        session = r.data?.session;
        if (!session) throw Error("Your session expired. Sign in again.");
      }
      const v = await timeout(client.auth.getUser());
      if (v.error) throw v.error;
      user = v.data?.user || null;
      if (!user?.id) throw Error("The service could not verify this account.");
      return user;
    }
    async function row() {
      const q = client
        .from("mindforge_saves")
        .select("data,updated_at,version")
        .eq("user_id", user.id);
      const r = await timeout(q.maybeSingle());
      if (r.error) throw r.error;
      return r.data;
    }
    function failure(e) {
      const setup = ["PGRST202", "PGRST204", "42703", "42P01"].includes(e.code);
      emit(
        setup ? "setup-needed" : "error",
        setup
          ? "Install the included private-cloud migration in your Supabase project."
          : String(e.message || e).slice(0, 240),
      );
      throw e;
    }
    async function flush({ explicit = false, resolution = "" } = {}) {
      return flight.run(async () => {
        try {
          emit(
            "checking",
            "Verifying your account and private cloud snapshot…",
          );
          if (!(await authenticate())) return state;
          const remote = await row(),
            before = stable(getData()),
            localHash = await digest(getData());
          if (remote && !Number.isInteger(remote.version))
            throw Object.assign(
              Error("The cloud table needs the included versioned migration."),
              { code: "42703" },
            );
          if (state.owner !== user.id && !explicit) {
            emit(
              "review-needed",
              "Choose Save to cloud or Restore once to bind this workspace to the signed-in account.",
            );
            return state;
          }
          if (explicit && state.owner !== user.id) {
            state = {
              ...state,
              owner: user.id,
              version: null,
              cleanHash: null,
            };
          }
          const remoteData = remote ? validate(remote.data) : null,
            remoteHash = remoteData ? await digest(remoteData) : null;
          if (remoteHash === localHash) {
            state = {
              ...state,
              owner: user.id,
              version: remote.version,
              cleanHash: localHash,
              lastSync: now(),
              pending: false,
            };
            persist();
            return emit(
              "synced",
              "This device and your private cloud copy match.",
            );
          }
          if (resolution === "remote") {
            if (!remote) throw Error("There is no cloud copy to restore.");
            if (stable(getData()) !== before)
              throw Error(
                "Your local workspace changed during the request. Retry without losing those edits.",
              );
            replace(remoteData);
            state = {
              ...state,
              owner: user.id,
              version: remote.version,
              cleanHash: await digest(getData()),
              lastSync: now(),
              pending: false,
            };
            persist();
            return emit(
              "synced",
              "Your private cloud copy was restored on this device.",
            );
          }
          const localChanged =
              !state.cleanHash || state.cleanHash !== localHash,
            remoteChanged =
              !!remote &&
              (state.version === null ||
                state.version === undefined ||
                remote.version !== state.version);
          if (remoteChanged && localChanged && resolution !== "local") {
            state = { ...state, remoteVersion: remote.version };
            return emit(
              "conflict",
              "Both copies have changes. Review them and choose which copy to keep. Nothing was overwritten.",
            );
          }
          if (remoteChanged && !localChanged) {
            if (!canReplace()) {
              state = { ...state, pending: true };
              persist();
              return emit(
                "waiting",
                "Cloud changes are waiting for your editor to close. Your draft is safe.",
              );
            }
            if (stable(getData()) !== before)
              throw Error(
                "Local edits arrived while checking the cloud. No data was replaced.",
              );
            replace(remoteData);
            state = {
              ...state,
              version: remote.version,
              cleanHash: await digest(getData()),
              lastSync: now(),
              pending: false,
            };
            persist();
            return emit(
              "synced",
              "Newer private cloud changes were restored safely.",
            );
          }
          if (!localChanged && remote)
            return emit("synced", "Your private cloud copy is current.");
          const payload = {
            schemaVersion: getData().schemaVersion,
            appVersion: "1.1.0",
            data: structuredClone(getData()),
            updatedAt: new Date(now()).toISOString(),
          };
          const result = await timeout(
            client.rpc("rowanvale_compare_and_save", {
              p_expected_version: remote?.version || 0,
              p_data: payload,
              p_user_id: user.id,
            }),
          );
          if (result.error) {
            if (result.error.code === "40001") {
              emit(
                "conflict",
                "The cloud changed during saving. Your local work is safe; review both copies.",
              );
              return state;
            }
            throw result.error;
          }
          const version = Number(
            Array.isArray(result.data)
              ? result.data[0]?.version
              : result.data?.version || result.data,
          );
          if (!Number.isInteger(version) || version < 1)
            throw Error("The cloud did not return a valid save receipt.");
          state = {
            ...state,
            owner: user.id,
            version,
            cleanHash: localHash,
            lastSync: now(),
            pending: stable(getData()) !== before,
          };
          persist();
          return emit(
            state.pending ? "pending" : "synced",
            state.pending
              ? "The saved copy is safe; newer local edits are queued."
              : "Your private cloud copy was saved.",
          );
        } catch (e) {
          failure(e);
        }
      });
    }
    return {
      authenticate,
      flush,
      snapshot: () => ({ ...state }),
      pending() {
        state.pending = true;
        persist();
        emit(
          "pending",
          "Local changes are saved and waiting for private cloud synchronization.",
        );
      },
      signedOut() {
        user = null;
        emit("signed-out", "Signed out. Local data was kept.");
      },
    };
  }
  function createOAuthSession({
    load,
    store,
    fetcher = fetch,
    onError = () => {},
    now = Date.now,
  }) {
    const gate = new SingleFlight();
    return {
      token(force = false) {
        return gate.run(async () => {
          const t = load();
          if (!t) return "";
          if (!force && t.expiresAt > now() + 30000) return t.accessToken || "";
          if (!t.refreshToken || !t.clientId) {
            onError("Reconnect this account to renew its expired session.");
            return "";
          }
          if (t.retryAt > now()) {
            onError(
              "The provider is cooling down. Try again after " +
                new Date(t.retryAt).toLocaleTimeString() +
                ".",
            );
            return "";
          }
          try {
            const r = await fetcher("https://accounts.spotify.com/api/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: t.refreshToken,
                client_id: t.clientId,
              }),
              signal: AbortSignal.timeout(10000),
            });
            if (r.status === 429) {
              const wait = Math.min(
                300,
                Math.max(2, Number(r.headers.get("retry-after")) || 60),
              );
              store({ ...t, retryAt: now() + wait * 1000 });
              throw Error(
                "Spotify rate limit reached. Session renewal is queued for later.",
              );
            }
            const body = await r.json();
            if (!r.ok) {
              if (body.error === "invalid_grant" || r.status === 401) {
                store(null);
                throw Error(
                  "Spotify permission expired or was revoked. Reconnect the account.",
                );
              }
              throw Error("Spotify session renewal failed (" + r.status + ").");
            }
            if (!body.access_token)
              throw Error("The provider did not return a session token.");
            const next = {
              ...t,
              accessToken: body.access_token,
              refreshToken: body.refresh_token || t.refreshToken,
              expiresAt:
                now() + Math.max(30, Number(body.expires_in) || 3600) * 1000,
              retryAt: 0,
            };
            store(next);
            return next.accessToken;
          } catch (e) {
            onError(e.message);
            return "";
          }
        });
      },
    };
  }
  return {
    SingleFlight,
    timeout,
    publicKey,
    configuration,
    stable,
    hash,
    createSync,
    createOAuthSession,
  };
});
