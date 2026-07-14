# Stavby Foto — appka pro focení a třídění fotek podle stavby

Appka funguje jako "appka" na ploše iPhonu (PWA), i když je to technicky
webová stránka. Fotky se ukládají lokálně v telefonu, roztříděné podle
stavby, a jedním tlačítkem večer se pošlou na OneDrive do složek se
stejným názvem.

Funguje bez Macu, Xcode i App Store — jen se appka nahraje na GitHub Pages
(zdarma hosting) a na iPhonu se přidá na plochu přes Safari.

---

## 1. Nahrání appky na GitHub Pages

1. Na GitHubu vytvoř nový **veřejný repozitář**, např. `stavby-foto`.
2. Nahraj do něj všechny soubory z téhle appky (`index.html`, `style.css`,
   `app.js`, `config.js`, `manifest.json`, `sw.js`, `icon-192.png`,
   `icon-512.png`) — buď přes web rozhraní GitHubu (drag & drop), nebo
   přes Git.
3. V repozitáři jdi do **Settings → Pages**.
4. U "Source" vyber **Deploy from a branch**, branch `main`, složka `/root`.
   Ulož.
5. Za chvíli se ti zobrazí adresa appky, typicky:
   `https://tvoje-jmeno.github.io/stavby-foto/`

Tuhle adresu budeš potřebovat v kroku 2.

---

## 2. Nastavení OneDrive přihlášení (jednorázově)

Appka potřebuje vlastní "identitu" u Microsoftu, aby se směla přihlašovat
k tvému OneDrive účtu. Tohle se nastavuje jednou, přes klikací rozhraní,
bez psaní kódu.

1. Jdi na **https://entra.microsoft.com** a přihlas se svým Microsoft
   účtem (stejným, jaký používáš pro OneDrive).
2. V levém menu: **Identity → Applications → App registrations → New
   registration**.
3. Vyplň:
   - **Name**: `Stavby Foto` (libovolné)
   - **Supported account types**: zvol *"Accounts in any organizational
     directory and personal Microsoft accounts"*
   - **Redirect URI**: typ **Single-page application (SPA)**, hodnota =
     přesná adresa appky z kroku 1, např.
     `https://tvoje-jmeno.github.io/stavby-foto/`
4. Klikni **Register**.
5. Na stránce appky zkopíruj **Application (client) ID** — dlouhý kód
   ve formátu `xxxxxxxx-xxxx-xxxx-...`.
6. V levém menu appky jdi na **API permissions → Add a permission →
   Microsoft Graph → Delegated permissions** a přidej `Files.ReadWrite`.
   Klikni **Add permissions**. (Admin consent není u osobního účtu
   potřeba.)

7. Otevři soubor `config.js` v appce a vlož zkopírované ID:

   ```js
   clientId: "sem-vloz-zkopirovane-client-id",
   ```

8. Ulož a nahraj upravený `config.js` zpátky na GitHub (přepsat starý
   soubor). Do minuty se změna projeví na GitHub Pages adrese.

Appka je teď plně funkční.

---

## 3. Instalace appky na iPhone

1. Otevři Safari (musí to být Safari, ne Chrome) a jdi na adresu appky
   z kroku 1.
2. Klepni na ikonu **Sdílet** (čtvereček se šipkou nahoru).
3. Zvol **"Přidat na plochu"**.
4. Appka teď bude na ploše jako normální appka, s vlastní ikonou.

---

## 4. Jak appku používat

- **Přidání stavby**: na hlavní obrazovce klepni na "+ Nová stavba" a
  napiš název/adresu. Zůstane uložená v seznamu i pro příště.
- **Focení**: appka má vlastní živý náhled fotoaparátu se zoomem (posuvník
  pod obrazem). Klepnutím na velké kulaté tlačítko appka fotku:
  1. rovnou uloží do appky (roztříděnou pod aktuální stavbu),
  2. otevře systémové okno "Sdílet", kde jedním ťuknutím na "Uložit obrázek"
     fotku uložíš i do Fotek na iPhonu.

  Krok 2 vyžaduje jedno ťuknutí — iOS z bezpečnostních důvodů nedovolí
  žádné webové appce ukládat fotky do Fotek úplně potichu bez potvrzení.

