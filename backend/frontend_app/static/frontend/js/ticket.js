document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("[data-ticket-screen]");
  if (!root) return;
  const api = window.RestoProAPI;
  const money = (value) => `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
  const methodLabels = { CASH: "Espèces", ORANGE_MONEY: "Orange Money", MOOV_MONEY: "Moov Money", WAVE: "Wave", CARD: "Carte bancaire", OTHER: "Autre" };
  const widthButtons = [...root.querySelectorAll("[data-paper-width]")];
  const receipt = root.querySelector("[data-receipt]");
  const collectUrl = root.dataset.collectUrlTemplate;

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

  let width = 80;
  const setWidth = (value) => {
    width = Number(value) === 58 ? 58 : 80;
    receipt.style.setProperty("--receipt-width", `${width}mm`);
    widthButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.paperWidth) === width));
  };
  widthButtons.forEach((button) => button.addEventListener("click", () => setWidth(button.dataset.paperWidth)));
  root.querySelector("[data-print]").addEventListener("click", () => window.print());

  try {
    const [order, payments, settings] = await Promise.all([
      api.request(`orders/${root.dataset.orderId}/`),
      allPages(`payments/?order=${root.dataset.orderId}`),
      api.request("restaurant-settings/").catch(() => ({})),
    ]);
    const confirmed = payments.filter((payment) => payment.status === "CONFIRMED");
    const paid = confirmed.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const total = Number(order.total_amount);
    const remaining = Math.max(0, total - paid);
    const change = confirmed.reduce((sum, payment) => sum + Number(payment.change_given ?? Math.max(0, Number(payment.amount_received || payment.amount) - Number(payment.amount))), 0);
    const latestPayment = confirmed.reduce((latest, payment) => !latest || new Date(payment.confirmed_at || payment.created_at) > new Date(latest.confirmed_at || latest.created_at) ? payment : latest, null);
    const dateValue = latestPayment?.confirmed_at || latestPayment?.created_at || order.created_at;
    const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateValue));
    const logo = root.querySelector("[data-restaurant-logo]");
    root.querySelector("[data-restaurant-name]").textContent = settings.name || "RestoPro";
    root.querySelector("[data-restaurant-address]").textContent = settings.address || "";
    root.querySelector("[data-restaurant-phone]").textContent = settings.phone ? `Tél : ${settings.phone}` : "";
    root.querySelector("[data-ticket-number]").textContent = order.order_number;
    root.querySelector("[data-ticket-date]").textContent = date;
    root.querySelector("[data-ticket-customer]").textContent = order.customer_name || "Client anonyme";
    root.querySelector("[data-ticket-cashier]").textContent = latestPayment?.confirmed_by_name || latestPayment?.created_by_name || "—";
    root.querySelector("[data-ticket-items]").innerHTML = order.items.map((item) => `<div class="receipt-item"><div><strong>${item.dish_name}</strong><small>${item.quantity} × ${Number(item.unit_price).toLocaleString("fr-FR")} F</small></div><strong>${Number(item.subtotal).toLocaleString("fr-FR")} F</strong></div>`).join("");
    root.querySelector("[data-ticket-total]").textContent = `${Number(total).toLocaleString("fr-FR")} F`;
    root.querySelector("[data-ticket-paid]").textContent = `${Number(paid).toLocaleString("fr-FR")} F`;
    root.querySelector("[data-ticket-balance]").textContent = `${Number(remaining).toLocaleString("fr-FR")} F`;
    root.querySelector("[data-ticket-change-row]").hidden = change <= 0;
    root.querySelector("[data-ticket-change]").textContent = `${Number(change).toLocaleString("fr-FR")} F`;
    const grouped = new Map();
    confirmed.forEach((payment) => {
      const name = methodLabels[payment.method] || payment.method;
      const amount = payment.method === "CASH" ? Number(payment.amount_received ?? payment.amount) : Number(payment.amount);
      grouped.set(name, (grouped.get(name) || 0) + amount);
    });
    root.querySelector("[data-ticket-payments]").innerHTML = [...grouped].map(([name, amount]) => `<div><span>${name}</span><strong>${Number(amount).toLocaleString("fr-FR")} F</strong></div>`).join("");
    const hasPending = payments.some((payment) => payment.status === "PENDING");
    const state = root.querySelector("[data-ticket-status]");
    state.textContent = paid >= total ? "Statut : PAYÉE" : hasPending ? "Statut : EN ATTENTE DE CONFIRMATION" : paid > 0 ? "Statut : PAIEMENT PARTIEL" : "Statut : IMPAYÉE";
    state.dataset.state = paid >= total ? "paid" : hasPending ? "pending" : paid > 0 ? "partial" : "unpaid";
    root.querySelector("[data-ticket-footer]").textContent = settings.receipt_footer || "Merci de votre visite !";
    if (settings.logo_url) { logo.src = settings.logo_url; logo.hidden = false; }
    setWidth(settings.receipt_width || 80);
    root.querySelector("[data-continue-payment]").href = collectUrl.replace(/0\/$/, `${order.id}/`);
    root.querySelector("[data-continue-payment]").hidden = remaining <= 0;
    root.querySelector("[data-ticket-error]")?.remove();
    if (new URLSearchParams(window.location.search).has("print")) {
      window.addEventListener("afterprint", () => {
        if (window.frameElement) window.frameElement.remove();
        else window.close();
      }, { once: true });
      window.setTimeout(() => window.print(), 150);
    }
  } catch (error) {
    const failure = document.createElement("p");
    failure.className = "form-error";
    failure.dataset.ticketError = "";
    failure.textContent = `Impossible de charger le ticket : ${error.message}`;
    root.prepend(failure);
    root.querySelector("[data-print]").disabled = true;
  }
});
