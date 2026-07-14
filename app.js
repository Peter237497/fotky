/* =========================================================
   STAVBY FOTO — app.js
   Vše běží lokálně v telefonu (IndexedDB). Fotky se zálohují
   ven jen na vyžádání, tlačítkem "Zálohovat vše do Souborů (ZIP)".
   ========================================================= */

// ---------- IndexedDB wrapper ----------
const DB_NAME = "stavbyDB";
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const _db = e.target.result;
      if (!_db.objectStoreNames.contains("stavby")) {
        _db.createObjectStore("stavby", { keyPath: "name" });
      }
      if (!_db.objectStoreNames.contains("photos")) {
        const store = _db.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
        store.createIndex("stavba", "stavba", { unique: false });
        store.createIndex("uploaded", "uploaded", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function addStavba(name) {
  return new Promise((resolve, reject) => {
    const r = tx("stavby", "readwrite").put({ name, created: Date.now() });
    r.onsuccess = () => resolve();
    r.onerror = (e) => reject(e.target.error);
  });
}

function getAllStavby() {
  return new Promise((resolve, reject) => {
    const r = tx("stavby", "readonly").getAll();
    r.onsuccess = () => resolve(r.result.sort((a, b) => b.created - a.created));
    r.onerror = (e) => reject(e.target.error);
  });
}

function formatFilenameTimestamp(ts) {
  const d = new Date(ts);
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
    + `-${pad(d.getMilliseconds(), 3)}`; // ms na konci jen pro jistotu unikátnosti
}

function addPhoto(stavba, blob, subfolder = "") {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const record = {
      stavba,
      blob,
      filename: `${formatFilenameTimestamp(now)}.jpg`,
      timestamp: now,
      subfolder,
      uploaded: 0
    };
    const r = tx("photos", "readwrite").add(record);
    r.onsuccess = () => resolve({ ...record, id: r.result });
    r.onerror = (e) => reject(e.target.error);
  });
}

function getPhotosByStavba(stavba) {
  return new Promise((resolve, reject) => {
    const idx = tx("photos", "readonly").index("stavba");
    const r = idx.getAll(stavba);
    r.onsuccess = () => resolve(r.result.sort((a, b) => b.timestamp - a.timestamp));
    r.onerror = (e) => reject(e.target.error);
  });
}

function getAllPhotos() {
  return new Promise((resolve, reject) => {
    const r = tx("photos", "readonly").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = (e) => reject(e.target.error);
  });
}

function deletePhoto(id) {
  return new Promise((resolve, reject) => {
    const r = tx("photos", "readwrite").delete(id);
    r.onsuccess = () => resolve();
    r.onerror = (e) => reject(e.target.error);
  });
}

function renameStavba(oldName, newName) {
  return new Promise((resolve, reject) => {
    const stavbyStore = tx("stavby", "readwrite");
    const getReq = stavbyStore.get(oldName);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (!rec) { resolve(); return; }
      stavbyStore.put({ name: newName, created: rec.created });
      stavbyStore.delete(oldName);

      const photosStore = tx("photos", "readwrite");
      const idx = photosStore.index("stavba");
      const cursorReq = idx.openCursor(IDBKeyRange.only(oldName));
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const photo = cursor.value;
          photo.stavba = newName;
          cursor.update(photo);
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = (e) => reject(e.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

function clearAllData() {
  return new Promise((resolve, reject) => {
    const t = db.transaction(["stavby", "photos"], "readwrite");
    t.objectStore("stavby").clear();
    t.objectStore("photos").clear();
    t.oncomplete = () => resolve();
    t.onerror = (e) => reject(e.target.error);
  });
}
// ---------- Stav appky ----------
let currentStavba = localStorage.getItem("currentStavba") || null;
let currentLightboxPhoto = null;

// ---------- UI helpers ----------
const $ = (sel) => document.querySelector(sel);

function toast(msg, ms = 2400) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), ms);
}

function switchScreen(name) {
  $("#screen-main").classList.toggle("screen--hidden", name !== "main");
  $("#screen-gallery").classList.toggle("screen--hidden", name !== "gallery");
  $("#screen-overview").classList.toggle("screen--hidden", name !== "overview");
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("tab--active", t.dataset.screen === name);
  });
  if (name === "overview") renderOverview();
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------- Render: hlavní obrazovka ----------
// ---------- PD podsložka ----------
let pdMode = false;

function updatePDButton() {
  const btn = $("#btnPD");
  btn.classList.toggle("active", pdMode);
  btn.disabled = !currentStavba;
}