- **Nativní fotoaparát**: ikona vpravo od spouště otevře plnohodnotnou
  appku Fotoaparát (ruční ostření, blesk, přepínání objektivů) pro
  situace, kdy potřebuješ maximální kontrolu nad snímkem.
- **Galerie**: ikona vlevo od spouště ukáže všechny fotky aktuální
  stavby. Klepnutím na fotku ji otevřeš na celou obrazovku, odkud ji
  můžeš dodatečně uložit do Fotek nebo smazat z appky.
- **Přepínání mezi stavbami**: kdykoliv během dne stačí přepnout v horní
  liště — appka si pamatuje, kterou máš aktivní.
- **Přehled**: dole v navigaci — vidíš všechny stavby, kolik fotek u
  nich čeká na nahrání, a kolik fotek celkem appka drží lokálně v telefonu.
- **Lokální záloha (ZIP)**: tlačítko "Zálohovat vše do Souborů (ZIP)"
  sbalí všechny fotky (roztříděné do složek podle stavby) do jednoho
  souboru a nabídne ho k uložení do appky Soubory / iCloud Drive — pro
  případ, že bys appku nebo telefon ztratil dřív, než stihneš nahrát na
  OneDrive.
- **Nahrání na OneDrive**: na obrazovce Přehled klepni na "Nahrát vše
  na OneDrive".
  - Appka tě přesměruje na přihlašovací stránku Microsoftu (ne
    vyskakovací okno — to je na iPhonu spolehlivější). Po přihlášení tě
    appka vrátí zpátky a pokračuje tam, kde skončila.
  - Při prvním nahrávání appka otevře **výběr cílové složky** — projdeš
    si strukturu svého OneDrive (klepáním se propracuješ do podsložek,
    šipkou zpět o úroveň výš) a tlačítkem "Vybrat tuto složku" určíš,
    kam se budou zakládat podsložky jednotlivých staveb. Appka si tuhle
    volbu zapamatuje; kdykoliv ji můžeš změnit tlačítkem "Změnit" vedle
    "Cíl na OneDrive" v Přehledu.
  - Fotky se pak nahrávají do `<vybraná složka>/<název stavby>`.

Appka funguje i offline — fotky se ukládají do telefonu a čekají, dokud
nemáš Wi-Fi/data a nespustíš nahrávání nebo export zálohy.

Při prvním spuštění appka požádá o **přístup ke kameře** — bez povolení
nepůjde použít živý náhled (pořád ale půjde použít nativní fotoaparát
přes tlačítko vpravo od spouště).

---

## Známá omezení

- Appka běží v Safari "obálce", takže má o něco menší přístup k systému
  než appka z App Store — v praxi to ale pro focení a nahrávání nevadí.
- **Zoom**: appka se snaží použít skutečný hardwarový zoom fotoaparátu.
  Pokud to telefon/prohlížeč nepodporuje, appka automaticky přepne na
  digitální zoom (oříznutí a zvětšení obrazu) — kvalita při vyšším zoomu
  bude o něco nižší, ale appka zůstane funkční.
- **Uložení do Fotek** vyžaduje vždy jedno ťuknutí na "Uložit obrázek" v
  systémovém okně — automatické potichu uložení iOS z bezpečnostních
  důvodů nedovoluje žádné webové appce.
- Barvy appky vycházejí z vizuálu webu pkv.cz — jde o vizuální odhad,
  ne o barvy natažené přímo z jejich CSS souborů. Pokud máš přesné hex
  kódy z brand manuálu, dej vědět a doladím `style.css` na míru.
- Nahrávání větších dávek fotek (desítky najednou) chvíli trvá — appku
  nechej otevřenou v popředí, dokud nedoběhne "Hotovo".
- Pokud appku smažeš z GitHubu nebo si vymažeš data Safari, lokálně
  uložené (ještě nenahrané) fotky se ztratí — proto je dobré appku
  nenechávat "viset" s nenahranými fotkami déle než pár dní, a v terénu
  používat i tlačítko "Zálohovat do Souborů (ZIP)" jako druhou pojistku.
