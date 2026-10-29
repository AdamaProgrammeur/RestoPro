document.addEventListener("DOMContentLoaded", () => {
  const today = document.querySelector("#today");
  if (today) {
    today.textContent = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date());
  }

  const sidebar = document.querySelector("#sidebar");
  const toggle = document.querySelector("#menu-toggle");
  toggle?.addEventListener("click", () => sidebar?.classList.toggle("is-open"));
  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 820 && sidebar?.classList.contains("is-open")
      && !sidebar.contains(event.target) && !toggle?.contains(event.target)) {
      sidebar.classList.remove("is-open");
    }
  });
});
