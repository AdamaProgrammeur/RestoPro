document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(".reports-page");
  const api = window.RestoProAPI;
  const from = root.querySelector("[data-date-from]");
  const to = root.querySelector("[data-date-to]");
  const status = root.querySelector("[data-report-status]");
  const salesNode = root.querySelector("[data-report-sales]");
  const money = (value) => `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const today = new Date();
  const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  from.value = dateString(new Date(today.getFullYear(), today.getMonth(), 1));
  to.value = dateString(today);

  async function loadReport() {
    if (!from.value || !to.value || from.value > to.value) {
      status.textContent = "Vérifiez les dates sélectionnées.";
      return;
    }
    status.textContent = "Chargement…";
    const query = `?date_from=${encodeURIComponent(from.value)}&date_to=${encodeURIComponent(to.value)}`;
    try {
      const [report, sales] = await Promise.all([
        api.request(`dashboard/reports/${query}`),
        api.request(`dashboard/sales/${query}`),
      ]);
      root.querySelectorAll("[data-report]").forEach((node) => {
        const key = node.dataset.report;
        node.textContent = key === "orders_count" ? report[key] : money(report[key]);
      });
      const rows = sales.results || [];
      const max = Math.max(...rows.map((item) => Number(item.total)), 1);
      salesNode.innerHTML = rows.length ? `<div class="sales-bars">${rows.map((item) => `<div class="sales-bar-row"><time>${escapeHTML(item.day)}</time><div class="sales-track"><span style="width:${Math.max(2, Number(item.total) / max * 100)}%"></span></div><strong>${money(item.total)}</strong></div>`).join("")}</div>` : '<p class="table-message">Aucune vente sur cette période.</p>';
      status.textContent = `${report.period.date_from} — ${report.period.date_to}`;
    } catch (error) {
      status.textContent = error.message;
      salesNode.innerHTML = `<p class="table-message">${escapeHTML(error.message)}</p>`;
    }
  }
  root.querySelector("[data-load-report]").addEventListener("click", loadReport);
  loadReport();
});
