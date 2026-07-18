// app.js — منطق FAHAD TV الرئيسي (مفصول من ui.html في v1.30)

/* سيتم ملؤها من backend عبر get_rows() */
let ROWS = [

  { label:"التطبيقات والترفيه", apps:[
    { id:"netflix", name:"نتفلكس", sub:"Netflix", glyph:"🎬", c1:"#8f1f24", c2:"#4a0f12", img:"" },
    { id:"media",   name:"مشغل الوسائط", sub:"Media Player", glyph:"🎵", c1:"#1f7a72", c2:"#0f423d", img:"" },
  ]},
  { label:"الوصول السريع", apps:[
    { id:"browser", name:"المتصفح", sub:"Google Chrome", glyph:"🌐", c1:"#1d5c8f", c2:"#12395c", img:"" },
    { id:"youtube", name:"يوتيوب", sub:"YouTube", glyph:"▶️", c1:"#a3282d", c2:"#5e1518", img:"" },
    { id:"files", name:"مستكشف الملفات", sub:"File Explorer", glyph:"📁", c1:"#a67c1e", c2:"#5f470f", img:"" },
  ]},
  { label:"ألعابي", apps:[
    { id:"steam", name:"مكتبة الألعاب", sub:"Steam", glyph:"🎮", c1:"#31566e", c2:"#1b3242", img:"" },
  ]},
];

const GLYPHS = ["🌐","🎮","🎬","🎵","📁","⚙️","📺","🕹️","🎧","📷","💬","📚","🏃","🧩","📌"];
const rowsEl = document.getElementById("rows");
let pos = { row:0, col:0 };

async function resolveImage(img) {
  if(!img) return "";
  if(img.startsWith("http") || img.startsWith("data:")) return img;
  if(window.pywebview && window.pywebview.api) {
    try {
      const b64 = await window.pywebview.api.read_image(img);
      if(b64) return b64;
    } catch(e) {}
  }
  // fallback: try file:// URI
  const p = String(img).replace(/\\/g,"/");
  if(/^[a-zA-Z]:/.test(p)) return "file:///" + encodeURI(p);
  return p;
}

/* ============ البناء والعرض ============ */
let currentView = "home"; // "home" or "apps"
let VIEW_ROWS = [];

document.getElementById("tab-home").addEventListener("click", () => {
  currentView = "home";
  document.getElementById("tab-home").classList.add("active");
  document.getElementById("tab-apps").classList.remove("active");
  const te2 = document.getElementById("tab-ent"); if(te2) te2.classList.remove("active");
  const ev2 = document.getElementById("ent-view"); if(ev2) ev2.style.display = "none";
  document.getElementById("tab-matches").classList.remove("active");
  const te = document.getElementById("tab-ent"); if(te) te.classList.remove("active");
  const ev = document.getElementById("ent-view"); if(ev) ev.style.display = "none";
  document.getElementById("rows").style.display = "flex";
  document.getElementById("matches-view").style.display = "none";
  pos = {row:0, col:0};
  resetNavToContent();
  build();
});
document.getElementById("tab-apps").addEventListener("click", () => {
  currentView = "apps";
  document.getElementById("tab-apps").classList.add("active");
  document.getElementById("tab-home").classList.remove("active");
  document.getElementById("tab-matches").classList.remove("active");
  const te = document.getElementById("tab-ent"); if(te) te.classList.remove("active");
  const ev = document.getElementById("ent-view"); if(ev) ev.style.display = "none";
  document.getElementById("rows").style.display = "flex";
  document.getElementById("matches-view").style.display = "none";
  pos = {row:0, col:0};
  resetNavToContent();
  build();
});
document.getElementById("tab-matches").addEventListener("click", async () => {
  currentView = "matches";
  document.getElementById("tab-matches").classList.add("active");
  document.getElementById("tab-home").classList.remove("active");
  document.getElementById("tab-apps").classList.remove("active");
  const te2 = document.getElementById("tab-ent"); if(te2) te2.classList.remove("active");
  const ev2 = document.getElementById("ent-view"); if(ev2) ev2.style.display = "none";
  document.getElementById("rows").style.display = "none";
  document.getElementById("matches-view").style.display = "flex";
  resetNavToContent();
  loadMatches();
});


const tabEnt = document.getElementById("tab-ent");
if(tabEnt) {
  tabEnt.addEventListener("click", () => {
    currentView = "ent";
    document.getElementById("tab-ent").classList.add("active");
    document.getElementById("tab-home").classList.remove("active");
    document.getElementById("tab-apps").classList.remove("active");
    document.getElementById("tab-matches").classList.remove("active");
    document.getElementById("rows").style.display = "none";
    document.getElementById("matches-view").style.display = "none";
    document.getElementById("ent-view").style.display = "flex";
    resetNavToContent();
    if(typeof showEntPage === 'function') showEntPage('discover');
  });
}

let allAvailableLeagues = [];
let favoriteLeagueIds = [];

document.getElementById("btn-manage-leagues").addEventListener("click", async () => {
    document.getElementById("leagues-dialog").style.display = "flex";
    
    if (window.pywebview && window.pywebview.api) {
        const r = await window.pywebview.api.get_settings();
        favoriteLeagueIds = r.sports && r.sports.favoriteLeagues ? r.sports.favoriteLeagues : ["307", "39", "140", "135", "2", "17"];
    }
    
    if(allAvailableLeagues.length === 0 && window.pywebview && window.pywebview.api) {
        document.getElementById("leagues-grid").innerHTML = `<div style="text-align:center; padding:3em; grid-column: 1 / -1;"><div style="display:inline-block; width:40px; height:40px; border:4px solid var(--line); border-top-color:var(--focus); border-radius:50%; animation:spin 1s linear infinite;"></div><div style="margin-top:1em; color:var(--ink-dim);">جاري جلب قائمة جميع البطولات المتاحة...</div></div>`;
        const res = await window.pywebview.api.get_all_leagues();
        if(res && res.status === "success") {
            allAvailableLeagues = res.data;
        }
    }
    renderLeaguesModal(allAvailableLeagues);
});

document.getElementById("btn-close-leagues").addEventListener("click", () => {
    document.getElementById("leagues-dialog").style.display = "none";
});

document.getElementById("btn-save-leagues").addEventListener("click", async () => {
    // Get currently visible checked boxes
    const visibleCheckboxes = Array.from(document.querySelectorAll(".league-modal-cb"));
    visibleCheckboxes.forEach(cb => {
        if(cb.checked && !favoriteLeagueIds.includes(cb.value)) {
            favoriteLeagueIds.push(cb.value);
        } else if (!cb.checked && favoriteLeagueIds.includes(cb.value)) {
            favoriteLeagueIds = favoriteLeagueIds.filter(id => id !== cb.value);
        }
    });
    
    if (window.pywebview && window.pywebview.api) {
        const r = await window.pywebview.api.get_settings();
        const sports = r.sports || {};
        sports.favoriteLeagues = favoriteLeagueIds;
        await window.pywebview.api.update_settings({ sports: sports });
        
        document.getElementById("leagues-dialog").style.display = "none";
        document.getElementById("matches-content").innerHTML = `<div style="text-align:center; padding:3em;"><div style="display:inline-block; width:40px; height:40px; border:4px solid var(--line); border-top-color:var(--focus); border-radius:50%; animation:spin 1s linear infinite;"></div><div style="margin-top:1em; color:var(--ink-dim); font-weight:600;">جاري تحديث المباريات...</div></div>`;
        loadMatches(true);
    }
});

document.getElementById("search-leagues").addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    if(!term) {
        renderLeaguesModal(allAvailableLeagues);
        return;
    }

    const arabicMap = {
      "saudi-arabia": "السعودية دوري روشن السعودي",
      "england": "انجلترا الانجليزي بريميرليج",
      "spain": "اسبانيا الاسباني لاليغا",
      "italy": "ايطاليا الايطالي الكالتشيو",
      "germany": "المانيا الالماني بوندسليغا",
      "france": "فرنسا الفرنسي",
      "premier league": "الدوري الانجليزي الممتاز",
      "pro league": "الدوري السعودي روشن",
      "la liga": "الدوري الاسباني",
      "serie a": "الدوري الايطالي",
      "bundesliga": "الدوري الالماني",
      "ligue 1": "الدوري الفرنسي",
      "uefa champions league": "دوري ابطال اوروبا الشامبيونزليج",
      "world": "العالم",
      "uefa europa league": "الدوري الاوروبي اليوروباليج",
      "afc champions league": "دوري ابطال اسيا",
      "caf champions league": "دوري ابطال افريقيا",
      "world cup": "كاس العالم المونديال",
      "euro": "امم اوروبا يورو",
      "egypt": "مصر المصري",
      "morocco": "المغرب المغربي",
      "qatar": "قطر القطري",
      "united-arab-emirates": "الامارات الاماراتي",
      "copa america": "كوبا امريكا",
      "brazil": "البرازيل البرازيلي",
      "argentina": "الارجنتين الارجنتيني",
      "portugal": "البرتغال البرتغالي"
    };

    const filtered = allAvailableLeagues.filter(l => {
        const nameEn = (l.name || "").toLowerCase();
        const countryEn = (l.country || "").toLowerCase();
        
        let mappedAr = "";
        for (const [en, ar] of Object.entries(arabicMap)) {
            if (nameEn.includes(en) || countryEn.includes(en)) {
                mappedAr += " " + ar;
            }
        }
        
        const combined = (nameEn + " " + countryEn + mappedAr).toLowerCase();
        return combined.includes(term);
    });
    renderLeaguesModal(filtered);
});

