/* =========================================================
   STAVBY FOTO — app.js
   Vše běží lokálně v telefonu (IndexedDB), dokud nezmáčkneš
   "Nahrát vše na OneDrive" na obrazovce Přehled.
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

function addPhoto(stavba, blob) {
  return new Promise((resolve, reject) => {
    const record = {
      stavba,
      blob,
      filename: `IMG_${Date.now()}.jpg`,
      timestamp: Date.now(),
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

function markUploaded(id) {
  return new Promise((resolve, reject) => {
    const store = tx("photos", "readwrite");
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      rec.uploaded = 1;
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve();
      putReq.onerror = (e) => reject(e.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
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
  $("#screen-folderpicker").classList.toggle("screen--hidden", name !== "folderpicker");
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("tab--active", t.dataset.screen === name);
  });
  if (name === "overview") renderOverview();
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------- Render: hlavní obrazovka ----------
async function renderMain() {
  const stavby = await getAllStavby();
  const select = $("#stavbaSelect");
  select.innerHTML = "";

  if (stavby.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "— nejdřív přidej stavbu —";
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
  $("#shutterHint").textContent = currentStavba ? `Fotíš: ${currentStavba}` : "Vyber nebo přidej stavbu";
  $("#btnShoot").disabled = !currentStavba;

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
    div.className = "thumb" + (p.uploaded ? "" : " pending");
    const img = document.createElement("img");
    img.src = URL.createObjectURL(p.blob);
    div.appendChild(img);
    div.addEventListener("click", () => openLightbox(p));
    thumbsEl.appendChild(div);
  });
}

// ---------- Přidání nové stavby ----------
$("#btnNewStavba").addEventListener("click", async () => {
  const name = prompt("Název / adresa nové stavby:");
  if (!name || !name.trim()) return;
  const clean = name.trim();
  await addStavba(clean);
  currentStavba = clean;
  await renderMain();
  toast(`Stavba "${clean}" přidána`);
});

$("#stavbaSelect").addEventListener("change", async (e) => {
  currentStavba = e.target.value;
  localStorage.setItem("currentStavba", currentStavba);
  await renderThumbs();
});

// ---------- Přejmenování stavby ----------
async function promptRenameStavba(oldName) {
  const newName = prompt("Nový název / adresa stavby:", oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  const clean = newName.trim();

  const existing = await getAllStavby();
  if (existing.some(s => s.name === clean)) {
    toast("Stavba s tímhle názvem už existuje");
    return;
  }

  await renameStavba(oldName, clean);
  if (currentStavba === oldName) currentStavba = clean;
  await renderMain();
  toast(`Přejmenováno na "${clean}"`);
}

$("#btnEditStavba").addEventListener("click", () => {
  if (!currentStavba) { toast("Nejdřív přidej stavbu"); return; }
  promptRenameStavba(currentStavba);
});

$("#ovList").addEventListener("click", (e) => {
  const btn = e.target.closest(".ov-edit-btn");
  if (!btn) return;
  promptRenameStavba(btn.dataset.name).then(renderOverview);
});

// =========================================================
// FOCENÍ — otevírá rovnou nativní fotoaparát iPhonu
// =========================================================
$("#btnShoot").addEventListener("click", () => {
  if (!currentStavba) return;
  $("#cameraInput").click();
});

$("#cameraInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || !currentStavba) return;
  await addPhoto(currentStavba, file);
  await renderMain();
  toast("Uloženo ✓");
});

// =========================================================
// GALERIE + LIGHTBOX
// =========================================================
$("#btnGallery").addEventListener("click", async () => {
  if (!currentStavba) { toast("Nejdřív vyber stavbu"); return; }
  $("#galTitle").textContent = `Galerie — ${currentStavba}`;
  const grid = $("#galGrid");
  grid.innerHTML = "";
  const photos = await getPhotosByStavba(currentStavba);
  if (photos.length === 0) {
    grid.innerHTML = `<p class="gal-empty">Zatím žádné fotky u téhle stavby.</p>`;
  } else {
    photos.forEach(p => {
      const div = document.createElement("div");
      div.className = "gal-thumb";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(p.blob);
      div.appendChild(img);
      div.addEventListener("click", () => openLightbox(p));
      grid.appendChild(div);
    });
  }
  switchScreen("gallery");
});

$("#btnGalBack").addEventListener("click", () => switchScreen("main"));

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
  await deletePhoto(currentLightboxPhoto.id);
  closeLightbox();
  await renderMain();
  $("#btnGallery").click();
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
  $("#targetFolderLabel").textContent = getTargetRootLabel();

  if (stavby.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-dim); font-family:'IBM Plex Mono',monospace; font-size:13px;">Zatím žádné stavby. Přidej první na hlavní obrazovce.</p>`;
  }

  let totalPending = 0;

  stavby.forEach(s => {
    const photos = allPhotos.filter(p => p.stavba === s.name);
    const pending = photos.filter(p => !p.uploaded).length;
    totalPending += pending;

    const item = document.createElement("div");
    item.className = "ov-item";
    item.innerHTML = `
      <div>
        <div class="ov-item-name">${escapeHtml(s.name)}</div>
        <div class="ov-item-meta">${photos.length} snímků celkem</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="ov-edit-btn" data-name="${escapeHtml(s.name)}" aria-label="Přejmenovat">
          <i class="ti ti-pencil" aria-hidden="true"></i>
        </button>
        <div class="ov-badge ${pending > 0 ? "ov-badge--pending" : "ov-badge--done"}">
          ${pending > 0 ? pending + " čeká" : "hotovo"}
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });

  const btn = $("#btnUploadAll");
  btn.disabled = totalPending === 0;
  btn.textContent = totalPending > 0
    ? `Nahrát vše na OneDrive (${totalPending})`
    : "Vše nahráno";
}

$("#btnExportZip").addEventListener("click", async () => {
  const status = $("#uploadStatus");
  const allPhotos = await getAllPhotos();
  if (allPhotos.length === 0) { toast("Není co zálohovat."); return; }

  status.textContent = "Balím zálohu…";
  const zip = new JSZip();
  allPhotos.forEach(p => {
    const folder = zip.folder(p.stavba || "Neurčeno");
    folder.file(p.filename, p.blob);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `stavby_zaloha_${dateStr}.zip`;

  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  status.textContent = `Záloha "${filename}" stažena — ulož ji ve Files do bezpečného místa.`;
});

// =========================================================
// ONEDRIVE — přihlášení přesměrováním + výběr cílové složky
// =========================================================
const SCOPES = ["Files.ReadWrite"];
let msalInstance;
let graphAccount;

function initMsal() {
  msalInstance = new msal.PublicClientApplication({
    auth: {
      clientId: APP_CONFIG.clientId,
      authority: APP_CONFIG.authority,
      redirectUri: APP_CONFIG.redirectUri
    },
    cache: { cacheLocation: "localStorage" }
  });
}

// Po návratu z přihlašovací stránky (nebo při běžném načtení appky)
async function completeRedirectIfAny() {
  try {
    const resp = await msalInstance.handleRedirectPromise();
    if (resp && resp.account) {
      graphAccount = resp.account;
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) graphAccount = accounts[0];
    }
  } catch (err) {
    console.error("Přihlášení selhalo:", err);
    $("#uploadStatus").textContent = `Přihlášení selhalo: ${err.message}`;
  }

  const pending = sessionStorage.getItem("stavbyPendingAction");
  if (pending && graphAccount) {
    sessionStorage.removeItem("stavbyPendingAction");
    switchScreen("overview");
    await handleUploadRequest();
  }
}

async function getGraphToken() {
  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes: SCOPES,
      account: graphAccount
    });
    return result.accessToken;
  } catch (e) {
    // Tiché obnovení nevyšlo — přesměrujeme na přihlášení znovu
    sessionStorage.setItem("stavbyPendingAction", "upload");
    await msalInstance.acquireTokenRedirect({ scopes: SCOPES });
    return null; // appka teď opustí stránku
  }
}

async function graphFetch(path, token, options = {}) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  return res;
}

function encodeURIPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function ensureFolder(token, folderPath) {
  if (!folderPath) return; // prázdná cesta = kořen OneDrive, ten už existuje
  const getRes = await graphFetch(`/me/drive/root:/${encodeURIPath(folderPath)}`, token);
  if (getRes.ok) return;

  const parts = folderPath.split("/");
  const name = parts.pop();
  const parentPath = parts.join("/");

  const createUrl = parentPath
    ? `/me/drive/root:/${encodeURIPath(parentPath)}:/children`
    : `/me/drive/root/children`;

  const createRes = await graphFetch(createUrl, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail"
    })
  });

  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(`Nepodařilo se vytvořit složku "${folderPath}" (${createRes.status})`);
  }
}

async function uploadPhoto(token, stavba, photo) {
  const root = getTargetRootPath() || "";
  const folderPath = root ? `${root}/${stavba}` : stavba;

  if (root) await ensureFolder(token, root);
  await ensureFolder(token, folderPath);

  const uploadPath = `${folderPath}/${photo.filename}`;
  const res = await graphFetch(
    `/me/drive/root:/${encodeURIPath(uploadPath)}:/content`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: photo.blob
    }
  );
  if (!res.ok) {
    throw new Error(`Nahrání selhalo (${res.status})`);
  }
}

// ---------- Výběr cílové složky ----------
function getTargetRootPath() {
  return localStorage.getItem("oneDriveRootPath"); // null = zatím nevybráno
}

function getTargetRootLabel() {
  return localStorage.getItem("oneDriveRootLabel") || "nevybráno";
}

let pickerToken = null;
let pickerStack = [{ id: null, name: "OneDrive" }];

async function listFolderChildren(token, folderId) {
  const url = folderId
    ? `/me/drive/items/${folderId}/children?$select=id,name,folder`
    : `/me/drive/root/children?$select=id,name,folder`;
  const res = await graphFetch(url, token);
  if (!res.ok) throw new Error(`Nepodařilo se načíst složky (${res.status})`);
  const data = await res.json();
  return (data.value || []).filter(item => item.folder);
}

async function openFolderPicker() {
  const token = await getGraphToken();
  if (!token) return; // appka přesměrovává na přihlášení
  pickerToken = token;
  pickerStack = [{ id: null, name: "OneDrive" }];
  switchScreen("folderpicker");
  await renderFolderPicker();
}

async function renderFolderPicker() {
  $("#folderBreadcrumb").textContent = pickerStack.map(s => s.name).join(" / ");
  const listEl = $("#folderList");
  listEl.innerHTML = `<p class="folder-empty">Načítám…</p>`;
  const current = pickerStack[pickerStack.length - 1];
  try {
    const children = await listFolderChildren(pickerToken, current.id);
    listEl.innerHTML = "";
    if (children.length === 0) {
      listEl.innerHTML = `<p class="folder-empty">Žádné podsložky — klidně vyber tuhle přes tlačítko dole.</p>`;
    }
    children.forEach(f => {
      const row = document.createElement("div");
      row.className = "folder-row";
      row.innerHTML = `<i class="ti ti-folder" aria-hidden="true"></i><span>${escapeHtml(f.name)}</span>`;
      row.addEventListener("click", () => {
        pickerStack.push({ id: f.id, name: f.name });
        renderFolderPicker();
      });
      listEl.appendChild(row);
    });
  } catch (err) {
    listEl.innerHTML = `<p class="folder-empty">Chyba: ${escapeHtml(err.message)}</p>`;
  }
}

$("#btnFolderCancel").addEventListener("click", () => {
  if (pickerStack.length > 1) {
    pickerStack.pop();
    renderFolderPicker();
  } else {
    switchScreen("overview");
  }
});

$("#btnFolderChoose").addEventListener("click", async () => {
  const path = pickerStack.slice(1).map(s => s.name).join("/");
  const label = pickerStack.map(s => s.name).join(" / ");
  localStorage.setItem("oneDriveRootPath", path);
  localStorage.setItem("oneDriveRootLabel", label);
  toast("Cílová složka nastavena");
  switchScreen("overview");

  const pending = sessionStorage.getItem("stavbyPendingAction");
  if (pending === "upload-ready") {
    sessionStorage.removeItem("stavbyPendingAction");
    await performUpload();
  }
});

$("#btnChangeFolder").addEventListener("click", () => {
  if (!graphAccount) { handleUploadRequest(); return; }
  openFolderPicker();
});

// ---------- Spuštění nahrávání ----------
async function handleUploadRequest() {
  if (APP_CONFIG.clientId === "SEM-VLOZ-SVOJE-CLIENT-ID") {
    $("#uploadStatus").textContent = "⚠ Appka ještě není nastavená pro OneDrive.\nViz README.md → \"Nastavení OneDrive přihlášení\".";
    return;
  }

  if (!graphAccount) {
    sessionStorage.setItem("stavbyPendingAction", "upload");
    $("#uploadStatus").textContent = "Přesměrovávám na přihlášení…";
    await msalInstance.loginRedirect({ scopes: SCOPES });
    return; // appka teď opustí stránku
  }

  if (getTargetRootPath() === null) {
    sessionStorage.setItem("stavbyPendingAction", "upload-ready");
    await openFolderPicker();
    return;
  }

  await performUpload();
}

async function performUpload() {
  const statusEl = $("#uploadStatus");
  const btn = $("#btnUploadAll");
  try {
    btn.disabled = true;
    statusEl.textContent = "Získávám přístup…";
    const token = await getGraphToken();
    if (!token) return; // appka přesměrovává, obnovení proběhne po návratu

    const allPhotos = (await getAllPhotos()).filter(p => !p.uploaded);
    if (allPhotos.length === 0) {
      statusEl.textContent = "Není co nahrávat.";
      return;
    }
    let done = 0;
    for (const photo of allPhotos) {
      statusEl.textContent = `Nahrávám ${done + 1}/${allPhotos.length}\n(${photo.stavba})`;
      await uploadPhoto(token, photo.stavba, photo);
      await markUploaded(photo.id);
      done++;
    }
    statusEl.textContent = `Hotovo — nahráno ${done} fotek.`;
    toast("Nahrávání dokončeno ✓");
    await renderOverview();
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Chyba: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

$("#btnUploadAll").addEventListener("click", handleUploadRequest);

// ---------- Start ----------
(async function init() {
  db = await openDB();
  initMsal();
  await renderMain();
  await completeRedirectIfAny();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
