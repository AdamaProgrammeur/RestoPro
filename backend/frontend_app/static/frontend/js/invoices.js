document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector('[data-resource="invoices"]');
  if (!root) return;

  const api = window.RestoProAPI;
  const body = root.querySelector("tbody");
  const search = root.querySelector("[data-search]");
  const status = root.querySelector("[data-status]");
  let tickets = [];

  const escapeHTML = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  async function allPages(path) {
    let current = path;
    const rows = [];
    while (current) {
      const result = await api.request(current);
      if (Array.isArray(result)) return result;
      rows.push(...(result.results || []));
      current = result.next ? new URL(result.next).pathname + new URL(result.next).search : null;
    }
    return rows;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase("fr");
    const visible = tickets.filter((ticket) => `${ticket.order_number} ${ticket.customer_name || "Client anonyme"}`.toLocaleLowerCase("fr").includes(query));
    if (!visible.length) {
      body.innerHTML = `<tr><td colspan="6" class="table-message">${tickets.length ? "Aucun ticket ne correspond à la recherche." : "Aucune commande à imprimer."}</td></tr>`;
      return;
    }
    body.innerHTML = visible.map((ticket) => {
      const total = Number(ticket.total_amount);
      const confirmed = ticket.payments.filter((payment) => payment.status === "CONFIRMED").reduce((sum, payment) => sum + Number(payment.amount), 0);
      const pending = ticket.payments.filter((payment) => payment.status === "PENDING").reduce((sum, payment) => sum + Number(payment.amount), 0);
      let label = "○ Impayée", tone = "err";
      if (confirmed >= total) { label = "✔ Payée"; tone = "ok"; }
      else if (pending > 0) { label = "◷ À confirmer"; tone = "warn"; }
      else if (confirmed > 0) { label = "◐ Partielle"; tone = "warn"; }
      const time = ticket.created_at ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(ticket.created_at)) : "—";
      const customer = ticket.customer_name === "Client de passage" ? "Client anonyme" : ticket.customer_name || "Client anonyme";
      return `<tr><td><strong>${escapeHTML(ticket.order_number)}</strong>${ticket.invoice_number ? `<small class="ticket-meta">Facture ${escapeHTML(ticket.invoice_number)}</small>` : ""}</td><td>${time}</td><td>${escapeHTML(customer)}</td><td>${total.toLocaleString("fr-FR")} FCFA</td><td><span class="badge ${tone}">${label}</span></td><td><button class="button button-primary button-small ticket-print" type="button" data-print-ticket="${ticket.id}">Imprimer le ticket</button></td></tr>`;
    }).join("");
  }

  async function refresh() {
    status.textContent = "Chargement…";
    try {
      const [orders, payments, invoices] = await Promise.all([allPages("orders/"), allPages("payments/"), allPages("invoices/")]);
      const paymentsByOrder = new Map();
      payments.forEach((payment) => paymentsByOrder.set(payment.order, [...(paymentsByOrder.get(payment.order) || []), payment]));
      const invoicesByOrder = new Map(invoices.map((invoice) => [invoice.order, invoice.invoice_number]));
      tickets = orders.map((order) => ({ ...order, payments: paymentsByOrder.get(order.id) || [], invoice_number: invoicesByOrder.get(order.id) || "" }));
      render();
      status.textContent = `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`;
    } catch (error) {
      status.textContent = error.message;
      body.innerHTML = `<tr><td colspan="6" class="table-message">${escapeHTML(error.message)}</td></tr>`;
    }
  }

  function printTicket(ticket) {
    const popup = window.open("", "_blank", "width=440,height=700");
    if (!popup) {
      window.alert("Autorisez les fenêtres contextuelles pour imprimer le ticket.");
      return;
    }
    const confirmed = ticket.payments.filter((payment) => payment.status === "CONFIRMED");
    const pending = ticket.payments.filter((payment) => payment.status === "PENDING");
    const amountReceived = confirmed.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const waitingAmount = pending.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const total = Number(ticket.total_amount);
    const due = Math.max(0, total - amountReceived);
    const customer = ticket.customer_name === "Client de passage" ? "Client anonyme" : ticket.customer_name || "Client anonyme";
    const createdAt = new Date(ticket.created_at).toLocaleString("fr-FR");
    const methodNames = { CASH: "Espèces", ORANGE_MONEY: "Orange Money", MOOV_MONEY: "Moov Money", WAVE: "Wave", CARD: "Carte bancaire", OTHER: "Autre" };
    const items = ticket.items.map((item) => `<div class="row"><span>${escapeHTML(item.dish_name)}<small>${item.quantity} × ${Number(item.unit_price).toLocaleString("fr-FR")} FCFA</small></span><strong>${Number(item.subtotal).toLocaleString("fr-FR")} FCFA</strong></div>`).join("");
    const paymentRows = confirmed.map((payment) => `<div class="row muted"><span>${escapeHTML(methodNames[payment.method] || payment.method)} · reçu</span><strong>${Number(payment.amount).toLocaleString("fr-FR")} FCFA</strong></div>`).join("");
    const paymentLabel = amountReceived >= total ? "PAYÉE" : waitingAmount > 0 ? "PAIEMENT À CONFIRMER" : amountReceived > 0 ? "PAIEMENT PARTIEL" : "IMPAYÉE";
    const serviceNames = { DINE_IN: "Sur place", TAKEAWAY: "À emporter", DELIVERY: "Livraison" };
    const documentHTML = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Ticket ${escapeHTML(ticket.order_number)}</title><style>*{box-sizing:border-box}body{font:13px/1.45 system-ui,sans-serif;width:76mm;margin:8mm auto;color:#17212b}.center{text-align:center}.brand{font-size:21px;letter-spacing:.02em;margin:0}.sub{font-size:10px;color:#667085}.row{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px dashed #cbd2d9}.row>span{min-width:0}.row small{display:block;color:#667085}.row strong{white-space:nowrap}.muted{font-size:11px;color:#465568}.total{font-size:16px;font-weight:750}.state{text-align:center;font-weight:750;letter-spacing:.04em;padding:8px;border:1px solid #cbd2d9;border-radius:5px;margin:10px 0}hr{border:0;border-top:1px dashed #aab4bf;margin:10px 0}@media print{body{width:76mm;margin:0 auto}}</style><main><header class="center"><h1 class="brand">RestoPro</h1><div class="sub">TICKET DE COMMANDE</div></header><hr><div><strong>${escapeHTML(ticket.order_number)}</strong></div>${ticket.invoice_number ? `<div>Facture : ${escapeHTML(ticket.invoice_number)}</div>` : ""}<div>${escapeHTML(createdAt)}</div><div>Client : ${escapeHTML(customer)}</div><div>Service : ${escapeHTML(serviceNames[ticket.order_type] || ticket.order_type || "—")}</div><hr>${items}<hr><div class="row total"><span>Total</span><strong>${total.toLocaleString("fr-FR")} FCFA</strong></div>${paymentRows}<div class="row"><span>Montant reçu</span><strong>${amountReceived.toLocaleString("fr-FR")} FCFA</strong></div><div class="row"><span>Reste à payer</span><strong>${due.toLocaleString("fr-FR")} FCFA</strong></div>${waitingAmount ? `<div class="row muted"><span>Paiement à confirmer</span><strong>${waitingAmount.toLocaleString("fr-FR")} FCFA</strong></div>` : ""}<div class="state">${paymentLabel}</div><hr><p class="center sub">Merci de votre visite !</p></main></html>`;
    popup.onload = () => popup.print();
    popup.document.open();
    popup.document.write(documentHTML);
    popup.document.close();
  }

  body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-print-ticket]");
    if (!button) return;
    const ticket = tickets.find((item) => String(item.id) === button.dataset.printTicket);
    if (ticket) printTicket(ticket);
  });
  search.addEventListener("input", render);
  root.querySelector("[data-refresh]")?.addEventListener("click", refresh);
  await refresh();
});