function renderLeaguesModal(leaguesToRender) {
    const container = document.getElementById("leagues-grid");
    if(leaguesToRender.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color:var(--ink-dim); padding:2em; font-size:1.1rem;">لم يتم العثور على بطولات مطابقة للبحث</div>`;
        return;
    }
    
    // If not searching, show favorites first, then top 100 to avoid lag
    const isSearching = document.getElementById("search-leagues").value.trim() !== "";
    let displayList = leaguesToRender;
    if(!isSearching && allAvailableLeagues.length > 0) {
        const favs = allAvailableLeagues.filter(l => favoriteLeagueIds.includes(l.id));
        const others = allAvailableLeagues.filter(l => !favoriteLeagueIds.includes(l.id));
        displayList = [...favs, ...others].slice(0, 150); // Show favorites + some top leagues
    }
    
    let html = "";
    displayList.forEach(lg => {
        const checked = favoriteLeagueIds.includes(lg.id) ? "checked" : "";
        html += `
            <label style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.5em; cursor:pointer; background:var(--bg); padding:1em; border-radius:12px; border:1px solid var(--line); transition:border-color .2s; position:relative;">
                <input type="checkbox" class="league-modal-cb" value="${lg.id}" ${checked} style="position:absolute; top:10px; right:10px; width:1.2em; height:1.2em; cursor:pointer;" onchange="
                    if(this.checked) {
                        if(!favoriteLeagueIds.includes(this.value)) favoriteLeagueIds.push(this.value);
                    } else {
                        favoriteLeagueIds = favoriteLeagueIds.filter(id => id !== this.value);
                    }
                ">
                <img src="${lg.logo}" loading="lazy" decoding="async" style="width:48px; height:48px; object-fit:contain;">
                <span style="font-weight:600; color:var(--ink); text-align:center; font-size:.9rem;">${lg.name}</span>
                <span style="color:var(--ink-dim); font-size:.7rem; text-align:center;">${lg.country}</span>
            </label>
        `;
    });
    container.innerHTML = html;
}

let sportsTimer = null;
let lastMatchesData = null;

async function loadMatches(force = false) {
  if (currentView !== "matches") return;
  if (!window.pywebview || !window.pywebview.api) return;
  document.getElementById("matches-content").innerHTML = `<div style="text-align:center; padding:3em;"><div style="display:inline-block; width:40px; height:40px; border:4px solid var(--line); border-top-color:var(--focus); border-radius:50%; animation:spin 1s linear infinite;"></div><div style="margin-top:1em; color:var(--ink-dim); font-weight:600;">جاري تحميل المباريات...</div></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
  try {
    const res = await window.pywebview.api.get_sports_data(force);
    if (res && (res.status === "success" || res.status === "error_fallback")) {
      lastMatchesData = res.data;
      renderMatches(res.data);
    } else {
      const offline = !navigator.onLine;
      document.getElementById("matches-content").innerHTML = `
        <div style="text-align:center;padding:3em 2em;">
          <div style="font-size:3rem;margin-bottom:.2em;">${offline ? '📡' : '⚠️'}</div>
          <div style="color:${offline ? 'var(--ink)' : '#ff6b6b'};font-size:1.2rem;margin-bottom:1em;">${offline ? 'تحقق من اتصالك بالإنترنت' : 'تعذّر جلب بيانات المباريات'}</div>
          <button onclick="loadMatches(true)" style="background:#fff;color:#000;border:none;border-radius:10px;padding:.6em 1.4em;font-weight:700;cursor:pointer;">🔄 إعادة المحاولة</button>
        </div>`;
    }
  } catch (e) { console.error(e); }
}

function renderMatches(matches) {
  const container = document.getElementById("matches-content");
  if (!matches || matches.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;color:var(--ink-dim);padding:3em 2em;">
        <div style="font-size:3.4rem;margin-bottom:.2em;opacity:.8;">⚽</div>
        <div style="font-size:1.2rem;margin-bottom:1.2em;color:var(--ink);">لا توجد مباريات ضمن بطولاتك خلال هذه الفترة</div>
        <button onclick="document.getElementById('btn-manage-leagues').click()" style="background:#fff;color:#000;border:none;border-radius:10px;padding:.7em 1.5em;font-weight:700;cursor:pointer;font-size:1rem;">⚙️ إدارة البطولات</button>
      </div>`;
    return;
  }
  const live = matches.filter(m => m.status === 'live');
  const upcoming = matches.filter(m => m.status === 'upcoming');
  const finished = matches.filter(m => m.status === 'finished');
  
  let html = '';
  if(live.length > 0) html += buildMatchGroup('مباريات جارية الآن 🔴', live);
  if(upcoming.length > 0) html += buildMatchGroup('مباريات قادمة ⏳', upcoming);
  if(finished.length > 0) html += buildMatchGroup('مباريات منتهية 🏁', finished);
  
  container.innerHTML = html;
  
  clearInterval(sportsTimer);
  const interval = live.length > 0 ? 60000 : 30 * 60000;
  sportsTimer = setInterval(() => loadMatches(true), interval);
}

function buildMatchGroup(title, matches) {
  let html = `<div class="match-group"><div class="match-group-title">${title}</div><div class="matches-grid">`;
  matches.forEach(m => {
    let scoreHtml = m.status === 'upcoming' 
      ? `<div class="match-time">${m.time}</div>`
      : `<div class="match-score">${m.homeScore} - ${m.awayScore}</div><div style="font-size:.8rem;color:var(--ink-dim);">${m.minute || ''}</div>`;
      
    let statusClass = m.status === 'live' ? 'match-status live' : 'match-status';
    let statusText = m.status === 'live'
      ? `<span class="live-dot"></span>مباشر${m.minute ? ' ' + m.minute : ''}`
      : (m.status === 'upcoming' ? m.date : `انتهت (${m.date})`);

    html += `
      <div class="match-card">
        <div class="match-header">
          <div class="match-comp">🏆 ${m.competition.name}</div>
          <div class="${statusClass}">${statusText}</div>
        </div>
        <div class="match-teams">
          <div class="match-team">
            ${m.homeTeam.logo ? `<img class="match-team-logo" src="${m.homeTeam.logo}" loading="lazy" decoding="async">` : `<div class="match-team-logo" style="display:flex;align-items:center;justify-content:center;color:#000;">${m.homeTeam.name.substring(0,2)}</div>`}
            <div class="match-team-name">${m.homeTeam.name}</div>
          </div>
          <div class="match-score-box">${scoreHtml}</div>
          <div class="match-team">
            ${m.awayTeam.logo ? `<img class="match-team-logo" src="${m.awayTeam.logo}" loading="lazy" decoding="async">` : `<div class="match-team-logo" style="display:flex;align-items:center;justify-content:center;color:#000;">${m.awayTeam.name.substring(0,2)}</div>`}
            <div class="match-team-name">${m.awayTeam.name}</div>
          </div>
        </div>
      </div>
    `;
  });
  html += `</div></div>`;
  return html;
}

