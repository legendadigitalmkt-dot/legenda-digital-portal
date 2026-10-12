import React, { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { Button } from "../../components/ui/button";
export function usePortalUser() {
  const [user, setUser] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!db) {
      setReady(true);
      return;
    }
    const apply = async () => {
      try {
        const { data, error } = await db!.auth.getUser();
        if (active) {
          setUser(error ? null : data.user?.id || null);
          setReady(true);
          setError(
            error &&
              error.status !== 401 &&
              error.name !== "AuthSessionMissingError"
              ? "Não foi possível verificar sua conta."
              : "",
          );
        }
      } catch {
        if (active) {
          setReady(true);
          setError("Conexão com a conta indisponível.");
        }
      }
    };
    apply();
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange(() => setTimeout(apply, 0));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return { user, ready, error };
}
export function PortalAuth() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [registration, setRegistration] = useState<boolean | null>(null),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    let active = true;
    const url = import.meta.env.VITE_SUPABASE_URL,
      key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (url && key)
      fetch(url + "/auth/v1/settings", {
        headers: { apikey: key },
        signal: AbortSignal.timeout(8000),
      })
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((v) => {
          if (active)
            setRegistration(
              v.disable_signup === false && v.external?.email === true,
            );
        })
        .catch(() => {
          if (active) setRegistration(null);
        });
    return () => {
      active = false;
    };
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    setMessage("");
    try {
      const r = signup
        ? await db.auth.signUp({ email: email.trim().toLowerCase(), password })
        : await db.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
      setMessage(
        r.error
          ? "Não foi possível entrar. Confira e-mail, senha e confirmação da conta."
          : signup && !r.data.session
            ? "Confira seu e-mail para confirmar sua conta do portal."
            : "Você entrou na sua conta do portal.",
      );
      setPassword("");
    } catch {
      setMessage("Conexão indisponível. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="portal-auth" aria-label="Conta do portal">
      <h2>{signup ? "Criar conta do portal" : "Entrar na conta do portal"}</h2>
      <p>
        Use a mesma conta dos comentários. Seu histórico de ferramentas é
        privado.
      </p>
      <form onSubmit={submit}>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={signup ? 12 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {signup && (
          <label className="tool-check">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Li os <a href="/termos">termos</a> e a{" "}
            <a href="/privacidade">política de privacidade</a>.
          </label>
        )}
        <Button disabled={!db || busy}>
          {busy ? "Verificando…" : signup ? "Criar conta" : "Entrar"}
        </Button>
      </form>
      {registration && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
        >
          {signup ? "Já tenho uma conta" : "Criar conta do portal"}
        </Button>
      )}
      {registration === false && (
        <p className="microcopy">
          Novos cadastros do portal ainda não estão liberados. Você pode usar
          todas as ferramentas sem conta.
        </p>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
