document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("[data-menu-manager]");
  const api = window.RestoProAPI;
  const cards = root.querySelector("[data-menu-cards]");
  const status = root.querySelector("[data-menu-status]");
  const modal = root.querySelector("#menu-editor");
  const form = modal.querySelector("form");
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  let dishes = [];
  let categories = [];

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

  async function refresh() {
    status.textContent = "Chargement…";
    try {
      [dishes, categories] = await Promise.all([allPages("menu/"), allPages("categories/")]);
      root.querySelector("[data-menu-category]").innerHTML = '<option value="">Toutes les catégories</option>' + categories.map((item) => `<option value="${item.id}">${escapeHTML(item.name)}</option>`).join("");
      render();
      status.textContent = `${dishes.length} plat${dishes.length === 1 ? "" : "s"}`;
    } catch (error) {
      status.textContent = error.message;
      cards.innerHTML = `<p class="table-message">${escapeHTML(error.message)}</p>`;
    }
  }

  function render() {
    const query = root.querySelector("[data-menu-search]").value.trim().toLocaleLowerCase("fr");
    const category = root.querySelector("[data-menu-category]").value;
    const availability = root.querySelector("[data-menu-availability]").value;
    const filtered = dishes.filter((dish) => (!category || String(dish.category) === category)
      && (availability === "" || String(dish.is_available) === availability)
      && (!query || `${dish.name} ${dish.description || ""}`.toLocaleLowerCase("fr").includes(query)));
    cards.innerHTML = filtered.length ? filtered.map((dish) => `<article class="menu-card"><div class="menu-card-photo">${dish.image_url ? `<img src="${escapeHTML(dish.image_url)}" alt="${escapeHTML(dish.name)}">` : "🍽️"}</div><div class="menu-card-body"><div class="menu-card-title"><h2>${escapeHTML(dish.name)}</h2><span class="badge ${dish.is_available ? "ok" : "err"}">${dish.is_available ? "Disponible" : "Indisponible"}</span></div><p>${escapeHTML(dish.description || dish.category_name || "")}</p><strong class="menu-card-price">${Number(dish.price).toLocaleString("fr-FR")} FCFA</strong><div class="menu-card-actions"><button class="button button-secondary button-small" type="button" data-edit="${dish.id}">Modifier</button><button class="button button-secondary button-small" type="button" data-toggle="${dish.id}">${dish.is_available ? "Désactiver" : "Activer"}</button><button class="icon-button" type="button" data-delete="${dish.id}" aria-label="Supprimer ${escapeHTML(dish.name)}">⌫</button></div></div></article>`).join("") : '<div class="empty-state"><strong>Aucun plat trouvé</strong><p>Essayez une autre recherche ou ajoutez un plat.</p></div>';
  }

  async function editDish(dish = null) {
    form.innerHTML = `<h2>${dish ? "Modifier un plat" : "Ajouter un plat"}</h2><div class="editor-error" role="alert"></div><label>Nom du plat<input name="name" required value="${escapeHTML(dish?.name || "")}"></label><label>Catégorie<select name="category" required><option value="">Choisir une catégorie…</option>${categories.map((category) => `<option value="${category.id}" ${String(category.id) === String(dish?.category) ? "selected" : ""}>${escapeHTML(category.name)}</option>`).join("")}</select></label><label>Description<textarea name="description">${escapeHTML(dish?.description || "")}</textarea></label><label>Prix de vente (FCFA)<input name="price" type="number" min="0" step="1" required value="${escapeHTML(dish?.price || "")}"></label><label>Image du plat<input name="image" type="file" accept="image/jpeg,image/png,image/webp"><small class="field-hint">JPG, PNG ou WebP · 2 Mo maximum</small></label>${dish?.image_url ? `<img class="menu-editor-image" src="${escapeHTML(dish.image_url)}" alt="Image actuelle de ${escapeHTML(dish.name)}">` : ""}<label class="check-field"><input name="is_available" type="checkbox" ${dish ? (dish.is_available ? "checked" : "") : "checked"}> Disponible à la vente</label><div class="editor-actions"><button type="button" class="button button-secondary" data-close>Annuler</button><button type="submit" class="button button-primary">Enregistrer</button></div>`;
    modal.showModal();
    form.querySelector("[data-close]").onclick = () => modal.close();
    form.onsubmit = async (event) => {
      event.preventDefault();
      const file = form.elements.image.files[0];
      const error = form.querySelector(".editor-error");
      if (file && (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 2 * 1024 * 1024)) {
        error.textContent = "Choisissez une image JPG, PNG ou WebP de 2 Mo maximum.";
        return;
      }
      const data = new FormData(form);
      if (!file) data.delete("image");
      data.set("is_available", String(form.elements.is_available.checked));
      try {
        await api.request(`menu/${dish ? `${dish.id}/` : ""}`, { method: dish ? "PATCH" : "POST", body: data });
        modal.close(); await refresh();
      } catch (requestError) { error.textContent = requestError.message; }
    };
  }

  root.querySelector("[data-menu-add]").addEventListener("click", () => editDish());
  root.querySelectorAll("[data-menu-search], [data-menu-category], [data-menu-availability]").forEach((control) => control.addEventListener(control.type === "search" ? "input" : "change", render));
  cards.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-edit],button[data-toggle],button[data-delete]");
    if (!button) return;
    const dish = dishes.find((item) => String(item.id) === (button.dataset.edit || button.dataset.toggle || button.dataset.delete));
    if (!dish) return;
    if (button.dataset.edit) return editDish(dish);
    try {
      if (button.dataset.toggle) await api.request(`menu/${dish.id}/`, { method: "PATCH", body: { is_available: !dish.is_available } });
      else if (button.dataset.delete && window.confirm(`Supprimer « ${dish.name} » ?`)) await api.request(`menu/${dish.id}/`, { method: "DELETE" });
      else return;
      await refresh();
    } catch (error) { window.alert(error.message); }
  });
  await refresh();
});