function build(){
  VIEW_ROWS = [];
  if(currentView === "home") {
    let allApps = [];
    ROWS.forEach((r, rIdx) => r.apps.forEach((a, cIdx) => allApps.push({...a, _r: rIdx, _c: cIdx})));
    let recents = allApps.filter(a => a.lastOpened > 0).sort((a,b) => b.lastOpened - a.lastOpened).slice(0, 10);
    let favs = allApps.filter(a => a.favorite);
    
    if(recents.length > 0) VIEW_ROWS.push({ label: "المستخدمة مؤخراً", apps: recents, readonly: true });
    if(favs.length > 0) VIEW_ROWS.push({ label: "المفضلة", apps: favs, readonly: true });
    if(VIEW_ROWS.length === 0) VIEW_ROWS.push({ label: "لا يوجد تطبيقات حديثة أو مفضلة", apps: [], readonly: true });
  } else {
    VIEW_ROWS = ROWS.map((r, rIdx) => ({
      label: r.label,
      apps: r.apps.map((a, cIdx) => ({...a, _r: rIdx, _c: cIdx})),
      readonly: false,
      _r: rIdx
    }));
  }

  rowsEl.innerHTML = "";
  VIEW_ROWS.forEach((row, r) => {
    const section = document.createElement("section");
    section.className = "row";
    const isReadonly = row.readonly;
    const rowActions = isReadonly ? "" : `
        <button style="background:none;border:none;color:var(--ink-dim);cursor:pointer;" onclick="renameRow(${row._r})">✏️</button>
        <button style="background:none;border:none;color:var(--ink-dim);cursor:pointer;" onclick="moveRow(${row._r}, true)">⬆️</button>
        <button style="background:none;border:none;color:var(--ink-dim);cursor:pointer;" onclick="moveRow(${row._r}, false)">⬇️</button>
        <button style="background:none;border:none;color:#ff6b6b;cursor:pointer;" onclick="deleteRow(${row._r})">🗑</button>
    `;
    section.innerHTML = `
      <div class="row-label" style="display:flex;justify-content:center;align-items:center;gap:.5em;">
        ${row.label}
        ${rowActions}
      </div>`;
    const tiles = document.createElement("div");
    tiles.className = "tiles";
    row.apps.forEach((app, c) => {
      const origR = app._r;
      const origC = app._c;
      const b = document.createElement("button");
      b.className = "tile";

      b.style.setProperty("--glow", (app.c1||"#ffffff") + "66");
      b.dataset.row = r; b.dataset.col = c;
      const bg = app.backgroundPath || app.img;
      const ic = app.iconPath;
      
      b.style.background = `linear-gradient(145deg, ${app.c1||"#31566e"}, ${app.c2||"#1b3242"})`;
      
      if(bg){
        resolveImage(bg).then(data => {
          if(data) b.style.background = `linear-gradient(rgba(10,12,16,.1), rgba(10,12,16,.6)), url("${data}") center/cover no-repeat`;
        });
      }
      
      const isSys = SYSTEM_IDS && SYSTEM_IDS.has(app.id);
      let visualHtml = "";
      
      // We pass the actual app object from ROWS to functions instead of VIEW_ROWS
      const actionsHtml = isSys
        ? `<div class="actions-overlay"><button onclick="event.stopPropagation(); launch(ROWS[${origR}].apps[${origC}])">▶</button></div>`
        : `<div class="actions-overlay">
             <button onclick="event.stopPropagation(); launch(ROWS[${origR}].apps[${origC}])">▶</button>
             <button onclick="event.stopPropagation(); openDialog('edit', ROWS[${origR}].apps[${origC}])">✏</button>
             <button onclick="event.stopPropagation(); pos={row:${r},col:${c}}; requestDelete()">🗑</button>
           </div>`;
      b.innerHTML = `${visualHtml}
                     <span class="name">${app.name}</span>
                     <span class="sub">${app.sub || ""}</span>
                     ${actionsHtml}`;
                     
      if(!bg && ic) {
        resolveImage(ic).then(data => {
          if(data) {
            const imgEl = document.createElement("img");
            imgEl.src = data;
            imgEl.style.cssText = "position:absolute;top:1em;inset-inline-start:1em;width:48px;height:48px;object-fit:contain;border-radius:8px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35));";
            b.appendChild(imgEl);
          }
        });
      }

      b.addEventListener("click", () => { pos={row:r,col:c}; render(); launch(app); });
      tiles.appendChild(b);
    });
    if(!row.readonly) {
      const plus = document.createElement("button");
      plus.className = "tile add";
      plus.dataset.row = r; plus.dataset.col = row.apps.length;
      plus.innerHTML = `<span class="plus">＋</span><span class="name">إضافة تطبيق</span>`;
      plus.addEventListener("click", () => { pos={row:r,col:row.apps.length}; render(); openDialog("add", null, row._r); });
      tiles.appendChild(plus);
    }
    section.appendChild(tiles);
    rowsEl.appendChild(section);
  });
  
  if(currentView === "apps") {
    const addRowBtn = document.createElement("button");
    addRowBtn.style.cssText = "margin:1em auto;padding:.5em 1.5em;background:var(--bg-deep);border:1px dashed var(--line);color:var(--ink-dim);border-radius:12px;cursor:pointer;";
    addRowBtn.textContent = "＋ صف جديد";
    addRowBtn.onclick = async () => {
      const name = prompt("اسم الصف الجديد:");
      if(!name) return;
      if(window.pywebview) {
        const res = await window.pywebview.api.add_row(name);
        if(res.ok) { ROWS = res.rows; build(); }
      } else {
        ROWS.push({label:name, apps:[]}); build();
      }
    };
    rowsEl.appendChild(addRowBtn);
  }

  pos.row = Math.min(pos.row, VIEW_ROWS.length-1);
  if(VIEW_ROWS.length > 0) pos.col = Math.min(pos.col, VIEW_ROWS[pos.row].apps.length);
  render();
  wireTileDragDrop();
}

async function renameRow(r){
  const name = prompt("تعديل اسم الصف:", ROWS[r].label);
  if(!name) return;
  if(window.pywebview){
    const res = await window.pywebview.api.rename_row(r, name);
    if(res.ok){ ROWS = res.rows; build(); }
  }
}
async function moveRow(r, up){
  if(window.pywebview){
    const res = await window.pywebview.api.move_row(r, up);
    if(res.ok){ ROWS = res.rows; build(); }
  }
}
async function deleteRow(r){
  if(confirm("حذف هذا الصف وكل ما فيه؟")){
    if(window.pywebview){
      const res = await window.pywebview.api.delete_row(r);
      if(res.ok){ ROWS = res.rows; build(); }
    }
  }
}


function colCount(r){ return ROWS[r].apps.length + 1; }
function currentApp(){ return ROWS[pos.row].apps[pos.col] || null; }

/* ============ وضع الترتيب (Move Mode) ============ */
let moveMode = false;
const moveBanner = document.getElementById("move-banner");

function enterMoveMode(){
  const app = currentApp();
  if(!app) return;
  moveMode = true;
  moveBanner.classList.add("show");
  render();
  toast(`✋ وضع الترتيب — حرّك ${app.name}`);
}

function exitMoveMode(confirmed){
  moveMode = false;
  moveBanner.classList.remove("show");
  render();
  toast(confirmed ? "✅ تم الحفظ" : "❌ تم الإلغاء");
}

function getAppByRC(r,c){
  if(!ROWS[r] || !ROWS[r].apps) return null;
  return ROWS[r].apps[c] || null;
}

function findRCByAppId(appId){
  for(let r=0;r<ROWS.length;r++){
    const idx = (ROWS[r].apps||[]).findIndex(a=>a.id===appId);
    if(idx>=0) return {r, c: idx};
  }
  return null;
}


function render(){
  document.querySelectorAll(".tile").forEach(t=>{
    const isFocused = +t.dataset.row===pos.row && +t.dataset.col===pos.col;
    t.classList.toggle("focused", isFocused && !moveMode);
    t.classList.toggle("moving",  isFocused && moveMode);
    if(isFocused) t.scrollIntoView({block:"nearest", inline:"center", behavior:"smooth"});
  });
  document.querySelectorAll(".row").forEach((s,i)=>{
    s.classList.toggle("active", i===pos.row);
    // scroll active row into view inside the main container
    if(i===pos.row) s.scrollIntoView({block:"nearest", behavior:"smooth"});
  });
  const app = currentApp();
  const ambient = document.getElementById("ambient");
  if(app) {
     const bg = app.backgroundPath || app.img;
     if(bg) {
       resolveImage(bg).then(data => {
         if(data && currentApp() === app) {
           ambient.style.background = `url("${data}") center/cover no-repeat`;
           ambient.style.filter = "blur(30px)";
           ambient.style.opacity = "0.4";
         }
       });
     } else if(app.c1) {
       ambient.style.background = `radial-gradient(700px 500px at 50% 60%, ${app.c1}33, transparent 70%)`;
       ambient.style.filter = "none";
       ambient.style.opacity = "0.35";
     } else {
       ambient.style.background = "none";
       ambient.style.filter = "none";
     }
  } else {
     ambient.style.background = "none";
     ambient.style.filter = "none";
  }
}

function move(dx, dy){
  if(dy){ pos.row = Math.min(Math.max(pos.row+dy,0), ROWS.length-1);
          pos.col = Math.min(pos.col, colCount(pos.row)-1); }
  if(dx){ pos.col = Math.min(Math.max(pos.col+dx,0), colCount(pos.row)-1); }
  render();
}

/* ============ التنبيهات ============ */
let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 3000);
}

/* ============ التشغيل ============ */
async function launch(app){

  if(!app){ openDialog("add"); return; }
  
  // Intercept settings app ID
  if(app.id === "settings_fahadtv"){
    openSettings();
    return;
  }
  if(app.id === "power_fahadtv"){
    document.getElementById("power-dialog").style.display = "flex";
    return;
  }

  toast(`جارٍ تشغيل ${app.name}…`);
  if(window.pywebview && window.pywebview.api){
    try{
      const r = await window.pywebview.api.launch(app.id);
      if(!r.ok) toast(r.msg || "فشل التشغيل");
    }catch{ toast("فشل التشغيل"); }
  }else{
    toast("وضع المعاينة — التشغيل الفعلي يكون من التطبيق (HTPCLauncher.exe)");
  }
}

/* ============ نافذة الإضافة/تعديل ============ */
const dlg = document.getElementById("dialog");
let dlgGlyph = GLYPHS[0];
let dlgImg = "";        /* "" = بدون تغيير/بدون صورة، "none" = إزالة، رابط = صورة جديدة */
let editingId = null;   /* null = وضع الإضافة */

function renderGlyphs(){
  // Removed glyph logic
}

function renderImgResults(list){
  const box = document.getElementById("dlg-img-results");
  box.innerHTML = "";
  list.forEach(item=>{
    const im = document.createElement("img");
    im.src = item.url; im.title = item.name || "";
    im.addEventListener("click", ()=>{
      dlgImg = item.url;
      box.querySelectorAll("img").forEach(x=>x.classList.toggle("sel", x===im));
    });
    box.appendChild(im);
  });
}

async function doImgSearch(){
  const q = document.getElementById("dlg-img-q").value.trim();
  if(!q) return;
  if(q.startsWith("http")){        /* رابط صورة مباشر */
    dlgImg = q;
    renderImgResults([{url:q, name:"رابط مباشر"}]);
    document.querySelector("#dlg-img-results img")?.classList.add("sel");
    return;
  }
  if(!(window.pywebview && window.pywebview.api)){
    toast("البحث عن الصور متاح داخل التطبيق فقط — الصق رابط صورة بدلًا منه");
    return;
  }
  toast("جارٍ البحث…");
  try{
    const r = await window.pywebview.api.search_images(q);
    if(r.ok) renderImgResults(r.results);
    else toast(r.msg || "ما لقيت صور");
  }catch{ toast("فشل البحث"); }
}
document.getElementById("dlg-img-btn").addEventListener("click", doImgSearch);
document.getElementById("dlg-img-q").addEventListener("keydown", e=>{
  if(e.key==="Enter"){ doImgSearch(); e.preventDefault(); }
});
document.getElementById("dlg-img-remove").addEventListener("click", ()=>{
  dlgImg = "none";
  document.getElementById("dlg-img-results").innerHTML = "";
  toast("بتنشال الصورة عند الحفظ");
});

