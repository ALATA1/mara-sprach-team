"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "beneficiary" | "teacher" | "volunteer" | "admin";
  createdAt: string;
  emailConfirmed: boolean;
  membershipStatus: string;
  subscription: { plan_id: string; status: string; current_period_end: string | null } | null;
};
type Payment = {
  id: string;
  user_id: string;
  customerName: string;
  product_type: string;
  status: string;
  amount_cents: number;
  currency: string;
  provider_payment_intent_id: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
  refundActions: { id: string; status: string; stripe_refund_id: string | null }[];
};
type Subscription = {
  id: string;
  user_id: string;
  customerName: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  hasStripeCustomer: boolean;
};
type Tab = "accounts" | "billing";

export function AdminOperations() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundRequestId, setRefundRequestId] = useState("");
  const [refundConfirmation, setRefundConfirmation] = useState("");
  const [refundReason, setRefundReason] = useState("requested_by_customer");

  const loadAccounts = useCallback(async (requestedPage: number) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/staff/admin/accounts?page=${requestedPage}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de charger les comptes.");
      setAccounts(result.accounts ?? []);
      setPage(result.page);
      setHasMore(result.hasMore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les comptes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/staff/admin/payments", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de charger les paiements.");
      setPayments(result.payments ?? []);
      setSubscriptions(result.subscriptions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les paiements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "accounts") void loadAccounts(page);
    else void loadBilling();
  }, [tab, page, loadAccounts, loadBilling]);

  const updateRole = async (account: Account, role: Account["role"]) => {
    if (role === "admin" && account.role !== "admin" &&
      !window.confirm(`Accorder les droits administrateur à ${account.email} ?`)) return;
    setBusy(account.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/staff/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de modifier le rôle.");
      setMessage("Rôle du compte mis à jour.");
      await loadAccounts(page);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Impossible de modifier le rôle.");
    } finally {
      setBusy("");
    }
  };

  const refund = async () => {
    const payment = refundTarget;
    if (!payment || refundConfirmation !== "REMBOURSER") return;
    setBusy(payment.id);
    setError("");
    setMessage("");
    const requestId = refundRequestId || crypto.randomUUID();
    setRefundRequestId(requestId);
    try {
      const response = await fetch("/api/staff/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          requestId,
          confirmation: refundConfirmation,
          reason: refundReason,
        }),
      });
      const result = await response.json();
      if (response.status === 202 && result.pending) {
        setMessage("Stripe a accepté la demande ; le remboursement est encore en cours de traitement.");
        setRefundTarget(null);
        setRefundRequestId("");
        await loadBilling();
        return;
      }
      if (!response.ok) {
        throw new Error(result.retryWithSameRequestId
          ? `${result.error} Ne relancez pas un nouveau remboursement ; contactez le support Stripe avant toute nouvelle tentative.`
          : result.error || "Le remboursement a échoué.");
      }
      setMessage("Remboursement confirmé par Stripe.");
      setRefundTarget(null);
      setRefundRequestId("");
      setRefundConfirmation("");
      await loadBilling();
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : "Le remboursement a échoué.");
    } finally {
      setBusy("");
    }
  };

  const openCustomerPortal = async (subscription: Subscription) => {
    setBusy(subscription.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/staff/admin/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: subscription.user_id }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Impossible d’ouvrir le portail de facturation.");
      window.location.assign(result.url);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Impossible d’ouvrir le portail de facturation.");
      setBusy("");
    }
  };

  return (
    <main className="shell staffDashboard">
      <header className="staffDashboardHeader">
        <div><p className="eyebrow">Administration</p><h1>Comptes et paiements</h1></div>
        <div className="staffFormActions">
          <Link className="btn ghost" href="/">Accueil</Link>
          <Link className="btn ghost" href="/staff">Demandes</Link>
          <Link className="btn ghost" href="/staff/teaching">Cours et LIVE</Link>
        </div>
      </header>
      <div className="staffFormActions" role="tablist" aria-label="Outils d’administration">
        <button className={`btn ${tab === "accounts" ? "primary" : "ghost"}`} role="tab" aria-selected={tab === "accounts"} onClick={() => { setPage(1); setTab("accounts"); }}>Comptes et rôles</button>
        <button className={`btn ${tab === "billing" ? "primary" : "ghost"}`} role="tab" aria-selected={tab === "billing"} onClick={() => setTab("billing")}>Paiements et abonnements</button>
      </div>
      {error && <p className="authError" role="alert">{error}</p>}
      {message && <p className="staffSuccess" role="status">{message}</p>}
      {loading && <p role="status">Chargement…</p>}

      {tab === "accounts" && !loading && (
        <>
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead><tr><th>Compte</th><th>Inscription</th><th>Adhésion</th><th>Formule</th><th>Rôle</th></tr></thead>
              <tbody>{accounts.map((account) => (
                <tr key={account.id}>
                  <td><strong>{[account.firstName, account.lastName].filter(Boolean).join(" ") || "Sans nom"}</strong><br />{account.email}<br /><small>{account.emailConfirmed ? "E-mail confirmé" : "E-mail à confirmer"}</small></td>
                  <td>{new Date(account.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td>{account.membershipStatus}</td>
                  <td>{account.subscription ? `${account.subscription.plan_id} · ${account.subscription.status}` : "Aucune"}</td>
                  <td><select aria-label={`Rôle de ${account.email}`} value={account.role} disabled={busy === account.id} onChange={(event) => void updateRole(account, event.target.value as Account["role"])}>
                    <option value="beneficiary">Étudiant</option><option value="teacher">Formateur</option><option value="volunteer">Bénévole</option><option value="admin">Administrateur</option>
                  </select></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="staffFormActions">
            <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Précédent</button>
            <span>Page {page}</span>
            <button className="btn ghost" disabled={!hasMore} onClick={() => setPage((current) => current + 1)}>Suivant</button>
          </div>
        </>
      )}

      {tab === "billing" && !loading && (
        <>
          <section className="staffRequestList" aria-label="Paiements">
            <h2>Paiements récents</h2>
            {payments.map((payment) => (
              <article className="card staffRequest" key={payment.id}>
                <div className="staffRequestHeading">
                  <div><p className="eyebrow">{payment.product_type} · {payment.customerName || payment.user_id}</p>
                    <h3>{(payment.amount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: payment.currency.toUpperCase() })}</h3>
                    <p className="muted">{new Date(payment.created_at).toLocaleString("fr-FR")} · {payment.status}</p>
                  </div>
                  {payment.hosted_invoice_url && <a className="btn ghost" href={payment.hosted_invoice_url} target="_blank" rel="noreferrer">Facture</a>}
                </div>
                {payment.refundActions.map((action) => <p className="muted" key={action.id}>Remboursement {action.status}{action.stripe_refund_id ? ` · ${action.stripe_refund_id}` : ""}</p>)}
                {payment.status === "succeeded" && payment.provider_payment_intent_id && (
                  <button className="btn ghost" type="button" onClick={() => { setRefundTarget(payment); setRefundRequestId(crypto.randomUUID()); setRefundConfirmation(""); }}>
                    Rembourser intégralement
                  </button>
                )}
                {refundTarget?.id === payment.id && (
                  <section className="refundConfirmation">
                    <p>Cette action déclenche un remboursement intégral dans Stripe. Vérifiez la demande et la politique de remboursement avant de continuer.</p>
                    <label className="field">Motif
                      <select value={refundReason} onChange={(event) => setRefundReason(event.target.value)}>
                        <option value="requested_by_customer">Demandé par le client</option>
                        <option value="duplicate">Paiement en double</option>
                        <option value="fraudulent">Fraude</option>
                      </select>
                    </label>
                    <label className="field">Tapez REMBOURSER pour confirmer
                      <input value={refundConfirmation} onChange={(event) => setRefundConfirmation(event.target.value)} />
                    </label>
                    <div className="staffFormActions">
                      <button className="btn danger" type="button" disabled={busy === payment.id || refundConfirmation !== "REMBOURSER"} onClick={() => void refund()}>
                        {busy === payment.id ? "Traitement…" : "Confirmer le remboursement"}
                      </button>
                      <button className="btn ghost" type="button" onClick={() => { setRefundTarget(null); setRefundRequestId(""); }}>Annuler</button>
                    </div>
                  </section>
                )}
              </article>
            ))}
            {payments.length === 0 && <p>Aucun paiement enregistré.</p>}
          </section>
          <section className="staffRequestList" aria-label="Abonnements">
            <h2>Abonnements récents</h2>
            {subscriptions.map((subscription) => (
              <article className="card staffRequest" key={subscription.id}>
                <strong>{subscription.customerName || subscription.user_id}</strong>
                <p>{subscription.plan_id} · {subscription.status}</p>
                <p className="muted">{subscription.cancel_at_period_end ? "Résiliation programmée" : "Renouvellement actif"}{subscription.current_period_end ? ` · fin de période ${new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}` : ""}</p>
                {subscription.hasStripeCustomer && <button className="btn secondary" type="button" disabled={busy === subscription.id} onClick={() => void openCustomerPortal(subscription)}>
                  {busy === subscription.id ? "Ouverture…" : "Ouvrir la facturation Stripe"}
                </button>}
              </article>
            ))}
            {subscriptions.length === 0 && <p>Aucun abonnement enregistré.</p>}
          </section>
        </>
      )}
    </main>
  );
}