async function renderMain() {
  const stavby = await getAllStavby();
  const select = $("#stavbaSelect");
  select.innerHTML = "";

  if (stavby.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "— nejdřív přidej objekt —";
    opt.value = "";
    select.appendChild(opt);
    currentStavba = null;
  } else {
    stavby.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
    if (!currentStavba || !stavby.find(s => s.name === currentStavba)) {
      currentStavba = stavby[0].name;
    }
    select.value = currentStavba;
  }

  localStorage.setItem("currentStavba", currentStavba || "");
  $("#tbDate").textContent = fmtDate(Date.now());
  $("#shutterHint").textContent = currentStavba
    ? `Fotíš: ${currentStavba}${pdMode ? " → PD" : ""}`
    : "Vyber nebo přidej objekt";
  $("#btnShoot").disabled = !currentStavba;
  updatePDButton();

  await renderThumbs();
}

async function renderThumbs() {
  const thumbsEl = $("#thumbs");
  thumbsEl.innerHTML = "";
  if (!currentStavba) {
    $("#tbCount").textContent = "0";
    return;
  }
  const photos = await getPhotosByStavba(currentStavba);
  $("#tbCount").textContent = String(photos.length);

  photos.slice(0, 12).forEach(p => {
    const div = document.createElement("div");
    div.className = "thumb";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(p.blob);
    div.appendChild(img);
    if (p.subfolder) {
      const badge = document.createElement("span");
      badge.className = "thumb-badge";
      badge.textContent = p.subfolder;
      div.appendChild(badge);
    }
    div.addEventListener("click", () => openLightbox(p));
    thumbsEl.appendChild(div);
  });
}

// ---------- Přidání nové stavby ----------
$("#btnNewStavba").addEventListener("click", async () => {
  const name = prompt("Název / adresa nového objektu:");
  if (!name || !name.trim()) return;
  const clean = name.trim();
  await addStavba(clean);
  currentStavba = clean;
  await renderMain();
  toast(`Objekt "${clean}" přidán`);
});

$("#btnNewStavbaOverview").addEventListener("click", async () => {
  const name = prompt("Název / adresa nového objektu:");
  if (!name || !name.trim()) return;
  const clean = name.trim();
  await addStavba(clean);
  if (!currentStavba) currentStavba = clean; // první stavba se rovnou nastaví jako aktivní
  await renderMain();
  await renderOverview();
  toast(`Objekt "${clean}" přidán`);
});

$("#stavbaSelect").addEventListener("change", async (e) => {
  currentStavba = e.target.value;
  localStorage.setItem("currentStavba", currentStavba);
  pdMode = false; // ať přepnutí objektu neposílá fotky omylem do cizí PD
  await renderMain();
});

// ---------- Přejmenování stavby ----------
async function promptRenameStavba(oldName) {
  const newName = prompt("Nový název / adresa objektu:", oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  const clean = newName.trim();

  const existing = await getAllStavby();
  if (existing.some(s => s.name === clean)) {
    toast("Objekt s tímhle názvem už existuje");
    return;
  }

  await renameStavba(oldName, clean);
  if (currentStavba === oldName) currentStavba = clean;
  await renderMain();
  toast(`Přejmenováno na "${clean}"`);
}

$("#btnEditStavba").addEventListener("click", () => {
  if (!currentStavba) { toast("Nejdřív přidej objekt"); return; }
  promptRenameStavba(currentStavba);
});

$("#ovList").addEventListener("click", (e) => {
  const pill = e.target.closest(".ov-name-pill");
  if (pill) {
    promptRenameStavba(pill.dataset.name).then(renderOverview);
    return;
  }
  const item = e.target.closest(".ov-item");
  if (item) {
    openGalleryFor(item.dataset.name, "overview");
  }
});

// =========================================================
// FOCENÍ — otevírá rovnou nativní fotoaparát iPhonu
// =========================================================
$("#btnShoot").addEventListener("click", () => {
  if (!currentStavba) return;
  $("#cameraInput").click();
});

$("#btnPD").addEventListener("click", () => {
  if (!currentStavba) { toast("Nejdřív vyber objekt"); return; }
  pdMode = !pdMode;
  updatePDButton();
  $("#shutterHint").textContent = `Fotíš: ${currentStavba}${pdMode ? " → PD" : ""}`;
  toast(pdMode ? "Fotky teď jdou do podsložky PD" : "Fotky jdou zpátky do hlavní složky objektu");
});

$("#cameraInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || !currentStavba) return;
  await addPhoto(currentStavba, file, pdMode ? "PD" : "");
  await renderMain();
  toast(pdMode ? "Uloženo do PD ✓" : "Uloženo ✓");
});

// =========================================================
// GALERIE + LIGHTBOX
// =========================================================
let galleryReturnScreen = "main";

