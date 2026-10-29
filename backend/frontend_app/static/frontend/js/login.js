document.addEventListener("DOMContentLoaded", () => {
  const password = document.querySelector("#password");
  const toggle = document.querySelector("[data-password-toggle]");
  toggle?.addEventListener("click", () => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.textContent = show ? "Masquer" : "Afficher";
    toggle.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
  });
});
