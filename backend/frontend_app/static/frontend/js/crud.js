(() => {
  const api = window.RestoProAPI;
  const options = (items) => items.map(([value, label]) => ({ value, label }));
  const resources = {
    categories: { endpoint: "categories/", canDelete: true, canEdit: true, columns: [["name", "Nom"], ["description", "Description"], ["is_active", "Active", "boolean"]], fields: [
      ["name", "Nom", "text", true], ["description", "Description", "textarea"], ["is_active", "Active", "checkbox"],
    ] },
    menu: { endpoint: "menu/", canDelete: true, canEdit: true, columns: [["name", "Nom"], ["category_name", "Catégorie"], ["price", "Prix (FCFA)"], ["is_available", "Disponible", "boolean"]], fields: [
      ["name", "Nom", "text", true], ["category", "Catégorie", "related", true, "categories/", "name"], ["description", "Description", "textarea"], ["price", "Prix (FCFA)", "number", true], ["is_available", "Disponible", "checkbox"],
    ] },
    customers: { endpoint: "customers/", canDelete: true, canEdit: true, columns: [["first_name", "Prénom"], ["last_name", "Nom"], ["phone", "Téléphone"], ["email", "E-mail"]], fields: [
      ["first_name", "Prénom", "text"], ["last_name", "Nom", "text", true], ["phone", "Téléphone", "tel"], ["email", "E-mail", "email"], ["address", "Adresse", "text"], ["notes", "Notes", "textarea"],
    ] },
    orders: { endpoint: "orders/", canAdd: true, createOrder: true, columns: [["order_number", "Commande"], ["customer_name", "Client"], ["order_type", "Type", "choice", { DINE_IN: "Sur place", TAKEAWAY: "À emporter", DELIVERY: "Livraison" }], ["status", "Statut", "choice", { PENDING: "En attente", PREPARING: "En préparation", READY: "Prête", SERVED: "Servie", CANCELLED: "Annulée" }], ["total_amount", "Total (FCFA)"], ["created_at", "Date", "date"]], action: "order-status" },
    payments: { endpoint: "payments/", columns: [["order_number", "Commande"], ["method", "Mode", "choice", { CASH: "Espèces", ORANGE_MONEY: "Orange Money", MOOV_MONEY: "Moov Money", WAVE: "Wave", CARD: "Carte bancaire", OTHER: "Autre" }], ["amount", "Montant (FCFA)"], ["status", "Statut", "choice", { PENDING: "En attente", CONFIRMED: "Confirmé", FAILED: "Échoué", REFUNDED: "Remboursé" }], ["created_at", "Date", "date"]], fields: [
      ["order", "Commande", "related", true, "orders/", "order_number"], ["method", "Mode de paiement", "select", true, options([["CASH", "Espèces"], ["ORANGE_MONEY", "Orange Money"], ["MOOV_MONEY", "Moov Money"], ["WAVE", "Wave"], ["CARD", "Carte bancaire"], ["OTHER", "Autre"]])], ["amount", "Montant (FCFA)", "number", true], ["reference", "Référence", "text"], ["notes", "Notes", "textarea"],
    ], action: "payment-status" },
    invoices: { endpoint: "invoices/", columns: [["invoice_number", "Facture"], ["order_number", "Commande"], ["customer_name", "Client"], ["total_amount", "Total (FCFA)"], ["status", "Statut", "choice", { ISSUED: "Émise", CANCELLED: "Annulée" }], ["issued_at", "Émise le", "date"]], action: "invoice-print" },
    expenses: { endpoint: "expenses/", canDelete: true, canEdit: true, columns: [["title", "Dépense"], ["category_display", "Catégorie"], ["amount", "Montant (FCFA)"], ["date", "Date"]], fields: [
      ["title", "Intitulé", "text", true], ["category", "Catégorie", "select", true, options([["SUPPLIES", "Approvisionnement"], ["SALARY", "Salaires"], ["ELECTRICITY", "Électricité"], ["WATER", "Eau"], ["GAS", "Gaz"], ["RENT", "Loyer"], ["TRANSPORT", "Transport"], ["MAINTENANCE", "Entretien"], ["OTHER", "Autres"]])], ["amount", "Montant (FCFA)", "number", true], ["date", "Date", "date", true], ["description", "Description", "textarea"], ["payment_method", "Mode de paiement", "select", true, options([["CASH", "Espèces"], ["ORANGE_MONEY", "Orange Money"], ["WAVE", "Wave"], ["BANK", "Virement bancaire"], ["OTHER", "Autre"]])],
    ] },
    users: { endpoint: "users/", canDelete: true, canEdit: true, columns: [["username", "Utilisateur"], ["first_name", "Prénom"], ["last_name", "Nom"], ["email", "E-mail"], ["role", "Rôle", "choice", { ADMIN: "Administrateur", MANAGER: "Gestionnaire", CASHIER: "Caissier" }], ["is_active", "Actif", "boolean"]], fields: [
      ["username", "Nom d’utilisateur", "text", true], ["first_name", "Prénom", "text"], ["last_name", "Nom", "text"], ["email", "E-mail", "email"], ["role", "Rôle", "select", true, options([["ADMIN", "Administrateur"], ["MANAGER", "Gestionnaire"], ["CASHIER", "Caissier"]])], ["is_active", "Compte actif", "checkbox"], ["password", "Mot de passe", "password", true],
    ] },
  };

  const esc = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const formatDate = (value) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

  async function allPages(endpoint) {
    let path = endpoint;
    const rows = [];
    while (path) {
      const result = await api.request(path);
      if (Array.isArray(result)) return result;
      rows.push(...(result.results || []));
      path = result.next ? new URL(result.next).pathname + new URL(result.next).search : null;
    }
    return rows;
  }

  function mountResource(root, name) {
    const config = resources[name];
    if (!config) return;
    const search = root.querySelector("[data-search]");
    const body = root.querySelector("tbody");
    const status = root.querySelector("[data-status]");
    let rows = [];
    const refresh = async () => {
      status.textContent = "Chargement des données…";
      try {
        rows = await allPages(config.endpoint);
        render();
        status.textContent = `${rows.length} élément${rows.length === 1 ? "" : "s"}`;
      } catch (error) {
        status.textContent = error.status === 401 ? "Session expirée : reconnectez-vous." : error.message;
        body.innerHTML = `<tr><td colspan="20" class="table-message">${esc(error.message)}</td></tr>`;
      }
    };
    const render = () => {
      const query = search.value.trim().toLocaleLowerCase("fr");
      const visible = rows.filter((row) => !query || Object.values(row).some((value) => String(value ?? "").toLocaleLowerCase("fr").includes(query)));
      if (!visible.length) {
        body.innerHTML = `<tr><td colspan="20" class="table-message">${rows.length ? "Aucun résultat pour cette recherche." : "Aucune donnée enregistrée."}</td></tr>`;
        return;
      }
      body.innerHTML = visible.map((row) => `<tr>${config.columns.map(([key, label, kind, choices]) => {
        let value = row[key];
        if (kind === "boolean") return `<td><span class="badge ${value ? "ok" : "err"}">${value ? "✔ Actif" : "○ Inactif"}</span></td>`;
        if (kind === "date") value = formatDate(value);
        if (kind === "choice") value = choices[value] || value;
        if (["total_amount", "amount", "price"].includes(key) && value !== undefined) value = `${Number(value).toLocaleString("fr-FR")} FCFA`;
        if (key === "status") {
          const status = String(row.status || "");
          const tone = ["CONFIRMED", "ISSUED", "READY", "SERVED"].includes(status) ? "ok" : ["PENDING", "PREPARING"].includes(status) ? "warn" : "err";
          return `<td><span class="badge ${tone}">${esc(value)}</span></td>`;
        }
        return `<td>${esc(value)}</td>`;
      }).join("")}${config.action || config.canDelete || config.canEdit ? `<td class="row-actions">${config.action ? actionButton(config.action, row) : ""}${name === "users" ? `<button class="button button-secondary button-small" data-reset-password="${row.id}">Réinitialiser le mot de passe</button>` : ""}${config.canEdit ? `<button class="button button-secondary button-small" data-edit="${row.id}">Modifier</button>` : ""}${config.canDelete ? `<button class="icon-button" data-delete="${row.id}" title="Supprimer" aria-label="Supprimer">⌫</button>` : ""}</td>` : ""}</tr>`).join("");
    };
    search.addEventListener("input", render);
    root.querySelector("[data-refresh]")?.addEventListener("click", refresh);
    root.querySelector("[data-add]")?.addEventListener("click", () => openEditor(config, null, refresh));
    body.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action],button[data-delete],button[data-edit],button[data-reset-password]");
      if (!button) return;
      const row = rows.find((item) => String(item.id) === String(button.dataset.id || button.dataset.delete || button.dataset.edit || button.dataset.resetPassword));
      if (!row) return;
      if (button.dataset.resetPassword) { openPasswordReset(config, row, refresh); return; }
      if (button.dataset.edit) { await openEditor(config, row, refresh); return; }
      if (button.dataset.delete) {
        if (!window.confirm("Supprimer cet élément ?")) return;
        try { await api.request(`${config.endpoint}${row.id}/`, { method: "DELETE" }); await refresh(); }
        catch (error) { window.alert(error.message); }
      } else if (button.dataset.action === "order-status") {
        const next = window.prompt("Nouveau statut : PENDING, PREPARING, READY, SERVED ou CANCELLED", row.status);
        if (!next) return;
        try { await api.request(`orders/${row.id}/change-status/`, { method: "PATCH", body: { status: next.trim().toUpperCase() } }); await refresh(); }
        catch (error) { window.alert(error.message); }
      } else if (button.dataset.action === "payment-confirm" || button.dataset.action === "payment-refund") {
        const operation = button.dataset.action === "payment-confirm" ? "confirm" : "refund";
        if (!window.confirm(operation === "confirm" ? "Confirmer ce paiement ?" : "Rembourser ce paiement ?")) return;
        try { await api.request(`payments/${row.id}/${operation}/`, { method: "POST", body: {} }); await refresh(); }
        catch (error) { window.alert(error.message); }
      } else if (button.dataset.action === "invoice-print") {
        printInvoice(row);
      }
    });
    refresh().then(() => {
      if (name === "payments" && new URLSearchParams(window.location.search).has("order")) {
        root.querySelector("[data-add]")?.click();
      }
    });
  }

  function actionButton(action, row) {
    const isAdmin = document.body.dataset.userRole === "ADMIN" || document.body.dataset.superuser === "true";
    if (action === "order-status" && isAdmin && row.status !== "CANCELLED" && row.status !== "SERVED") return `<button class="button button-secondary button-small" data-action="order-status" data-id="${row.id}">Statut</button>`;
    if (action === "payment-status" && isAdmin && row.status === "PENDING") return `<button class="button button-secondary button-small" data-action="payment-confirm" data-id="${row.id}">Confirmer</button>`;
    if (action === "payment-status" && isAdmin && row.status === "CONFIRMED") return `<button class="button button-secondary button-small" data-action="payment-refund" data-id="${row.id}">Rembourser</button>`;
    if (action === "invoice-print" && row.status === "ISSUED") return `<button class="button button-primary button-small" data-action="invoice-print" data-id="${row.id}">Imprimer</button>`;
    return "";
  }

  function mountOrders(root) {
    const body = root.querySelector("tbody");
    const search = root.querySelector("[data-search]");
    const status = root.querySelector("[data-status]");
    const isAdmin = document.body.dataset.userRole === "ADMIN" || document.body.dataset.superuser === "true";
    let orders = [];
    search.value = new URLSearchParams(window.location.search).get("search") || "";

    const render = () => {
      const query = search.value.trim().toLocaleLowerCase("fr");
      const visible = orders.filter((order) => `${order.order_number} ${order.customer_name || "Client anonyme"}`.toLocaleLowerCase("fr").includes(query));
      if (!visible.length) {
        body.innerHTML = `<tr><td colspan="6" class="table-message">${orders.length ? "Aucun résultat pour cette recherche." : "Aucune commande enregistrée."}</td></tr>`;
        return;
      }
      body.innerHTML = visible.map((order) => {
        const payments = order.payments || [];
        const confirmed = payments.filter((payment) => payment.status === "CONFIRMED").reduce((sum, payment) => sum + Number(payment.amount), 0);
        const pending = payments.filter((payment) => payment.status === "PENDING").reduce((sum, payment) => sum + Number(payment.amount), 0);
        const total = Number(order.total_amount);
        const paid = confirmed >= total;
        const hasPending = pending > 0;
        const partial = confirmed > 0 && confirmed < total;
        let paymentLabel = "○ Impayée", tone = "err", action = `<button class="button button-secondary button-small" data-order-action="collect" data-id="${order.id}">Encaisser</button>`;
        if (paid) {
          paymentLabel = "✔ Payée"; tone = "ok";
          action = `<button class="button button-primary button-small" data-order-action="ticket" data-id="${order.id}">Ticket</button>`;
        } else if (["CANCELLED", "SERVED"].includes(order.status)) {
          paymentLabel = order.status === "CANCELLED" ? "Annulée" : "Clôturée";
          tone = "err";
          action = "—";
        } else if (hasPending) {
          paymentLabel = "◷ À confirmer"; tone = "warn";
          const payment = payments.find((item) => item.status === "PENDING");
          action = isAdmin
            ? `<button class="button button-secondary button-small" data-order-action="confirm" data-id="${order.id}" data-payment="${payment.id}">Confirmer</button>`
            : `<span class="muted">En attente</span>`;
        } else if (partial) {
          paymentLabel = "◐ Partielle"; tone = "warn";
        }
        const time = order.created_at ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.created_at)) : "—";
        const customer = order.customer_name === "Client de passage" ? "Client anonyme" : order.customer_name || "Client anonyme";
        return `<tr><td><strong>${esc(order.order_number)}</strong></td><td>${time}</td><td>${esc(customer)}</td><td>${Number(total).toLocaleString("fr-FR")} FCFA</td><td><span class="badge ${tone}">${paymentLabel}</span></td><td class="row-actions">${action}</td></tr>`;
      }).join("");
    };

    const refresh = async () => {
      status.textContent = "Chargement des commandes…";
      try {
        orders = await allPages("orders/");
        const [payments, invoices] = await Promise.all([allPages("payments/"), allPages("invoices/")]);
        const byOrder = new Map();
        payments.forEach((payment) => byOrder.set(payment.order, [...(byOrder.get(payment.order) || []), payment]));
        const invoicesByOrder = new Set(invoices.map((invoice) => invoice.order));
        orders = orders.map((order) => ({ ...order, payments: byOrder.get(order.id) || [], hasInvoice: invoicesByOrder.has(order.id) }));
        render();
        status.textContent = `${orders.length} commande${orders.length === 1 ? "" : "s"}`;
      } catch (error) {
        status.textContent = error.message;
        body.innerHTML = `<tr><td colspan="6" class="table-message">${esc(error.message)}</td></tr>`;
      }
    };

    const issueInvoice = async (order) => {
      if (order.hasInvoice) {
        const result = await api.request(`invoices/?order=${order.id}`);
        return Array.isArray(result) ? result[0] : result.results?.[0];
      }
      try {
        return await api.request("invoices/issue/", { method: "POST", body: { order: order.id } });
      } catch (error) {
        const result = await api.request(`invoices/?order=${order.id}`);
        const invoice = Array.isArray(result) ? result[0] : result.results?.[0];
        if (invoice) return invoice;
        throw error;
      }
    };

    body.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-order-action]");
      if (!button) return;
      const order = orders.find((item) => String(item.id) === button.dataset.id);
      if (!order) return;
      button.disabled = true;
      try {
        if (button.dataset.orderAction === "ticket") {
          const popup = window.open("", "_blank", "width=440,height=700");
          if (!popup) throw new Error("Autorisez les fenêtres contextuelles pour imprimer le ticket.");
          try {
            const invoice = await issueInvoice(order);
            popup.document.open(); popup.document.write(printableInvoice(invoice)); popup.document.close();
          } catch (error) { popup.close(); throw error; }
        } else if (button.dataset.orderAction === "confirm") {
          const printWindow = isAdmin ? window.open("", "_blank", "width=440,height=700") : null;
          await api.request(`payments/${button.dataset.payment}/confirm/`, { method: "POST", body: {} });
          const updatedOrder = await api.request(`orders/${order.id}/`);
          const payments = await allPages(`payments/?order=${order.id}`);
          const received = payments.filter((payment) => payment.status === "CONFIRMED").reduce((sum, payment) => sum + Number(payment.amount), 0);
          if (received >= Number(updatedOrder.total_amount) && isAdmin) {
            const invoice = await issueInvoice({ ...updatedOrder, hasInvoice: false });
            if (printWindow) { printWindow.document.open(); printWindow.document.write(printableInvoice(invoice)); printWindow.document.close(); }
          } else if (printWindow) printWindow.close();
          await refresh();
        } else if (button.dataset.orderAction === "collect") {
          const modal = root.querySelector("#editor-modal");
          const form = modal.querySelector("form");
          const payments = order.payments || [];
          const alreadyReceived = payments.filter((payment) => ["CONFIRMED", "PENDING"].includes(payment.status)).reduce((sum, payment) => sum + Number(payment.amount), 0);
          const balance = Math.max(0, Number(order.total_amount) - alreadyReceived);
          if (balance <= 0) throw new Error("Un paiement est déjà en attente de confirmation.");
          form.innerHTML = `<h2>Encaisser ${esc(order.order_number)}</h2><div class="editor-error" role="alert"></div><p class="muted">Reste à encaisser : <strong>${balance.toLocaleString("fr-FR")} FCFA</strong></p><label>Montant encaissé<input name="amount" type="number" min="1" max="${balance}" step="1" value="${balance}" required></label><label>Mode de paiement<select name="method" required><option value="CASH">Espèces</option><option value="ORANGE_MONEY">Orange Money</option><option value="WAVE">Wave</option><option value="OTHER">Autre</option></select></label><label>Référence (facultatif)<input name="reference" type="text"></label><div class="editor-actions"><button type="button" class="button button-secondary" data-close>Annuler</button><button type="submit" class="button button-primary">Enregistrer le paiement</button></div>`;
          modal.showModal();
          form.querySelector("[data-close]").onclick = () => modal.close();
          let paymentInProgress = null;
          form.onsubmit = async (submitEvent) => {
            submitEvent.preventDefault();
            const saveButton = form.querySelector('[type="submit"]');
            saveButton.disabled = true;
            const printWindow = isAdmin ? window.open("", "_blank", "width=440,height=700") : null;
            try {
              const payment = paymentInProgress || await api.request("payments/", { method: "POST", body: {
                order: order.id, method: form.elements.method.value,
                amount: Number(form.elements.amount.value), reference: form.elements.reference.value.trim(),
              } });
              paymentInProgress = payment;
              if (isAdmin) {
                if (payment.status !== "CONFIRMED") {
                  try {
                    paymentInProgress = await api.request(`payments/${payment.id}/confirm/`, { method: "POST", body: {} });
                  } catch (confirmError) {
                    const latest = await api.request(`payments/${payment.id}/`);
                    if (latest.status !== "CONFIRMED") throw confirmError;
                    paymentInProgress = latest;
                  }
                }
                const allPayments = await allPages(`payments/?order=${order.id}`);
                const received = allPayments.filter((item) => item.status === "CONFIRMED" || (item.id === payment.id)).reduce((sum, item) => sum + Number(item.amount), 0);
                if (received >= Number(order.total_amount)) {
                  const invoice = await issueInvoice({ ...order, hasInvoice: false });
                  if (printWindow) { printWindow.document.open(); printWindow.document.write(printableInvoice(invoice)); printWindow.document.close(); }
                } else if (printWindow) printWindow.close();
              } else if (printWindow) printWindow.close();
              paymentInProgress = null;
              modal.close();
              await refresh();
            } catch (error) {
              if (printWindow) printWindow.close();
              form.querySelector(".editor-error").textContent = error.message;
              saveButton.disabled = false;
            }
          };
        }
      } catch (error) { window.alert(error.message); }
      finally { if (button.isConnected) button.disabled = false; }
    });
    search.addEventListener("input", render);
    root.querySelector("[data-refresh]")?.addEventListener("click", refresh);
    refresh();
  }

  function printableInvoice(invoice) {
    const date = new Date(invoice.issued_at).toLocaleString("fr-FR");
    const rows = (invoice.items || []).map((item) => `<div class="row"><span>${esc(item.dish_name)}<br>${item.quantity} × ${Number(item.unit_price).toLocaleString("fr-FR")} FCFA</span><strong>${Number(item.subtotal).toLocaleString("fr-FR")} FCFA</strong></div>`).join("");
    return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${esc(invoice.invoice_number)}</title><style>body{font:13px/1.45 system-ui,sans-serif;width:76mm;margin:8mm auto;color:#111}.center{text-align:center}.row{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #aaa}.tot{font-size:16px;font-weight:700}hr{border:0;border-top:1px dashed #888;margin:9px 0}@media print{body{width:76mm;margin:0 auto}}</style><main><header class="center"><h2>RestoPro</h2><strong>FACTURE</strong></header><hr><div>N° ${esc(invoice.invoice_number)}</div><div>Date : ${esc(date)}</div><div>Commande : ${esc(invoice.order_number)}</div><div>Client : ${esc(invoice.customer_name || "Client anonyme")}</div><hr>${rows}<hr><div class="row"><span>Sous-total</span><strong>${Number(invoice.subtotal).toLocaleString("fr-FR")} FCFA</strong></div><div class="row"><span>Remise</span><strong>${Number(invoice.discount_amount).toLocaleString("fr-FR")} FCFA</strong></div><div class="row tot"><span>Total</span><strong>${Number(invoice.total_amount).toLocaleString("fr-FR")} FCFA</strong></div><hr><p class="center">Merci de votre visite !</p></main><script>window.onload=()=>window.print()<\\/script></html>`;
  }

  function printInvoice(invoice) {
    const popup = window.open("", "_blank", "width=440,height=700");
    if (!popup) return window.alert("Autorisez les fenêtres contextuelles pour imprimer la facture.");
    const date = new Date(invoice.issued_at).toLocaleString("fr-FR");
    const rows = invoice.items.map((item) => `<div class="row"><span>${esc(item.dish_name)}<br>${item.quantity} × ${Number(item.unit_price).toLocaleString("fr-FR")} FCFA</span><strong>${Number(item.subtotal).toLocaleString("fr-FR")} FCFA</strong></div>`).join("");
    popup.document.write(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>${esc(invoice.invoice_number)}</title><style>body{font:13px/1.45 system-ui,sans-serif;width:76mm;margin:8mm auto;color:#111}.center{text-align:center}.row{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #aaa}.tot{font-size:16px;font-weight:700}hr{border:0;border-top:1px dashed #888;margin:9px 0}@media print{body{width:76mm;margin:0 auto}}</style><main><header class="center"><h2>RestoPro</h2><strong>FACTURE</strong></header><hr><div>N° ${esc(invoice.invoice_number)}</div><div>Date : ${esc(date)}</div><div>Commande : ${esc(invoice.order_number)}</div><div>Client : ${esc(invoice.customer_name || "Client anonyme")}</div><hr>${rows}<hr><div class="row"><span>Sous-total</span><strong>${Number(invoice.subtotal).toLocaleString("fr-FR")} FCFA</strong></div><div class="row"><span>Remise</span><strong>${Number(invoice.discount_amount).toLocaleString("fr-FR")} FCFA</strong></div><div class="row tot"><span>Total</span><strong>${Number(invoice.total_amount).toLocaleString("fr-FR")} FCFA</strong></div><hr><p class="center">Merci de votre visite !</p></main><script>window.onload=()=>window.print()<\/script></html>`);
    popup.document.close();
  }

  function openPasswordReset(config, user, refresh) {
    const modal = document.querySelector("#editor-modal");
    const form = modal.querySelector("form");
    form.innerHTML = `<h2>Réinitialiser le mot de passe</h2><p class="muted">Compte : <strong>${esc(user.username)}</strong></p><div class="editor-error" role="alert"></div><label>Nouveau mot de passe<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirmer le nouveau mot de passe<input name="password_confirmation" type="password" minlength="8" autocomplete="new-password" required></label><div class="editor-actions"><button type="button" class="button button-secondary" data-close>Annuler</button><button type="submit" class="button button-primary">Enregistrer le nouveau mot de passe</button></div>`;
    modal.showModal();
    form.querySelector("[data-close]").onclick = () => modal.close();
    form.onsubmit = async (event) => {
      event.preventDefault();
      const password = form.elements.password.value;
      const confirmation = form.elements.password_confirmation.value;
      const error = form.querySelector(".editor-error");
      if (password.length < 8) {
        error.textContent = "Le mot de passe doit contenir au moins 8 caractères.";
        return;
      }
      if (password !== confirmation) {
        error.textContent = "Les deux mots de passe ne correspondent pas.";
        return;
      }
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      error.textContent = "";
      try {
        await api.request(`${config.endpoint}${user.id}/`, {
          method: "PATCH",
          body: { password },
        });
        modal.close();
        await refresh();
        window.alert(`Le mot de passe de ${user.username} a été réinitialisé.`);
      } catch (requestError) {
        error.textContent = requestError.message;
        submit.disabled = false;
      }
    };
  }

  async function openEditor(config, row, refresh) {
    const modal = document.querySelector("#editor-modal");
    const form = modal.querySelector("form");
    if (config.createOrder) return openOrderEditor(modal, refresh);
    const fields = config.fields;
    form.innerHTML = `<h2>${row ? "Modifier" : "Ajouter"}</h2><div class="editor-error" role="alert"></div>${fields.map(([key, label, type, required, extra, displayKey]) => {
      const value = row?.[key] ?? (type === "checkbox" ? true : "");
      const fieldLabel = key === "password" && row ? "Nouveau mot de passe (laisser vide pour conserver)" : label;
      const isRequired = required && !(key === "password" && row);
      if (type === "textarea") return `<label>${esc(label)}<textarea name="${key}" ${required ? "required" : ""}>${esc(value)}</textarea></label>`;
      if (type === "related" || type === "select") return `<label>${esc(label)}<select name="${key}" ${required ? "required" : ""}><option value="">Choisir…</option></select></label>`;
      return `<label class="${type === "checkbox" ? "check-field" : ""}">${type === "checkbox" ? `<input type="checkbox" name="${key}" ${value ? "checked" : ""}> ${esc(label)}` : `${esc(fieldLabel)}<input name="${key}" type="${type}" value="${esc(value)}" ${isRequired ? "required" : ""} ${key === "password" ? "minlength=8 autocomplete=new-password" : ""}>`}</label>`;
    }).join("")}<div class="editor-actions"><button type="button" class="button button-secondary" data-close>Annuler</button><button type="submit" class="button button-primary">Enregistrer</button></div>`;
    modal.showModal();
    await Promise.all([...form.querySelectorAll("select")].map(async (select) => {
      const field = fields.find(([key]) => key === select.name);
      let choices = field[2] === "related" ? await allPages(field[4]) : field[4];
      select.innerHTML = `<option value="">Choisir…</option>` + choices.map((option) => {
        const value = field[2] === "related" ? option.id : option.value;
        const label = field[2] === "related" ? option[field[5]] : option.label;
        return `<option value="${esc(value)}" ${String(value) === String(row?.[field[0]]) ? "selected" : ""}>${esc(label || `#${value}`)}</option>`;
      }).join("");
    }));
    const initialOrder = new URLSearchParams(window.location.search).get("order");
    if (config.endpoint === "payments/" && initialOrder) {
      const order = await api.request(`orders/${initialOrder}/`);
      form.elements.order.value = initialOrder;
      form.elements.amount.value = order.total_amount;
    }
    form.querySelector("[data-close]").onclick = () => modal.close();
    form.onsubmit = async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      fields.forEach(([key, , type]) => {
        if (type === "checkbox") data[key] = form.elements[key].checked;
        if (type === "number" && data[key] !== "") data[key] = Number(data[key]);
        if ((type === "select" || type === "related") && data[key] !== "") data[key] = Number(data[key]) || data[key];
      });
      if (row && !data.password) delete data.password;
      try {
        await api.request(`${config.endpoint}${row ? `${row.id}/` : ""}`, { method: row ? "PATCH" : "POST", body: data });
        modal.close(); await refresh();
      } catch (error) { form.querySelector(".editor-error").textContent = error.message; }
    };
  }

  async function openOrderEditor(modal, refresh) {
    const form = modal.querySelector("form");
    form.innerHTML = '<h2>Nouvelle commande</h2><div class="editor-error" role="alert"></div><label>Client (facultatif)<select name="customer"><option value="">Client de passage</option></select></label><label>Type de commande<select name="order_type"><option value="DINE_IN">Sur place</option><option value="TAKEAWAY">À emporter</option><option value="DELIVERY">Livraison</option></select></label><div class="order-lines"><strong>Articles</strong><div data-order-items></div><button class="button button-secondary button-small" type="button" data-add-item>＋ Ajouter un plat</button></div><label>Remarques<textarea name="notes"></textarea></label><div class="editor-actions"><button type="button" class="button button-secondary" data-close>Annuler</button><button type="submit" class="button button-primary">Créer la commande</button></div>';
    modal.showModal();
    let customers;
    let dishes;
    try {
      [customers, dishes] = await Promise.all([allPages("customers/"), allPages("menu/?available=true")]);
    } catch (error) {
      form.querySelector(".editor-error").textContent = error.message;
      return;
    }
    form.elements.customer.innerHTML += customers.map((customer) => `<option value="${customer.id}">${esc(`${customer.first_name} ${customer.last_name}`.trim())}</option>`).join("");
    const items = form.querySelector("[data-order-items]");
    const addLine = () => {
      const line = document.createElement("div");
      line.className = "order-line";
      line.innerHTML = `<select aria-label="Plat" required><option value="">Choisir un plat…</option>${dishes.map((dish) => `<option value="${dish.id}">${esc(dish.name)} · ${esc(dish.price)} FCFA</option>`).join("")}</select><input type="number" min="1" value="1" aria-label="Quantité" required><button class="icon-button" type="button" aria-label="Retirer">×</button>`;
      line.querySelector("button").onclick = () => line.remove();
      items.append(line);
    };
    addLine();
    form.querySelector("[data-add-item]").onclick = addLine;
    form.querySelector("[data-close]").onclick = () => modal.close();
    form.onsubmit = async (event) => {
      event.preventDefault();
      const lines = [...items.querySelectorAll(".order-line")].map((line) => ({
        dish: Number(line.querySelector("select").value),
        quantity: Number(line.querySelector("input").value),
      }));
      const data = { order_type: form.elements.order_type.value, notes: form.elements.notes.value, items: lines };
      if (form.elements.customer.value) data.customer = Number(form.elements.customer.value);
      try {
        await api.request("orders/", { method: "POST", body: data });
        modal.close(); await refresh();
      } catch (error) { form.querySelector(".editor-error").textContent = error.message; }
    };
  }

  async function mountSettings(root) {
    const form = root.querySelector("form");
    const message = root.querySelector("[data-status]");
    const logoInput = form.elements.logo;
    const logoPreview = form.querySelector("[data-logo-preview]");
    try {
      const data = await api.request("restaurant-settings/");
      Object.entries(data).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ""; });
      if (data.logo_url && logoPreview) { logoPreview.src = data.logo_url; logoPreview.hidden = false; }
      message.textContent = "Paramètres chargés.";
    } catch (error) { message.textContent = error.message; }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const image = logoInput?.files?.[0];
      if (image && (!/^image\/(jpeg|png|webp)$/.test(image.type) || image.size > 2 * 1024 * 1024)) {
        message.textContent = "Choisissez une image JPG, PNG ou WebP de 2 Mo maximum.";
        return;
      }
      const data = new FormData(form);
      if (!image) data.delete("logo");
      try {
        await api.request("restaurant-settings/", { method: "PATCH", body: data });
        message.textContent = "Paramètres enregistrés.";
      } catch (error) { message.textContent = error.message; }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-resource]").forEach((root) => {
      const name = root.dataset.resource;
      if (name === "invoices") return;
      if (name === "settings") mountSettings(root);
      else if (name === "orders") mountOrders(root);
      else mountResource(root, name);
    });
  });
})();
