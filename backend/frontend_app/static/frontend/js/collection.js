document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("[data-collection-screen]");
  if (!root) return;
  const api = window.RestoProAPI;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = (value) => `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
  const labels = { CASH: "Espèces", ORANGE_MONEY: "Orange Money", MOOV_MONEY: "Moov Money", CARD: "Carte bancaire", OTHER: "Autre" };
  const form = root.querySelector("[data-collection-form]");
  const errorNode = root.querySelector("[data-collection-error]");
  const loadError = root.querySelector("[data-load-error]");
  const amountInput = form.elements.amount_received;
  let order;
  let payments = [];
  let selectedMethod = "CASH";
  let savedPayment = null;
  let balance = 0;

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

  function updateAmounts() {
    const received = Math.max(0, Number(amountInput.value || 0));
    const applied = Math.min(received, balance);
    const change = selectedMethod === "CASH" ? Math.max(0, received - balance) : 0;
    root.querySelector("[data-applied]").textContent = money(applied);
    root.querySelector("[data-change]").textContent = money(change);
    root.querySelector("[data-change-row]").hidden = selectedMethod !== "CASH" || change <= 0;
  }

  function renderOrder() {
    const confirmed = payments.filter((payment) => payment.status === "CONFIRMED");
    const paid = confirmed.reduce((sum, payment) => sum + Number(payment.amount), 0);
    balance = Math.max(0, Number(order.total_amount) - paid);
    root.querySelector("[data-order-number]").textContent = `Commande ${order.order_number}`;
    root.querySelector("[data-customer]").textContent = order.customer_name || "Client anonyme";
    root.querySelector("[data-order-items]").innerHTML = order.items.map((item) => `<div class="summary-item"><div><span>${item.quantity} ×</span> ${esc(item.dish_name)}</div><strong>${money(item.subtotal)}</strong></div>`).join("");
    root.querySelector("[data-total]").textContent = money(order.total_amount);
    root.querySelector("[data-paid]").textContent = money(paid);
    root.querySelector("[data-remaining]").textContent = money(balance);
    root.querySelector("[data-balance]").textContent = money(balance);
    root.querySelector("[data-exact-label]").textContent = money(balance);
    amountInput.value = balance;
    updateAmounts();
  }

  try {
    [order, payments] = await Promise.all([api.request(`orders/${root.dataset.orderId}/`), allPages(`payments/?order=${root.dataset.orderId}`)]);
    renderOrder();
  } catch (error) {
    loadError.textContent = `Impossible de charger la commande : ${error.message}`;
    form.querySelector('[type="submit"]').disabled = true;
    return;
  }

  root.querySelectorAll("[data-method]").forEach((button) => button.addEventListener("click", () => {
    root.querySelectorAll("[data-method]").forEach((item) => item.classList.toggle("active", item === button));
    selectedMethod = button.dataset.method;
    if (selectedMethod === "CASH") amountInput.removeAttribute("max");
    else amountInput.max = balance;
    updateAmounts();
  }));
  amountInput.addEventListener("input", updateAmounts);
  root.querySelector("[data-exact-amount]").addEventListener("click", () => {
    amountInput.value = balance;
    updateAmounts();
    amountInput.focus();
  });

  root.querySelector("[data-print-ticket]").addEventListener("click", () => openTicketForPrint(order.id));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const received = Number(amountInput.value);
    if (!Number.isFinite(received) || received <= 0) {
      errorNode.textContent = "Saisissez un montant supérieur à zéro.";
      return;
    }
    if (selectedMethod !== "CASH" && received > balance) {
      errorNode.textContent = "Pour ce mode de paiement, le montant ne peut pas dépasser le reste à payer.";
      return;
    }
    if (balance <= 0) {
      errorNode.textContent = "Cette commande est déjà entièrement payée.";
      return;
    }
    const applied = Math.min(received, balance);
    const tendered = selectedMethod === "CASH" ? received : applied;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    errorNode.textContent = "";
    try {
      const payment = savedPayment || await api.request("payments/", { method: "POST", body: {
        order: order.id,
        method: selectedMethod,
        amount: applied,
        amount_received: tendered,
      } });
      savedPayment = payment;
      const canCollect = ["ADMIN", "MANAGER"].includes(document.body.dataset.userRole) || document.body.dataset.superuser === "true";
      let confirmedPayment = payment;
      if (canCollect && payment.status !== "CONFIRMED") {
        try {
          confirmedPayment = await api.request(`payments/${payment.id}/confirm/`, { method: "POST", body: {} });
        } catch (confirmError) {
          confirmedPayment = await api.request(`payments/${payment.id}/`);
          if (confirmedPayment.status !== "CONFIRMED") throw confirmError;
        }
      }

      payments = await allPages(`payments/?order=${order.id}`);
      const paidTotal = payments.filter((item) => item.status === "CONFIRMED").reduce((sum, item) => sum + Number(item.amount), 0);
      const remaining = Math.max(0, Number(order.total_amount) - paidTotal);
      let invoice = null;
      let invoiceWarning = "";
      if (canCollect && remaining === 0) {
        try {
          invoice = await api.request("invoices/issue/", { method: "POST", body: { order: order.id } });
        } catch (issueError) {
          try {
            const existing = await api.request(`invoices/?order=${order.id}`);
            invoice = Array.isArray(existing) ? existing[0] : existing.results?.[0];
          } catch (_) {
            invoice = null;
          }
          if (!invoice) invoiceWarning = `Ticket imprimé, mais la facture n’a pas pu être enregistrée : ${issueError.message}`;
        }
      }
      showSuccess(payment, confirmedPayment, remaining, paidTotal, invoice, invoiceWarning);
      if (confirmedPayment.status === "CONFIRMED") printReceiptAutomatically(order.id);
      savedPayment = null;
    } catch (error) {
      errorNode.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  function showSuccess(payment, confirmedPayment, remaining, paidTotal, invoice, invoiceWarning) {
    const confirmed = confirmedPayment.status === "CONFIRMED";
    const cashChange = payment.method === "CASH" ? Number(payment.change_given ?? Math.max(0, Number(payment.amount_received || payment.amount) - Number(payment.amount))) : 0;
    const success = root.querySelector("[data-payment-success]");
    const collect = root.querySelector("[data-collect-view]");
    const collectUrl = root.dataset.collectUrlTemplate.replace(/0\/$/, `${order.id}/`);
    const ticketUrl = root.dataset.ticketUrlTemplate.replace(/0\/$/, `${order.id}/`);
    root.querySelector("[data-success-title]").textContent = confirmed ? "Paiement enregistré avec succès" : "Paiement enregistré · en attente de confirmation";
    root.querySelector("[data-success-order]").textContent = order.order_number;
    root.querySelector("[data-success-paid]").textContent = money(payment.amount);
    root.querySelector("[data-success-method]").textContent = labels[payment.method] || payment.method;
    root.querySelector("[data-success-status]").textContent = confirmed ? (remaining > 0 ? "◐ Partielle" : "✔ Payée") : "◷ En attente";
    root.querySelector("[data-success-date]").textContent = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(confirmedPayment.confirmed_at || payment.created_at));
    root.querySelector("[data-success-change-row]").hidden = cashChange <= 0;
    root.querySelector("[data-success-change]").textContent = money(cashChange);
    root.querySelector("[data-success-balance-row]").hidden = !remaining;
    root.querySelector("[data-success-balance]").textContent = money(remaining);
    const printLink = root.querySelector("[data-print-ticket]");
    printLink.hidden = !confirmed;
    const continueLink = root.querySelector("[data-continue-payment]");
    continueLink.href = collectUrl;
    continueLink.hidden = !confirmed || !remaining;
    root.querySelector("[data-view-order]").href = `${root.dataset.ordersUrl}?search=${encodeURIComponent(order.order_number)}`;
    collect.hidden = true;
    success.hidden = false;
    if (invoice) root.dataset.invoiceNumber = invoice.invoice_number;
    const warning = root.querySelector("[data-invoice-warning]");
    warning.textContent = invoiceWarning;
    warning.hidden = !invoiceWarning;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function printReceiptAutomatically(orderId) {
    const ticketUrl = root.dataset.ticketUrlTemplate.replace(/0\/$/, `${orderId}/`);
    const frame = document.createElement("iframe");
    frame.title = "Impression automatique du ticket";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;left:-9999px;bottom:0";
    frame.src = `${ticketUrl}?print=1`;
    document.body.append(frame);
  }

  function openTicketForPrint(orderId) {
    const ticketUrl = root.dataset.ticketUrlTemplate.replace(/0\/$/, `${orderId}/`);
    const printWindow = window.open(`${ticketUrl}?print=1`, "_blank", "popup,width=460,height=720");
    if (!printWindow) {
      const feedback = root.querySelector("[data-invoice-warning]");
      feedback.textContent = "Autorisez les fenêtres contextuelles dans le navigateur, puis réessayez.";
      feedback.hidden = false;
    }
  }
});
