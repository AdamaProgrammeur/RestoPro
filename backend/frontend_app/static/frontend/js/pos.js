document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("[data-pos-screen]");
  if (!root) return;
  const api = window.RestoProAPI;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = (value) => `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
  const itemsNode = root.querySelector("[data-pos-items]");
  const linesNode = root.querySelector("[data-cart-lines]");
  const form = root.querySelector("[data-order-form]");
  const errorNode = root.querySelector("[data-pos-error]");
  let dishes = [];
  let categories = [];
  let cart = new Map();
  let activeCategory = "";

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

  function renderCatalog() {
    const search = root.querySelector("[data-pos-search]").value.trim().toLocaleLowerCase("fr");
    const filtered = dishes.filter((dish) => (!activeCategory || String(dish.category) === activeCategory)
      && (!search || `${dish.name} ${dish.description || ""}`.toLocaleLowerCase("fr").includes(search)));
    root.querySelector("[data-pos-categories]").innerHTML = `<button class="pos-chip ${activeCategory ? "" : "active"}" type="button" data-category="">Tout</button>${categories.map((category) => `<button class="pos-chip ${String(category.id) === activeCategory ? "active" : ""}" type="button" data-category="${category.id}">${esc(category.name)}</button>`).join("")}`;
    itemsNode.innerHTML = filtered.length ? filtered.map((dish) => `<button class="pos-item" type="button" data-dish="${dish.id}"><span class="pos-item-image">${dish.image_url ? `<img src="${esc(dish.image_url)}" alt="">` : "🍽️"}</span><span class="pos-item-name">${esc(dish.name)}</span><span class="pos-item-description">${esc(dish.description || dish.category_name || "")}</span><strong>${money(dish.price)}</strong></button>`).join("") : '<div class="empty pos-empty">Aucun plat ne correspond à votre recherche.</div>';
  }

  function renderCart() {
    const selected = [...cart.values()];
    const total = selected.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const count = selected.reduce((sum, item) => sum + item.quantity, 0);
    root.querySelector("[data-cart-count]").textContent = `(${count})`;
    root.querySelector("[data-cart-total]").textContent = money(total);
    form.querySelector('[type="submit"]').disabled = selected.length === 0;
    linesNode.innerHTML = selected.length ? selected.map((item) => `<div class="pos-cart-line"><div><strong>${esc(item.name)}</strong><small>${money(item.price)} × ${item.quantity} = ${money(item.price * item.quantity)}</small></div><div class="pos-quantity"><button type="button" data-quantity="-1" data-dish="${item.id}" aria-label="Diminuer ${esc(item.name)}">−</button><span>${item.quantity}</span><button type="button" data-quantity="1" data-dish="${item.id}" aria-label="Augmenter ${esc(item.name)}">+</button><button type="button" class="pos-remove" data-remove="${item.id}" aria-label="Retirer ${esc(item.name)}">×</button></div></div>`).join("") : '<div class="empty">Le panier est vide.<br>Choisissez un plat pour commencer.</div>';
  }

  try {
    [dishes, categories] = await Promise.all([allPages("menu/?available=true"), allPages("categories/?is_active=true")]);
    categories = categories.filter((category) => category.is_active);
    const customers = await allPages("customers/");
    form.elements.customer.innerHTML += customers.map((customer) => `<option value="${customer.id}">${esc(`${customer.first_name} ${customer.last_name}`.trim())}</option>`).join("");
    renderCatalog();
    renderCart();
  } catch (error) {
    itemsNode.innerHTML = `<div class="empty pos-empty">Impossible de charger la carte : ${esc(error.message)}</div>`;
  }

  root.querySelector("[data-pos-search]").addEventListener("input", renderCatalog);
  root.querySelector("[data-pos-categories]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) { activeCategory = button.dataset.category; renderCatalog(); }
  });
  itemsNode.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dish]");
    if (!button) return;
    const dish = dishes.find((item) => String(item.id) === button.dataset.dish);
    const current = cart.get(dish.id) || { ...dish, quantity: 0 };
    current.quantity += 1;
    cart.set(dish.id, current);
    errorNode.textContent = "";
    renderCart();
  });
  linesNode.addEventListener("click", (event) => {
    const adjust = event.target.closest("[data-quantity]");
    const remove = event.target.closest("[data-remove]");
    if (adjust) {
      const item = cart.get(Number(adjust.dataset.dish));
      item.quantity += Number(adjust.dataset.quantity);
      if (item.quantity <= 0) cart.delete(item.id);
    } else if (remove) cart.delete(Number(remove.dataset.remove));
    renderCart();
  });
  root.querySelector("[data-clear-cart]").addEventListener("click", () => { cart.clear(); renderCart(); });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const data = {
      order_type: form.elements.order_type.value,
      notes: form.elements.notes.value,
      items: [...cart.values()].map((item) => ({ dish: item.id, quantity: item.quantity })),
    };
    if (form.elements.customer.value) data.customer = Number(form.elements.customer.value);
    submit.disabled = true;
    submit.textContent = "Enregistrement de la commande…";
    try {
      const order = await api.request("orders/", { method: "POST", body: data });
      const paymentUrl = root.dataset.paymentUrlTemplate.replace(/0\/$/, `${order.id}/`);
      window.location.assign(paymentUrl);
    } catch (error) {
      errorNode.textContent = error.message;
      submit.disabled = false;
      submit.innerHTML = 'Enregistrer la commande <span>→</span>';
    }
  });
});
