(() => {
  const buttons = [...document.querySelectorAll("[data-theme-choice]")];
  if (!buttons.length) return;

  const applyTheme = (theme, persist = false) => {
    const selected = theme === "dark" ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = selected;
    root.style.colorScheme = selected;

    buttons.forEach((button) => {
      const active = button.dataset.themeChoice === selected;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (persist) {
      try {
        localStorage.setItem("restopro-theme", selected);
      } catch (_) {
        // The current page still changes if browser storage is disabled.
      }
    }
  };

  applyTheme(document.documentElement.dataset.theme);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-choice]");
    if (button) applyTheme(button.dataset.themeChoice, true);
  });
})();