document.getElementById("dlg-browse-exe")?.addEventListener("click", async ()=>{
  if(window.pywebview && window.pywebview.api){
    const r = await window.pywebview.api.browse_file("exe");
    if(r.ok){
       if(r.paths && r.paths.length > 1){
         const rowIdx = parseInt(document.getElementById("dlg-row-select").value, 10);
         toast(`جارٍ إضافة ${r.paths.length} تطبيقات…`);
         const res = await window.pywebview.api.add_apps_bulk(rowIdx, r.paths);
         if(res.ok){ ROWS = res.rows; closeDialog(); build(); toast(`تم إضافة ${res.count} تطبيقات ✓`); }
         else{ toast(res.msg || "فشل الإضافة"); }
       }else{
         document.getElementById("dlg-path").value = r.path;
       }
    }
  }
});
document.getElementById("dlg-browse-icon")?.addEventListener("click", async ()=>{
  if(window.pywebview && window.pywebview.api){
    const r = await window.pywebview.api.browse_file("icon");
    if(r.ok){
      dlgImg = r.path;
      document.getElementById("dlg-img-q").value = r.path;
    }
  }
});

function openDialog(mode, app, forceRow = -1){
  // حماية التطبيقات النظامية
  if(mode === "edit" && app && isSystemApp(app)){
    toast("ℹ️ هذا تطبيق نظامي — افتح الإعدادات من الزر أعلى");
    return;
  }
  editingId = mode==="edit" && app ? app.id : null;
  dlgImg = "";
  document.getElementById("dlg-title").textContent = editingId ? `تعديل: ${app.name}` : "إضافة تطبيق";
  
  const rowSelect = document.getElementById("dlg-row-select");
  rowSelect.innerHTML = "";
  ROWS.forEach((r, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = r.label;
    if(forceRow !== -1 && forceRow === idx) opt.selected = true;
    else if(editingId && findRCByAppId(app.id)?.r === idx) opt.selected = true;
    else if(!editingId && forceRow === -1 && pos.row === idx) opt.selected = true;
    rowSelect.appendChild(opt);
  });
  
  document.getElementById("dlg-name").value = editingId ? app.name : "";
  document.getElementById("dlg-path").value = editingId ? (typeof app.target==="string" ? app.target : "") : "";
  document.getElementById("dlg-img-q").value = "";
  document.getElementById("dlg-img-results").innerHTML = "";
  document.getElementById("dlg-c1").value = editingId ? (app.c1 || "#31566e") : "#31566e";
  document.getElementById("dlg-c2").value = editingId ? (app.c2 || "#1b3242") : "#1b3242";
  document.getElementById("dlg-favorite").checked = editingId ? (app.favorite === true) : false;
  document.getElementById("dlg-hidden").checked = editingId ? (app.hidden === true) : false;
  document.getElementById("dlg-img-remove").style.display = (editingId && (app.backgroundPath || app.img)) ? "inline" : "none";

  dlg.classList.add("open");
  setTimeout(()=>document.getElementById("dlg-name").focus(), 50);
}
function closeDialog(){ dlg.classList.remove("open"); editingId = null; }

document.getElementById("dlg-cancel").addEventListener("click", closeDialog);
document.getElementById("dlg-save").addEventListener("click", async ()=>{
  const name = document.getElementById("dlg-name").value.trim();
  const path = document.getElementById("dlg-path").value.trim();
  const newRowIdx = parseInt(document.getElementById("dlg-row-select").value);
  const c1 = document.getElementById("dlg-c1").value;
  const c2 = document.getElementById("dlg-c2").value;
  const favorite = document.getElementById("dlg-favorite").checked;
  const hidden = document.getElementById("dlg-hidden").checked;
  const inApp = window.pywebview && window.pywebview.api;
  const dlgGlyph = "";

  if(editingId){
    if(inApp){
      toast("جارٍ الحفظ…");
      const r = await window.pywebview.api.update_app(editingId, name, path, dlgGlyph, dlgImg, "", newRowIdx, c1, c2, favorite, hidden);

      if(r.ok){ ROWS = r.rows; closeDialog(); build(); toast("تم التعديل ✓"); }
      else toast(r.msg || "ما قدرت أعدّله");
    }else{
      const row = ROWS.find(r=>r.apps.some(a=>a.id===editingId));
      if(row){
        const app = row.apps.find(a=>a.id===editingId);
        app.name=name; app.target=path; app.glyph=dlgGlyph; app.c1=c1; app.c2=c2; app.favorite=favorite; app.hidden=hidden;
        if(dlgImg==="none"){ app.img=""; app.backgroundPath=""; } else if(dlgImg) app.img=dlgImg; }
      closeDialog(); build(); toast("تم التعديل (وضع المعاينة)");
    }
    return;
  }

  if(!name || !path){ toast("لازم تكتب الاسم والمسار"); return; }
  if(inApp){
    toast("جارٍ الإضافة…");
    const r = await window.pywebview.api.add_app(newRowIdx, name, path, dlgGlyph, dlgImg, "", c1, c2, favorite, hidden);
    if(r.ok){ ROWS = r.rows; closeDialog(); build(); toast(`انضاف ${name} ✓`); }
    else toast(r.msg || "ما قدرت أضيفه");
  }else{
    ROWS[newRowIdx].apps.push({ id:"tmp_"+Date.now(), name, sub:path, glyph:dlgGlyph,
      c1:c1, c2:c2, img: dlgImg && dlgImg!=="none" ? dlgImg : "", favorite, hidden });
    closeDialog(); build(); toast(`انضاف ${name} (مؤقتًا — وضع المعاينة)`);
  }
});

/* ============ حذف تطبيق (Delete مرتين) ============ */
const SYSTEM_IDS = new Set(["settings", "settings_fahadtv", "power_fahadtv"]);
function isSystemApp(app){ return app && SYSTEM_IDS.has(app.id); }

let pendingDelete = null, pendingTimer;
async function requestDelete(){
  const app = currentApp();
  if(!app) return;
  if(isSystemApp(app)){ toast("⛔ لا يمكن حذف تطبيقات النظام"); return; }
  if(pendingDelete === app.id){
    clearTimeout(pendingTimer); pendingDelete = null;
    if(window.pywebview && window.pywebview.api){
      const r = await window.pywebview.api.remove_app(app.id);
      if(r.ok){ ROWS = r.rows; build(); toast(`انحذف ${app.name}`); }
      else toast(r.msg || "ما قدرت أحذفه");
    }else{
      ROWS[pos.row].apps.splice(pos.col, 1); build(); toast(`انحذف ${app.name} (وضع المعاينة)`);
    }
  }else{
    pendingDelete = app.id;
    toast(`اضغط Delete مرة ثانية لحذف ${app.name}`);
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(()=>{ pendingDelete = null; }, 3000);
  }
}

/* ============ Context Menu: Right Click ============ */
let ctxState = { app: null, rc: null };
const ctxEl = document.getElementById("ctxMenu");

function closeCtx(){
  ctxEl.classList.remove("show");
  ctxState.app = null;
  ctxState.rc = null;
}

function openCtxForApp(app, rc, clientX, clientY){
  if(!app) return;
  ctxState.app = app;
  ctxState.rc = rc;

  // Make visible off-screen first to measure
  ctxEl.style.visibility = "hidden";
  ctxEl.style.display = "block";
  const pad = 10;
  const w = ctxEl.offsetWidth || 300;
  const h = ctxEl.offsetHeight || 280;
  ctxEl.style.display = "";
  ctxEl.style.visibility = "";

  let x = clientX;
  let y = clientY;
  if(x + w + pad > window.innerWidth)  x = window.innerWidth - w - pad;
  if(y + h + pad > window.innerHeight) y = window.innerHeight - h - pad;
  if(x < pad) x = pad;
  if(y < pad) y = pad;

  ctxEl.style.left = x + "px";
  ctxEl.style.top  = y + "px";
  ctxEl.classList.add("show");
  ctxJustOpened = true;
  setTimeout(()=>{ ctxJustOpened = false; }, 50);
}

let ctxJustOpened = false;
document.addEventListener("click", (e)=>{
  if(ctxJustOpened) return;
  if(ctxEl.classList.contains("show") && !ctxEl.contains(e.target)) closeCtx();
});

document.addEventListener("contextmenu", (e)=>{
  // right click on a tile -> open our Fluent context menu
  const tile = e.target && e.target.closest ? e.target.closest(".tile") : null;
  if(!tile) return;

  e.preventDefault();

  const rc = tileRCFromEl(tile);
  const app = getAppByRC(rc.r, rc.c);
  if(!app) return;

  openCtxForApp(app, rc, e.clientX, e.clientY);
});

function tileRCFromEl(el){
  return { r: +el.dataset.row, c: +el.dataset.col };
}

