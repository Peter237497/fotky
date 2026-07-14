// ============================================================
// KONFIGURACE — sem vyplň své vlastní údaje z Azure App registration.
// Návod je v README.md, sekce "Nastavení OneDrive přihlášení".
// ============================================================
const APP_CONFIG = {
  // Application (client) ID z Azure Portal → App registrations → tvá appka
  clientId: "SEM-VLOZ-SVOJE-CLIENT-ID",

  // Nech "common", pokud používáš běžný osobní Microsoft účet
  authority: "https://login.microsoftonline.com/common",

  // Musí přesně odpovídat adrese, kde appku hostuješ (GitHub Pages URL)
  // Např. "https://tvoje-jmeno.github.io/stavby-foto/"
  redirectUri: window.location.href.split('#')[0]

  // Cílovou složku na OneDrive appka nechá vybrat přímo v sobě
  // (tlačítko "Změnit" u "Cíl na OneDrive" v Přehledu), takže tu není
  // potřeba nic natvrdo nastavovat.
};