async function openGalleryFor(name, returnScreen) {
  if (!name) { toast("Nejdřív vyber objekt"); return; }
  galleryReturnScreen = returnScreen;
  $("#galTitle").textContent = `Galerie — ${name}`;
  const grid = $("#galGrid");
  grid.innerHTML = "";
  const photos = await getPhotosByStavba(name);
  if (photos.length === 0) {
    grid.innerHTML = `<p class="gal-empty">Zatím žádné fotky u tohohle objektu.</p>`;
  } else {
    photos.forEach(p => {
      const div = document.createElement("div");
      div.className = "gal-thumb";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(p.blob);
      div.appendChild(img);
      if (p.subfolder) {
        const badge = document.createElement("span");
        badge.className = "thumb-badge";
        badge.textContent = p.subfolder;
        div.appendChild(badge);
      }
      div.addEventListener("click", () => openLightbox(p));
      grid.appendChild(div);
    });
  }
  switchScreen("gallery");
}

$("#btnGallery").addEventListener("click", () => openGalleryFor(currentStavba, "main"));

$("#btnGalBack").addEventListener("click", () => switchScreen(galleryReturnScreen));

function openLightbox(photo) {
  currentLightboxPhoto = photo;
  $("#lightboxImg").src = URL.createObjectURL(photo.blob);
  $("#lightbox").classList.add("show");
}

function closeLightbox() {
  $("#lightbox").classList.remove("show");
  currentLightboxPhoto = null;
}

$("#lightboxClose").addEventListener("click", closeLightbox);
$("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });

$("#lightboxDelete").addEventListener("click", async () => {
  if (!currentLightboxPhoto) return;
  if (!confirm("Smazat tuto fotku z appky? Pokud jsi ji už uložil/a do Fotek, tam zůstane.")) return;
  const name = currentLightboxPhoto.stavba;
  await deletePhoto(currentLightboxPhoto.id);
  closeLightbox();
  await renderMain();
  await openGalleryFor(name, galleryReturnScreen);
});

// ---------- Navigace ----------
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchScreen(tab.dataset.screen));
});

// =========================================================
// PŘEHLED — počty a lokální ZIP záloha
// =========================================================
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function renderOverview() {
  const stavby = await getAllStavby();
  const allPhotos = await getAllPhotos();
  const listEl = $("#ovList");
  listEl.innerHTML = "";

  $("#backupCount").textContent = `${allPhotos.length} fotek`;

  if (stavby.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-dim); font-family:'IBM Plex Mono',monospace; font-size:13px;">Zatím žádné objekty. Přidej první na hlavní obrazovce.</p>`;
  }

  stavby.forEach(s => {
    const photos = allPhotos.filter(p => p.stavba === s.name);

    const item = document.createElement("div");
    item.className = "ov-item";
    item.dataset.name = s.name;
    item.innerHTML = `
      <div>
        <button class="ov-name-pill" data-name="${escapeHtml(s.name)}" aria-label="Přejmenovat stavbu">
          <span>${escapeHtml(s.name)}</span>
          <i class="ti ti-pencil" aria-hidden="true"></i>
        </button>
        <div class="ov-item-meta">${photos.length} snímků celkem</div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

$("#btnResetAll").addEventListener("click", async () => {
  const allPhotos = await getAllPhotos();
  const stavby = await getAllStavby();
  if (stavby.length === 0 && allPhotos.length === 0) {
    toast("Není co mazat.");
    return;
  }

  const ok = confirm(
    `Opravdu smazat VŠECHNY objekty (${stavby.length}) a VŠECHNY fotky (${allPhotos.length}) z appky?\n\nTohle nejde vzít zpět. Fotky, které jsi ještě nezálohoval/a přes "Zálohovat vše do Souborů (ZIP)", se ztratí.`
  );
  if (!ok) return;

  await clearAllData();
  currentStavba = null;
  localStorage.removeItem("currentStavba");
  await renderMain();
  await renderOverview();
  toast("Smazáno — appka je prázdná");
});

$("#btnExportZip").addEventListener("click", async () => {
  const status = $("#uploadStatus");
  const allPhotos = await getAllPhotos();
  if (allPhotos.length === 0) { toast("Není co zálohovat."); return; }

  status.textContent = "Balím zálohu…";
  const zip = new JSZip();
  allPhotos.forEach(p => {
    const base = zip.folder(p.stavba || "Neurčeno");
    const target = p.subfolder ? base.folder(p.subfolder) : base;
    target.file(p.filename, p.blob);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `objekty_zaloha_${dateStr}.zip`;

  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  status.textContent = `Záloha "${filename}" stažena — ulož ji ve Files do bezpečného místa.`;
});

// ---------- Start ----------
(async function init() {
  db = await openDB();
  await renderMain();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