function wireTileDragDrop(){
  const tiles = document.querySelectorAll(".tile");
  tiles.forEach(el=>{
    if(el.classList.contains("add")) return;

    el.draggable = true;

    el.addEventListener("dragstart", (ev)=>{
      const rc = tileRCFromEl(el);
      const app = getAppByRC(rc.r, rc.c);
      if(!app) return;
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", JSON.stringify({ appId: app.id, fromR: rc.r, fromC: rc.c }));
      el.classList.add("dragging");
    });

    el.addEventListener("dragend", ()=>{
      el.classList.remove("dragging");
      document.querySelectorAll(".tile.drag-over").forEach(x=>x.classList.remove("drag-over"));
    });

    el.addEventListener("dragover", (ev)=>{
      if(!ev.dataTransfer) return;
      ev.preventDefault(); // allow drop
      el.classList.add("drag-over");
      ev.dataTransfer.dropEffect = "move";
    });

    el.addEventListener("dragleave", ()=>{
      el.classList.remove("drag-over");
    });

    el.addEventListener("drop", async (ev)=>{
      ev.preventDefault();
      el.classList.remove("drag-over");

      const raw = ev.dataTransfer.getData("text/plain");
      if(!raw) return;

      let payload = null;
      try{ payload = JSON.parse(raw); }catch{ payload = null; }
      if(!payload) return;

      const toRc = tileRCFromEl(el);

      if(payload.appId && window.pywebview && window.pywebview.api){
        toast("جارٍ النقل…");
        const r = await window.pywebview.api.reorder_app(payload.appId, payload.fromR, payload.fromC, toRc.r, toRc.c);
        if(r.ok){
          ROWS = r.rows;
          build();
          toast("تم الترتيب ✓");
        }else{
          toast(r.msg || "فشل الترتيب");
        }
      }else{
        // preview mode fallback
        const fromRow = ROWS[payload.fromR];
        const toRow = ROWS[toRc.r];
        const item = fromRow.apps.splice(payload.fromC,1)[0];
        toRow.apps.splice(toRc.c,0,item);
        build();
        toast("تم الترتيب (معاينة)");
      }
    });
  });
}

async function ctxAction(action){
  const app = ctxState.app;
  const rc = ctxState.rc;
  if(!app || !rc) return;

  switch(action){
    case "launch":
      closeCtx();
      launch(app);
      return;
    case "toggle_favorite":
      closeCtx();
      if(window.pywebview && window.pywebview.api){
        toast("جارٍ التحديث...");
        const newVal = !app.favorite;
        const target = typeof app.target==='string' ? app.target : "";
        window.pywebview.api.update_app(app.id, app.name, target, app.glyph||"", app.img||"", app.iconPath||"", -1, app.c1||"", app.c2||"", newVal, app.hidden===true).then(r => {
            if(r.ok){ ROWS = r.rows; build(); toast(newVal ? "⭐ تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة"); }
        });
      }
      return;
    case "edit":
      closeCtx();
      openDialog("edit", app);
      return;
    case "rename":
      closeCtx();
      openDialog("edit", app);
      return;
    case "change_icon":
      closeCtx();
      openDialog("edit", app);
      return;
    case "change_background":
      closeCtx();
      openDialog("edit", app);
      return;
    case "move":
      closeCtx();
      pos = {row: rc.r, col: rc.c};
      render();
      enterMoveMode();
      return;
    case "duplicate":
      if(window.pywebview && window.pywebview.api){
        const newName = app.name + " (نسخة)";
        // duplicate = add new app same target/background/icon/glyph
        // stage-1: reuse add_app and then patch fields via update_app if needed
        const rIndex = rc.r;
        const r = await window.pywebview.api.add_app(rIndex, newName, typeof app.target==='string'?app.target:"", app.glyph||"📌", app.backgroundPath||"", "");
        if(r.ok){ ROWS = r.rows; build(); toast("تم النسخ ✓"); }
        else toast(r.msg || "فشل النسخ");
      }else{
        const newId = "tmp_"+Date.now();
        const copy = JSON.parse(JSON.stringify(app));
        copy.id = newId;
        copy.name = app.name + " (نسخة)";
        ROWS[rc.r].apps.splice(rc.c+1, 0, copy);
        closeCtx(); build(); toast("تم النسخ (معاينة)");
      }
      return;
    case "remove_from_home":
    case "delete_shortcut":
      // In this project: same as remove application from home
      closeCtx();
      pos = {row: rc.r, col: rc.c};
      requestDelete();
      return;
    case "properties":
      closeCtx();
      toast(`الخصائص: ${app.name}`);
      return;
  }
}

document.querySelectorAll("#ctxMenu .ctx-item").forEach(btn=>{
  btn.addEventListener("click", async ()=>{
    const action = btn.dataset.action;
    await ctxAction(action);
  });
});

/* ============ لوحة المفاتيح / الريموت ============ */
let enterPressTimer = null;
let isEnterHeld = false;

document.addEventListener("keyup", e => {
  if (e.key === "Enter" && isEnterHeld) {
    isEnterHeld = false;
    if(enterPressTimer) {
      clearTimeout(enterPressTimer);
      enterPressTimer = null;
      if(!dlg.classList.contains("open") && document.getElementById("settings-dialog").style.display !== "flex") {
         if (navZone === "content" && (currentView === "home" || currentView === "apps")) {
            launch(currentApp());
         }
      }
    }
  }
});

/* ============ نظام التنقّل الموحّد بالمناطق (Zones) ============
   يعمل مع الكيبورد ويد التحكم. المناطق: 'content' (المحتوى) و'header' (الشريط العلوي).
   الاتجاهات بصرية دائماً (right = يمين الشاشة فعلياً) فيصح مع الواجهة RTL تلقائياً. */
let navZone = "content";
let headerIdx = 0;
let contentFocusEl = null;

