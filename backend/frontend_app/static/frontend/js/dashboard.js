document.addEventListener("DOMContentLoaded", () => {
  const api = window.RestoProAPI;
  const root = document.querySelector(".dashboard-page");
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = (value) => `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
  const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const period = root.querySelector("[data-dashboard-period]");
  const dateRange = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    if (period.value === "today") from.setTime(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime());
    if (period.value === "week") {
      from.setTime(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime());
      from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    }
    return `?date_from=${dateString(from)}&date_to=${dateString(today)}`;
  };

  async function loadAnalytics() {
    const query = dateRange();
    const salesPanel = root.querySelector("[data-sales]");
    const dishesPanel = root.querySelector("[data-top-dishes]");
    try {
      const [stats, sales, dishes] = await Promise.all([
        api.request(`dashboard/${query}`),
        api.request(`dashboard/sales/${query}`),
        api.request(`dashboard/top-dishes/${query}`),
      ]);
      root.querySelector('[data-metric="revenue"]').textContent = money(stats.revenue.total);
      root.querySelector('[data-metric="orders"]').textContent = Number(stats.orders.total || 0).toLocaleString("fr-FR");
      root.querySelector('[data-metric="paid"]').textContent = money(stats.payments.confirmed_net);
      root.querySelector('[data-metric="pending"]').textContent = money(stats.payments.pending);

      const salesRows = sales.results || [];
      const maxSales = Math.max(...salesRows.map((item) => Number(item.total)), 1);
      salesPanel.innerHTML = salesRows.length ? `<div class="sales-bars">${salesRows.map((item) => `<div class="sales-bar-row"><time>${escapeHTML(item.day)}</time><div class="sales-track"><span style="width:${Math.max(2, Number(item.total) / maxSales * 100)}%"></span></div><strong>${money(item.total)}</strong></div>`).join("")}</div>` : '<p class="table-message">Aucune vente sur cette période.</p>';

      const topRows = dishes.results || [];
      const maxQuantity = Math.max(...topRows.map((item) => Number(item.quantity_sold)), 1);
      dishesPanel.innerHTML = topRows.length ? `<div class="top-dishes">${topRows.map((item) => `<div class="top-dish"><div class="top-dish-label"><span>${escapeHTML(item.dish_name)}</span><strong>${escapeHTML(item.quantity_sold)}</strong></div><div class="sales-track"><span style="width:${Math.max(2, Number(item.quantity_sold) / maxQuantity * 100)}%"></span></div></div>`).join("")}</div>` : '<p class="table-message">Aucun plat vendu sur cette période.</p>';
    } catch (error) {
      const message = escapeHTML(error.status === 403 ? "Ces statistiques sont réservées aux administrateurs." : error.message);
      ["revenue", "orders", "paid", "pending"].forEach((key) => { root.querySelector(`[data-metric="${key}"]`).textContent = "—"; });
      salesPanel.innerHTML = dishesPanel.innerHTML = `<p class="table-message">${message}</p>`;
    }
  }

  async function loadRecentOrders() {
    const target = root.querySelector("[data-recent-orders]");
    const statusLabels = { PENDING: "En attente", PREPARING: "En préparation", READY: "Prête", SERVED: "Servie", CANCELLED: "Annulée" };
    try {
      const result = await api.request("orders/");
      const orders = Array.isArray(result) ? result : result.results || [];
      target.innerHTML = orders.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>N°</th><th>Client</th><th>Statut</th><th>Montant</th></tr></thead><tbody>${orders.slice(0, 5).map((order) => `<tr><td>${escapeHTML(order.order_number)}</td><td>${escapeHTML(order.customer_name)}</td><td>${escapeHTML(statusLabels[order.status] || order.status)}</td><td>${money(order.total_amount)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty-state"><strong>Aucune commande pour le moment</strong><p>Les nouvelles commandes apparaîtront ici.</p></div>';
    } catch (error) {
      target.innerHTML = `<p class="table-message">${escapeHTML(error.message)}</p>`;
    }
  }

  period.addEventListener("change", loadAnalytics);
  loadAnalytics();
  loadRecentOrders();
});
