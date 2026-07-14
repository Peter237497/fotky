# Stavby Foto — appka pro focení a třídění fotek podle objektu

Appka funguje jako "appka" na ploše iPhonu (PWA), i když je to technicky
webová stránka. Fotky se ukládají lokálně v telefonu, roztříděné podle
objektu. Kdykoliv budeš chtít, jedním tlačítkem si celou sadu (roztříděnou
do složek podle objektu) stáhneš jako ZIP soubor do appky Soubory.

Funguje bez Macu, Xcode i App Store — jen se appka nahraje na GitHub Pages
(zdarma hosting) a na iPhonu se přidá na plochu přes Safari.

---

## 1. Nahrání appky na GitHub Pages

1. Na GitHubu vytvoř nový **veřejný repozitář**, např. `objekty-foto`.
2. Nahraj do něj všechny soubory z téhle appky (`index.html`, `style.css`,
   `app.js`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`) —
   buď přes web rozhraní GitHubu (drag & drop / "Upload files"), nebo přes
   Git.
3. V repozitáři jdi do **Settings → Pages**.
4. U "Source" vyber **Deploy from a branch**, branch `main`, složka `/root`.
   Ulož.
5. Za chvíli se ti zobrazí adresa appky, typicky:
   `https://tvoje-jmeno.github.io/objekty-foto/`

---

## 2. Instalace appky na iPhone

1. Otevři Safari (musí to být Safari, ne Chrome) a jdi na adresu appky
   z kroku 1.
2. Klepni na ikonu **Sdílet** (čtvereček se šipkou nahoru).
3. Zvol **"Přidat na plochu"**.
4. Appka teď bude na ploše jako normální appka, s vlastní ikonou.

---

## 3. Jak appku používat

- **Přidání objektu**: na hlavní obrazovce klepni na "+ Nový objekt" a
  napiš název/adresu. Zůstane uložená v seznamu i pro příště.
- **Focení**: vyber objekt v horní liště, klepni na kulaté tlačítko —
  otevře se přímo nativní fotoaparát iPhonu s plnou kvalitou a všemi
  ovládacími prvky (ostření, blesk, zoom). Po vyfocení se appka vrátí
  zpátky a fotku rovnou zařadí pod vybraný objekt.
- **Přejmenování objektu**: tužka vedle výběru objektu na hlavní
  obrazovce, nebo tužka u každého objektu v Přehledu. Fotky se automaticky
  přesunou pod nový název.
- **Galerie**: ikona vlevo od spouště ti ukáže všechny fotky
  aktuálního objektu. Klepnutím na fotku ji otevřeš na celou obrazovku, odkud ji
  můžeš i smazat.
- **Přehled**: dole v navigaci — vidíš všechny objekty, kolik fotek u
  nich je, a kolik fotek appka drží lokálně v telefonu.
- **Záloha (ZIP)**: tlačítko "Zálohovat vše do Souborů (ZIP)" sbalí
  všechny fotky (roztříděné do složek podle objektu) do jednoho souboru
  a nabídne ho k uložení do appky Soubory / iCloud Drive. Tohle je
  jediný způsob, jak fotky z appky dostat ven — appka sama nikam nic
  automaticky neposílá.
- **Smazání všeho**: dole v Přehledu je tlačítko "Smazat všechny
  objekty a fotky" — nevratná akce s potvrzením, pro vyčištění appky
  po předání zálohy dál.

Appka funguje i offline — fotky se ukládají do telefonu a čekají, dokud
je sám nezazálohuješ.

---

## Známá omezení

- Appka běží v Safari "obálce", takže má o něco menší přístup k systému
  než appka z App Store — v praxi to ale pro focení a zálohování nevadí.
- Barvy appky vycházejí z vizuálu webu pkv.cz — jde o vizuální odhad,
  ne o barvy natažené přímo z jejich CSS souborů.
- Balení většího množství fotek do ZIP souboru chvíli trvá — appku
  nechej otevřenou v popředí, dokud se stahování nespustí.
- Pokud appku smažeš z GitHubu nebo si vymažeš data Safari, lokálně
  uložené fotky se ztratí — proto appku pravidelně zálohuj tlačítkem
  "Zálohovat vše do Souborů (ZIP)" a nenechávej v ní fotky viset déle,
  než je nutné.