function getHeaderItems(){
  const ids = ["tab-home","tab-apps","tab-ent","tab-matches","btn-search","btn-import","btn-settings","btn-sleep","btn-restart","btn-shutdown","btn-restart-app","btn-exit"];
  const els = ids.map(id => document.getElementById(id)).filter(el => el && el.offsetParent !== null);
  els.sort((a,b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  return els;
}

function clearNavFocus(){
  document.querySelectorAll(".nav-focus").forEach(e => e.classList.remove("nav-focus"));
}

function focusHeader(idx){
  const items = getHeaderItems();
  if(!items.length) return;
  headerIdx = Math.max(0, Math.min(idx, items.length - 1));
  clearNavFocus();
  const el = items[headerIdx];
  el.classList.add("nav-focus");
  if(el.focus) el.focus({ preventScroll:true });
}

function enterHeader(){
  navZone = "header";
  const items = getHeaderItems();
  let startIdx = items.findIndex(el => el.classList.contains("active"));
  if(startIdx < 0) startIdx = 0;
  focusHeader(startIdx);
}

function getContentFocusables(){
  let sel = "";
  if(currentView === "matches") sel = "#matches-view #btn-manage-leagues, #matches-view .match-card";
  else if(currentView === "ent") sel = "#ent-view .ent-nav .nav-tab, #ent-view .ent-card";
  else return [];
  return Array.from(document.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
}

function setContentFocus(el){
  clearNavFocus();
  contentFocusEl = el || null;
  if(el){
    el.classList.add("nav-focus");
    el.scrollIntoView({ block:"nearest", inline:"center", behavior:"smooth" });
  }
}

function exitHeaderToContent(){
  navZone = "content";
  clearNavFocus();
  if(currentView === "home" || currentView === "apps"){
    render();
  } else {
    const items = getContentFocusables();
    if(items.length) setContentFocus(items.includes(contentFocusEl) ? contentFocusEl : items[0]);
  }
}

/* تنقّل هندسي: يختار أقرب عنصر في الاتجاه المطلوب (للترفيه/المباريات) */
function spatialNav(dir){
  const items = getContentFocusables();
  if(!items.length) return false;
  let cur = (contentFocusEl && items.includes(contentFocusEl)) ? contentFocusEl : items[0];
  if(cur !== contentFocusEl){ setContentFocus(cur); return true; }
  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width/2, cy = cr.top + cr.height/2;
  let best = null, bestScore = Infinity;
  for(const el of items){
    if(el === cur) continue;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + r.height/2;
    const dx = x - cx, dy = y - cy;
    let primary, cross;
    if(dir === "left"){  if(dx >= -4) continue; primary = -dx; cross = Math.abs(dy); }
    else if(dir === "right"){ if(dx <= 4) continue; primary = dx; cross = Math.abs(dy); }
    else if(dir === "up"){   if(dy >= -4) continue; primary = -dy; cross = Math.abs(dx); }
    else {                   if(dy <= 4) continue; primary = dy; cross = Math.abs(dx); }
    const score = primary + cross * 2;
    if(score < bestScore){ bestScore = score; best = el; }
  }
  if(best){ setContentFocus(best); return true; }
  return false;
}

/* الموجّه الرئيسي — يستقبل اتجاهاً بصرياً وينفّذه حسب المنطقة والشاشة */
function navigate(dir){
  if(navZone === "header"){
    if(dir === "left") focusHeader(headerIdx - 1);
    else if(dir === "right") focusHeader(headerIdx + 1);
    else if(dir === "down") exitHeaderToContent();
    return;
  }
  // منطقة المحتوى
  if(currentView === "home" || currentView === "apps"){
    if(dir === "up"){ if(pos.row === 0) enterHeader(); else move(0,-1); }
    else if(dir === "down") move(0,+1);
    else if(dir === "right") move(-1,0);   // يمين بصري = عمود أقل في RTL
    else if(dir === "left")  move(+1,0);
  } else {
    const moved = spatialNav(dir);
    if(!moved && dir === "up") enterHeader();
  }
}

function activate(){
  if(navZone === "header"){
    const items = getHeaderItems();
    if(items[headerIdx]) items[headerIdx].click();
    return;
  }
  if(currentView === "home" || currentView === "apps"){
    const a = currentApp();
    if(a) launch(a);
    return;
  }
  if(contentFocusEl) contentFocusEl.click();
}

function resetNavToContent(){
  navZone = "content";
  clearNavFocus();
  contentFocusEl = null;
}

/* ============ تنقّل داخل النوافذ (Settings / Power) بالكنترول والكيبورد ============ */
let dialogFocusEl = null;

function getActiveDialog(){
  const s = document.getElementById("settings-dialog");
  if(s && s.style.display === "flex") return s;
  const p = document.getElementById("power-dialog");
  if(p && p.style.display === "flex") return p;
  return null;
}

function getDialogFocusables(d){
  return Array.from(d.querySelectorAll("button, input:not([type=hidden]), select, textarea"))
    .filter(el => el.offsetParent !== null && !el.disabled);
}

function setDialogFocus(el){
  clearNavFocus();
  dialogFocusEl = el || null;
  if(el){
    el.classList.add("nav-focus");
    if(el.focus) el.focus({ preventScroll:true });
    el.scrollIntoView({ block:"nearest", behavior:"smooth" });
  }
}

/* اختيار أقرب عنصر هندسياً في اتجاه بصري */
function pickNearest(cur, items, dir){
  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width/2, cy = cr.top + cr.height/2;
  let best = null, bestScore = Infinity;
  for(const el of items){
    if(el === cur) continue;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + r.height/2;
    const dx = x - cx, dy = y - cy;
    let primary, cross;
    if(dir === "left"){  if(dx >= -4) continue; primary = -dx; cross = Math.abs(dy); }
    else if(dir === "right"){ if(dx <= 4) continue; primary = dx; cross = Math.abs(dy); }
    else if(dir === "up"){   if(dy >= -4) continue; primary = -dy; cross = Math.abs(dx); }
    else {                   if(dy <= 4) continue; primary = dy; cross = Math.abs(dx); }
    const score = primary + cross * 2;
    if(score < bestScore){ bestScore = score; best = el; }
  }
  return best;
}

function dialogNav(dir, d){
  const items = getDialogFocusables(d);
  if(!items.length) return;
  const cur = (dialogFocusEl && items.includes(dialogFocusEl)) ? dialogFocusEl : null;
  if(!cur){ setDialogFocus(items[0]); return; }
  const best = pickNearest(cur, items, dir);
  if(best) setDialogFocus(best);
}

function activateDialogFocus(){
  const el = dialogFocusEl;
  if(!el) return;
  const isText = el.tagName === "INPUT" && ["text","password","number","search","email"].includes(el.type);
  if(isText){ el.focus(); return; }        // حقول النص: فقط ركّز (الكتابة تحتاج كيبورد)
  el.click();                               // أزرار + checkbox: تفعيل/تبديل
}

function closeActiveDialog(d){
  if(d.id === "settings-dialog"){
    const b = document.getElementById("btn-close-settings");
    if(b) b.click();
  } else {
    d.style.display = "none";
  }
  clearNavFocus();
  dialogFocusEl = null;
}

function initDialogFocus(d){
  const items = getDialogFocusables(d);
  if(items.length) setDialogFocus(items[0]);
}

document.addEventListener("keydown", e=>{

  /* ====== نوافذ الإعدادات/الطاقة: تنقّل بالأسهم + تفعيل + إغلاق ====== */
  const activeDlg = getActiveDialog();
  if(activeDlg){
    const ae = document.activeElement;
    const typing = ae && ae.tagName === "INPUT" && ["text","password","number","search","email"].includes(ae.type);
    if(e.key === "Escape"){ closeActiveDialog(activeDlg); e.preventDefault(); return; }
    if(!typing){
      switch(e.key){
        case "ArrowRight": dialogNav("right", activeDlg); e.preventDefault(); return;
        case "ArrowLeft":  dialogNav("left",  activeDlg); e.preventDefault(); return;
        case "ArrowUp":    dialogNav("up",    activeDlg); e.preventDefault(); return;
        case "ArrowDown":  dialogNav("down",  activeDlg); e.preventDefault(); return;
        case "Enter": case " ": activateDialogFocus(); e.preventDefault(); return;
      }
    }
    return;
  }

  if(dlg.classList.contains("open") || document.getElementById("leagues-dialog").style.display === "flex" || document.getElementById("search-dialog").style.display === "flex"){
    if(e.key === "Escape"){
       if(dlg.classList.contains("open")) closeDialog(); 
       else if(document.getElementById("leagues-dialog").style.display === "flex") document.getElementById("leagues-dialog").style.display = "none";
       else if(document.getElementById("search-dialog").style.display === "flex") document.getElementById("search-dialog").style.display = "none";
       e.preventDefault(); 
    }
    return;
  }

  /* ====== وضع الترتيب النشط ====== */
  if(moveMode){
    switch(e.key){
      case "ArrowRight": moveAppInRow("left");  e.preventDefault(); break;
      case "ArrowLeft":  moveAppInRow("right"); e.preventDefault(); break;
      case "ArrowUp":    move(0,-1); e.preventDefault(); break;
      case "ArrowDown":  move(0,+1); e.preventDefault(); break;
      case "Enter": case "GoBack": exitMoveMode(true);  e.preventDefault(); break;
      case "Escape":               exitMoveMode(false); e.preventDefault(); break;
      case "m": case "M":          exitMoveMode(true);  e.preventDefault(); break;
    }
    return;
  }

  /* ====== الوضع العادي ====== */
  const inHomeApps = navZone === "content" && (currentView === "home" || currentView === "apps");

  if(e.key === "Enter"){
    // في الهيدر أو صفحات الترفيه/المباريات: تفعيل فوري (ضغط على العنصر)
    if(navZone === "header" || !inHomeApps){
      activate();
      e.preventDefault();
      return;
    }
    // في الرئيسية/التطبيقات: ضغط طويل → وضع الترتيب
    if(!isEnterHeld){
      isEnterHeld = true;
      enterPressTimer = setTimeout(() => {
        enterPressTimer = null;
        const app = currentApp();
        if(app && !dlg.classList.contains("open")){
          enterMoveMode();
        }
      }, 700);
    }
    e.preventDefault();
    return;
  }

  switch(e.key){
    case "ArrowRight":
      if(e.ctrlKey && inHomeApps){ moveAppInRow("left");  e.preventDefault(); break; }
      navigate("right"); e.preventDefault(); break;
    case "ArrowLeft":
      if(e.ctrlKey && inHomeApps){ moveAppInRow("right"); e.preventDefault(); break; }
      navigate("left"); e.preventDefault(); break;
    case "ArrowUp":    navigate("up"); e.preventDefault(); break;
    case "ArrowDown":  navigate("down"); e.preventDefault(); break;
    case "Escape":     if(navZone === "header"){ exitHeaderToContent(); e.preventDefault(); } break;
    case "Delete":     if(inHomeApps){ requestDelete(); e.preventDefault(); } break;
    case "m": case "M":
      { if(inHomeApps){ const app = currentApp(); if(app){ enterMoveMode(); e.preventDefault(); } } }
      break;
    case "e": case "E":
      { if(inHomeApps){ const app = currentApp(); if(app){ openDialog("edit", app); e.preventDefault(); } } }
      break;
    case "q": case "Q":
      if(e.ctrlKey && window.pywebview){ window.pywebview.api.quit(); e.preventDefault(); }
      break;
  }
});

/* ============ تحريك التطبيق يمين/يسار ============ */
async function moveAppInRow(direction) {
  const app = currentApp();
  if(!app) return;
  if(window.pywebview && window.pywebview.api) {
    const r = await window.pywebview.api.move_app(app.id, direction);
    if(r.ok) {
      ROWS = r.rows;
      pos.col = r.newCol;
      build();
      toast(direction === "left" ? "⬅️ تم التحريك" : "➡️ تم التحريك");
    } else {
      toast(r.msg || "ما يقدر يتحرك");
    }
  } else {
    const apps = ROWS[pos.row].apps;
    const idx = pos.col;
    if(direction === "left" && idx > 0) {
      [apps[idx], apps[idx-1]] = [apps[idx-1], apps[idx]];
      pos.col = idx - 1;
    } else if(direction === "right" && idx < apps.length - 1) {
      [apps[idx], apps[idx+1]] = [apps[idx+1], apps[idx]];
      pos.col = idx + 1;
    } else {
      toast("ما يقدر يتحرك أكثر"); return;
    }
    build();
    toast(direction === "left" ? "⬅️ تم التحريك" : "➡️ تم التحريك");
  }
}

// Search Logic
const searchDialog = document.getElementById("search-dialog");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

function openSearch(){
  searchDialog.style.display = "flex";
  searchInput.value = "";
  searchResults.innerHTML = "";
  setTimeout(()=>searchInput.focus(), 50);
}

document.getElementById("btn-search").addEventListener("click", openSearch);

// Import Logic
const importDialog = document.getElementById("import-dialog");
const importTbody = document.getElementById("import-tbody");
const importSelectAll = document.getElementById("import-select-all");
const importRowSelect = document.getElementById("import-row-select");
let importResults = [];

function openImport() {
  importDialog.style.display = "flex";
  importTbody.innerHTML = "";
  importResults = [];
  importSelectAll.checked = false;
  document.getElementById("import-empty").style.display = "block";
  document.getElementById("import-loading").style.display = "none";
  
  // Populate row select
  importRowSelect.innerHTML = "";
  ROWS.forEach((r, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = r.label;
      importRowSelect.appendChild(opt);
  });
}

document.getElementById("btn-import").addEventListener("click", openImport);
document.getElementById("btn-import-cancel").addEventListener("click", () => importDialog.style.display = "none");

function renderImportTable() {
    importTbody.innerHTML = "";
    if (importResults.length === 0) {
        document.getElementById("import-empty").style.display = "block";
        return;
    }
    document.getElementById("import-empty").style.display = "none";
    
    importResults.forEach((res, i) => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--line)";
        tr.innerHTML = `
            <td style="padding:.5em;"><input type="checkbox" class="import-chk" data-idx="${i}" style="transform:scale(1.2); cursor:pointer;"></td>
            <td style="padding:.5em; color:var(--ink);">${res.name}</td>
            <td style="padding:.5em; color:var(--ink-dim); direction:ltr; text-align:left; font-size:.9rem;">${res.path}</td>
        `;
        importTbody.appendChild(tr);
    });
}

document.getElementById("btn-import-detect").addEventListener("click", async () => {
    if (!window.pywebview || !window.pywebview.api) return;
    document.getElementById("import-empty").style.display = "none";
    document.getElementById("import-loading").style.display = "block";
    importTbody.innerHTML = "";
    
    const r = await window.pywebview.api.detect_installed_apps();
    document.getElementById("import-loading").style.display = "none";
    if (r.ok) {
        importResults = r.results;
        renderImportTable();
    } else {
        toast("فشل البحث");
    }
});

document.getElementById("btn-import-scan").addEventListener("click", async () => {
    if (!window.pywebview || !window.pywebview.api) return;
    
    const folderRes = await window.pywebview.api.browse_folder();
    if (!folderRes.ok || !folderRes.path) return;
    
    document.getElementById("import-empty").style.display = "none";
    document.getElementById("import-loading").style.display = "block";
    importTbody.innerHTML = "";
    
    const r = await window.pywebview.api.scan_folder_for_apps(folderRes.path);
    document.getElementById("import-loading").style.display = "none";
    if (r.ok) {
        importResults = r.results;
        renderImportTable();
    } else {
        toast("فشل فحص المجلد");
    }
});

importSelectAll.addEventListener("change", (e) => {
    const chks = document.querySelectorAll(".import-chk");
    chks.forEach(c => c.checked = e.target.checked);
});

document.getElementById("btn-import-add").addEventListener("click", async () => {
    if (!window.pywebview || !window.pywebview.api) return;
    const chks = document.querySelectorAll(".import-chk:checked");
    if (chks.length === 0) {
        toast("الرجاء تحديد تطبيق واحد على الأقل");
        return;
    }
    
    const selectedPaths = Array.from(chks).map(c => importResults[c.dataset.idx].path);
    const rowIdx = parseInt(importRowSelect.value, 10);
    
    toast("جارٍ الإضافة واستخراج الأيقونات...");
    const r = await window.pywebview.api.add_apps_bulk(rowIdx, selectedPaths);
    if (r.ok) {
        ROWS = r.rows;
        build();
        toast(`تمت إضافة ${r.count} تطبيقات بنجاح`);
        importDialog.style.display = "none";
    } else {
        toast("حدث خطأ أثناء الإضافة");
    }
});

/* ======== أزرار الطاقة والخروج ======== */
document.getElementById("btn-sleep").addEventListener("click", async () => {
  if(window.pywebview && window.pywebview.api){
    toast("🌙 جارٍ وضع السكون…");
    await window.pywebview.api.power("sleep");
  } else { toast("وضع السكون (متاح داخل التطبيق فقط)"); }
});

document.getElementById("btn-restart").addEventListener("click", async () => {
  if(!confirm("إعادة تشغيل الجهاز؟")) return;
  if(window.pywebview && window.pywebview.api){
    toast("🔄 جارٍ إعادة التشغيل…");
    await window.pywebview.api.power("restart");
  } else { toast("إعادة التشغيل (متاح داخل التطبيق فقط)"); }
});

document.getElementById("btn-shutdown").addEventListener("click", async () => {
  if(!confirm("إيقاف تشغيل الجهاز؟")) return;
  if(window.pywebview && window.pywebview.api){
    toast("⏻ جارٍ الإيقاف…");
    await window.pywebview.api.power("shutdown");
  } else { toast("الإيقاف (متاح داخل التطبيق فقط)"); }
});

document.getElementById("btn-exit").addEventListener("click", () => {
  if(window.pywebview && window.pywebview.api){
    toast("👋 إلى سطح المكتب…");
    setTimeout(() => window.pywebview.api.quit(), 600);
  } else { toast("الخروج (متاح داخل التطبيق فقط)"); }
});

document.getElementById("btn-restart-app").addEventListener("click", () => {
  if(window.pywebview && window.pywebview.api){
    toast("🔄 جارٍ إعادة تشغيل التطبيق…");
    setTimeout(() => window.pywebview.api.power("restart_app"), 500);
  } else { toast("إعادة تشغيل التطبيق (متاح داخل التطبيق فقط)"); }
});

document.getElementById("btn-settings").addEventListener("click", openSettings);

document.addEventListener("keydown", e => {
  if(searchDialog.style.display === "flex" && e.key === "Escape") {
    searchDialog.style.display = "none";
    e.preventDefault();
  }
});
let searchDebounce;
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  clearTimeout(searchDebounce);
  
  if(!q) {
      searchResults.innerHTML = "";
      return;
  }
  
  searchDebounce = setTimeout(async () => {
      searchResults.innerHTML = "";
      
      // 1. Fahad TV Apps
      const localRes = document.createElement("div");
      localRes.innerHTML = `<h3 style="width:100%; color:var(--ink-dim); margin-bottom:.5em;">تطبيقات FAHAD TV</h3>`;
      localRes.style.display = "flex"; localRes.style.gap = "1.5vw"; localRes.style.flexWrap = "wrap"; localRes.style.width = "100%";
      let foundLocal = false;
      ROWS.forEach(row => {
        row.apps.forEach(app => {
          if(app.name.toLowerCase().includes(q) || (app.sub && app.sub.toLowerCase().includes(q))) {
            foundLocal = true;
            const b = document.createElement("button");
            b.className = "tile";
            b.style.background = `linear-gradient(145deg, ${app.c1||"#31566e"}, ${app.c2||"#1b3242"})`;
            const sBg = app.backgroundPath || app.img;
            if(sBg) resolveImage(sBg).then(data => { if(data) b.style.background = `linear-gradient(rgba(10,12,16,.1), rgba(10,12,16,.6)), url("${data}") center/cover no-repeat`; });
            b.innerHTML = `<span class="name">${app.name}</span>`;
            b.onclick = () => { launch(app); searchDialog.style.display = "none"; };
            localRes.appendChild(b);
          }
        });
      });
      if(foundLocal) searchResults.appendChild(localRes);
      
      // 2. Windows Apps
      if(window.pywebview && window.pywebview.api) {
          const winRes = document.createElement("div");
          winRes.innerHTML = `<h3 style="width:100%; color:var(--ink-dim); margin-bottom:.5em; margin-top:1em;">تطبيقات الويندوز</h3>`;
          winRes.style.display = "flex"; winRes.style.gap = "1.5vw"; winRes.style.flexWrap = "wrap"; winRes.style.width = "100%";
          const r = await window.pywebview.api.search_windows_apps(q);
          if(r.ok && r.results.length > 0) {
              r.results.forEach(wapp => {
                  const b = document.createElement("button");
                  b.className = "tile";
                  b.style.background = `linear-gradient(145deg, #1d5c8f, #12395c)`;
                  b.innerHTML = `<span class="name">${wapp.name}</span><div style="margin-top:.5em; font-size:.8rem; background:var(--focus); color:#000; border-radius:4px; padding:.2em .4em; width:fit-content; cursor:pointer;">إضافة لـ FAHAD TV</div>`;
                  b.onclick = async () => {
                      toast("جارٍ الإضافة...");
                      // ضيفه في الصف الأول كمثال سريع
                      const addRes = await window.pywebview.api.add_apps_bulk(0, [wapp.path]);
                      if(addRes.ok) { ROWS = addRes.rows; build(); toast(`تمت إضافة ${wapp.name}`); searchDialog.style.display = "none"; }
                  };
                  winRes.appendChild(b);
              });
              searchResults.appendChild(winRes);
          }
      }
  }, 400);
});

/* ============ يد التحكم (Gamepad API) ============ */
let padCooldown = 0;
function anyDialogOpen(){
  return dlg.classList.contains("open")
    || document.getElementById("settings-dialog").style.display === "flex"
    || document.getElementById("power-dialog").style.display === "flex"
    || document.getElementById("leagues-dialog").style.display === "flex"
    || document.getElementById("search-dialog").style.display === "flex";
}
function pollGamepad(ts){
  const gp = navigator.getGamepads && navigator.getGamepads()[0];
  if(!gp || ts - padCooldown <= 180){ requestAnimationFrame(pollGamepad); return; }

  const ax = gp.axes[0]||0, ay = gp.axes[1]||0;
  const left  = gp.buttons[14]?.pressed || ax < -0.6;
  const right = gp.buttons[15]?.pressed || ax > 0.6;
  const up    = gp.buttons[12]?.pressed || ay < -0.6;
  const down  = gp.buttons[13]?.pressed || ay > 0.6;

  /* ====== نافذة إعدادات/طاقة مفتوحة: تنقّل داخلها ====== */
  const padDlg = getActiveDialog();
  if(padDlg){
    let acted = true;
    if(left)       dialogNav("left",  padDlg);
    else if(right) dialogNav("right", padDlg);
    else if(up)    dialogNav("up",    padDlg);
    else if(down)  dialogNav("down",  padDlg);
    else if(gp.buttons[0]?.pressed) activateDialogFocus();      /* A / Cross → تفعيل */
    else if(gp.buttons[1]?.pressed) closeActiveDialog(padDlg);  /* B / Circle → إغلاق */
    else acted = false;
    if(acted) padCooldown = ts;
    requestAnimationFrame(pollGamepad);
    return;
  }

  /* النوافذ الأخرى (تعديل/بطولات/بحث) تبقى معطّلة للكنترول حالياً */
  if(anyDialogOpen()){ requestAnimationFrame(pollGamepad); return; }

  if(gp && ts - padCooldown > 180){
    let acted = true;

    if(moveMode){
      /* وضع الترتيب — العصا تحرك الكرت */
      if(left)       moveAppInRow("right");   /* يسار بصري = عمود أعلى في RTL */
      else if(right) moveAppInRow("left");    /* يمين بصري = عمود أقل في RTL */
      else if(up)    move(0,-1);
      else if(down)  move(0,+1);
      else if(gp.buttons[0]?.pressed)  exitMoveMode(true);   /* A / Cross → تأكيد */
      else if(gp.buttons[1]?.pressed)  exitMoveMode(false);  /* B / Circle → إلغاء */
      else acted = false;
    } else {
      /* الوضع العادي — عبر الموجّه الموحّد (اتجاهات بصرية صحيحة لـ RTL) */
      if(left)       navigate("left");
      else if(right) navigate("right");
      else if(up)    navigate("up");
      else if(down)  navigate("down");
      else if(gp.buttons[0]?.pressed) activate();            /* A / Cross → تفعيل */
      else if(gp.buttons[1]?.pressed){ if(navZone==="header") exitHeaderToContent(); } /* B / Circle → رجوع */
      else if(gp.buttons[3]?.pressed){ if(navZone==="content" && (currentView==="home"||currentView==="apps")){ const app=currentApp(); if(app) enterMoveMode(); } } /* Y / Triangle → ترتيب */
      else acted = false;
    }
    if(acted) padCooldown = ts;
  }
  requestAnimationFrame(pollGamepad);
}
requestAnimationFrame(pollGamepad);

async function openSettings() {
  if (window.pywebview && window.pywebview.api) {
    const r = await window.pywebview.api.get_settings();
    document.getElementById("set-startup").checked = r.start_with_windows;
    document.getElementById("set-fullscreen").checked = r.fullscreen !== false;

    if(typeof initEntSettings === 'function') initEntSettings(r);

    document.getElementById("set-wifi-status").textContent = "جاري التحقق...";
    document.getElementById("set-bt-status").textContent = "جاري التحقق...";
    window.pywebview.api.get_windows_status().then(status => {
        if(status.ok) {
            document.getElementById("set-wifi-status").textContent = status.wifi;
            document.getElementById("set-bt-status").textContent = status.bluetooth;
        }
    });
    
    document.getElementById("set-storage-icons").textContent = "جاري التحقق...";
    document.getElementById("set-storage-wallpapers").textContent = "جاري التحقق...";
    window.pywebview.api.get_storage_stats().then(st => {
        if(st.ok) {
            document.getElementById("set-storage-icons").textContent = st.icons_mb + " MB";
            document.getElementById("set-storage-wallpapers").textContent = st.wallpapers_mb + " MB";
        }
    });
    
    document.getElementById("btn-browse-wallpaper").onclick = async () => {
        const res = await window.pywebview.api.browse_file("icon");
        if(res.ok) {
            r.wallpaper = res.path;
            await window.pywebview.api.update_settings({ wallpaper: res.path });
            toast("تم تعيين الخلفية");
            applyGlobalWallpaper(res.path);
        }
    };
    document.getElementById("btn-clear-wallpaper").onclick = async () => {
        r.wallpaper = "";
        await window.pywebview.api.update_settings({ wallpaper: "" });
        toast("تم إزالة الخلفية");
        applyGlobalWallpaper("");
    };
  }
  const sd = document.getElementById("settings-dialog");
  sd.style.display = "flex";
  initDialogFocus(sd);   // تركيز أولي على أول عنصر (للكنترول)
}

document.querySelectorAll(".set-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".set-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".set-pane").forEach(p => p.style.display = "none");
        tab.classList.add("active");
        document.getElementById(tab.dataset.target).style.display = "block";
    });
});

document.getElementById("btn-close-settings").addEventListener("click", () => {
  document.getElementById("settings-dialog").style.display = "none";
});

document.getElementById("btn-save-settings").addEventListener("click", async () => {
  const start = document.getElementById("set-startup").checked;
  const fs = document.getElementById("set-fullscreen").checked;

  if (window.pywebview && window.pywebview.api) {
    await window.pywebview.api.update_settings({ 
      start_with_windows: start, 
      fullscreen: fs,
      entertainment: typeof saveEntSettings === 'function' ? saveEntSettings() : {}
    });
    
    toast("تم حفظ إعدادات FAHAD TV");
  }
  document.getElementById("settings-dialog").style.display = "none";
});

document.getElementById("btn-factory-reset").addEventListener("click", async () => {
    const pwd = document.getElementById("set-factory-pwd").value;
    if(pwd !== "1712") {
        toast("الرقم السري غير صحيح");
        return;
    }
    if(!confirm("هل أنت متأكد من استعادة إعدادات المصنع؟ سيتم مسح كل شيء!")) return;
    
    if (window.pywebview && window.pywebview.api) {
        toast("جارٍ استعادة ضبط المصنع...");
        const r = await window.pywebview.api.factory_reset();
        if(r.ok) {
            toast("تمت الاستعادة بنجاح. سيتم إعادة تشغيل التطبيق.");
            setTimeout(() => window.pywebview.api.power("restart_app"), 1500);
        } else {
            toast("حدث خطأ أثناء الاستعادة");
        }
    }
});

// Replace initial settings tile with FAHAD TV Settings
const initInterval = setInterval(() => {
  if (ROWS.length > 0) {
    const r0 = ROWS[0];
    if(r0 && r0.apps) {
      let setApp = r0.apps.find(a => a.id === "settings");
      if(setApp) {
        setApp.id = "settings_fahadtv";
        setApp.name = "إعدادات FAHAD TV";
        setApp.sub = "Settings";
        setApp.glyph = "⚙️";
        setApp.target = "";
        
        // Add Power Menu tile
        if(!r0.apps.find(a => a.id === "power_fahadtv")) {
          r0.apps.push({
            id: "power_fahadtv", name: "الطاقة", sub: "Power", glyph: "⏻", c1: "#8f1f24", c2: "#4a0f12", target: ""
          });
        }
        build();
      }
    }
    clearInterval(initInterval);
  }
}, 500);

/* ============ الساعة ============ */
function tick(){
  const now = new Date();
  let h = now.getHours(), m = String(now.getMinutes()).padStart(2,"0");
  const period = h >= 12 ? "مساءً" : "صباحًا";
  h = h % 12 || 12;
  document.getElementById("clock-time").textContent = `${h}:${m}`;
  document.getElementById("clock-period").textContent = period;
  document.getElementById("clock-date").textContent =
    now.toLocaleDateString("ar-SA-u-nu-latn", {weekday:"long", day:"numeric", month:"long", year:"numeric"});
}
tick(); setInterval(tick, 1000);

let mouseTimer;
document.addEventListener("mousemove", ()=>{
  document.body.classList.add("mouse-on");
  clearTimeout(mouseTimer);
  mouseTimer = setTimeout(()=>document.body.classList.remove("mouse-on"), 2500);
});

async function applyGlobalWallpaper(path) {
  if(!path) {
      document.body.style.backgroundImage = `
      radial-gradient(1200px 700px at 50% -10%, #22252c 0%, transparent 60%),
      repeating-linear-gradient(45deg, transparent 0 34px, rgba(255,255,255,.015) 34px 35px),
      repeating-linear-gradient(-45deg, transparent 0 34px, rgba(255,255,255,.015) 34px 35px)`;
      return;
  }
  const resolved = await resolveImage(path);
  if(resolved) {
      document.body.style.backgroundImage = `linear-gradient(rgba(10,12,16,.6), rgba(10,12,16,.9)), url("${resolved}")`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
  }
}

/* ============ الإقلاع ============ */
let started = false;
async function init(){
  if(!window.pywebview || !window.pywebview.api) {
      // Not ready yet, wait for pywebviewready event
      return;
  }
  if(started) return; started = true;
  
  try{ 
      ROWS = await window.pywebview.api.get_rows(); 
      const s = await window.pywebview.api.get_settings();
      if(s && s.wallpaper) applyGlobalWallpaper(s.wallpaper);
  }catch(e){
      console.error(e);
  }

  build();
  updateNetworkStatus();
  setInterval(updateNetworkStatus, 15000);   // تحديث حالة الشبكة كل 15 ثانية
}
window.addEventListener("pywebviewready", init);
setTimeout(() => { if(!started) init(); }, 1000);

/* ============ مؤشر حالة الشبكة (واي فاي + إيثرنت) ============ */
async function updateNetworkStatus(){
  if(!window.pywebview || !window.pywebview.api) return;
  let r;
  try { r = await window.pywebview.api.get_network_status(); } catch(e){ return; }
  if(!r || !r.ok) return;

  const wifi = document.getElementById("net-wifi");
  const wifiText = document.getElementById("net-wifi-text");
  const eth = document.getElementById("net-eth");
  if(!wifi || !wifiText || !eth) return;

  if(r.wifi && r.wifi.connected){
    wifiText.textContent = r.wifi.ssid || "متصل";
    wifi.title = "متصل بشبكة: " + (r.wifi.ssid || "");
    wifi.classList.add("on"); wifi.classList.remove("off");
  } else {
    wifiText.textContent = "غير متصل";
    wifi.title = "الواي فاي غير متصل";
    wifi.classList.add("off"); wifi.classList.remove("on");
  }

  // الإيثرنت يظهر فقط عند الاتصال
  eth.style.display = (r.ethernet && r.ethernet.connected) ? "inline-flex" : "none";
}
