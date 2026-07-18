// entertainment.js

let entGenres = [
  {id: "28", name: "أكشن (Action)"},
  {id: "12", name: "مغامرة (Adventure)"},
  {id: "16", name: "أنيميشن (Animation)"},
  {id: "35", name: "كوميديا (Comedy)"},
  {id: "80", name: "جريمة (Crime)"},
  {id: "99", name: "وثائقي (Documentary)"},
  {id: "18", name: "دراما (Drama)"},
  {id: "10751", name: "عائلي (Family)"},
  {id: "14", name: "خيال (Fantasy)"},
  {id: "36", name: "تاريخ (History)"},
  {id: "27", name: "رعب (Horror)"},
  {id: "10402", name: "موسيقى (Music)"},
  {id: "9648", name: "غموض (Mystery)"},
  {id: "10749", name: "رومانسية (Romance)"},
  {id: "878", name: "خيال علمي (Sci-Fi)"},
  {id: "10770", name: "فيلم تلفزيوني (TV Movie)"},
  {id: "53", name: "إثارة (Thriller)"},
  {id: "10752", name: "حرب (War)"},
  {id: "37", name: "غرب أمريكي (Western)"}
];

let entSettings = {
  enabled: true,
  tmdb_api_key: "",
  use_default_api: true,
  language: "ar-SA",
  region: "SA",
  genres: []
};

// Favorites using localStorage
function getFavorites() {
  let favs = localStorage.getItem("ent_favorites");
  if(favs) return JSON.parse(favs);
  return [];
}

function saveFavorites(favs) {
  localStorage.setItem("ent_favorites", JSON.stringify(favs));
}

function toggleFavorite(item) {
  let favs = getFavorites();
  let index = favs.findIndex(f => f.id === item.id && f.type === item.type);
  if(index > -1) {
    favs.splice(index, 1);
  } else {
    favs.push(item);
  }
  saveFavorites(favs);
  return index === -1; // true if added
}

function isFavorite(id, type) {
  let favs = getFavorites();
  return favs.findIndex(f => f.id === id && f.type === type) > -1;
}

// Build cards
function buildEntCard(item) {
  let dateText = item.releaseDate ? item.releaseDate.substring(0,4) : "";
  let ratingText = item.rating > 0 ? "★ " + parseFloat(item.rating).toFixed(1) : "";
  let typeText = item.type === "tv" ? "📺 مسلسل" : (item.type === "movie" ? "🎬 فيلم" : "👤 ممثل");
  
  let html = `
    <div class="ent-card" onclick="openEntDetails('${item.type}', '${item.id}')">
      <img class="ent-poster" loading="lazy" decoding="async" src="${item.poster || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="">
      <div class="ent-info">
        <div class="ent-title">${item.title}</div>
        <div class="ent-meta">
          <span>${dateText} ${typeText}</span>
          <span class="ent-rating">${ratingText}</span>
        </div>
      </div>
    </div>
  `;
  return html;
}

function buildEntSection(title, items) {
  if(!items || items.length === 0) return "";
  let html = `<div class="ent-section"><div class="ent-section-title">${title}</div><div class="ent-grid">`;
  items.forEach(i => html += buildEntCard(i));
  html += `</div></div>`;
  return html;
}

// Views
async function loadDiscover() {
  const container = document.getElementById("ent-content-discover");
  container.innerHTML = `<div style="text-align:center; padding:3em;">جاري التحميل...</div>`;
  
  try {
    const res = await window.pywebview.api.ent_get_discover();
    if(res.status === "error" && res.message === "no_api_key") {
      document.getElementById("ent-setup-screen").style.display = "flex";
      document.getElementById("ent-content-discover").style.display = "none";
      return;
    }
    
    if(res.status !== "success" && res.status !== "error_fallback") {
      container.innerHTML = `<div style="text-align:center; padding:3em;">خطأ في التحميل: ${res.error || ""}</div>`;
      return;
    }
    
    document.getElementById("ent-setup-screen").style.display = "none";
    document.getElementById("ent-content-discover").style.display = "block";
    
    let html = "";
    html += buildEntSection("تريند اليوم 🔥", res.data.trending_today);
    html += buildEntSection("تريند الأسبوع 🚀", res.data.trending_week);
    html += buildEntSection("أفلام مقترحة لك 🍿", res.data.movies);
    html += buildEntSection("مسلسلات مقترحة 📺", res.data.tv);
    
    container.innerHTML = html;
  } catch(e) {
    console.error(e);
  }
}

async function loadCalendar() {
  const container = document.getElementById("ent-content-calendar");
  container.innerHTML = `<div style="text-align:center; padding:3em;">جاري التحميل...</div>`;
  try {
    const res = await window.pywebview.api.ent_get_calendar();
    if(res.status !== "success" && res.status !== "error_fallback") return;
    
    let html = "";
    html += buildEntSection("أفلام قادمة (خلال 30 يوم) 🗓️", res.data.movies);
    html += buildEntSection("مسلسلات تعرض قريباً 🗓️", res.data.tv);
    container.innerHTML = html;
  } catch(e) {}
}

async function handleSearch(query) {
  const container = document.getElementById("ent-search-results");
  if(!query || query.length < 2) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `<div>جاري البحث...</div>`;
  try {
    const res = await window.pywebview.api.ent_search(query);
    if(res.status !== "success") return;
    
    if(res.data.length === 0) {
      container.innerHTML = `<div>لا توجد نتائج</div>`;
      return;
    }
    
    let html = "";
    res.data.forEach(i => html += buildEntCard(i));
    container.innerHTML = html;
  } catch(e) {}
}

function loadFavorites() {
  const favs = getFavorites();
  const container = document.getElementById("ent-favorites-grid");
  if(favs.length === 0) {
    container.innerHTML = `<div style="color:var(--ink-dim);">لا توجد أي مفضلات بعد.</div>`;
    return;
  }
  let html = "";
  favs.forEach(i => html += buildEntCard(i));
  container.innerHTML = html;
}

// Details Dialog
let currentDetailsItem = null;

async function openEntDetails(type, id) {
  if(type === 'person') return;
  
  const dialog = document.getElementById("ent-details-dialog");
  dialog.style.display = "flex";
  
  document.getElementById("ent-modal-title").innerText = "جاري التحميل...";
  document.getElementById("ent-modal-overview").innerText = "";
  document.getElementById("ent-modal-tags").innerHTML = "";
  document.getElementById("ent-modal-poster").src = "";
  document.getElementById("ent-modal-backdrop").style.backgroundImage = "none";
  document.getElementById("ent-providers-container").style.display = "none";
  document.getElementById("ent-btn-trailer").style.display = "none";
  document.getElementById("ent-modal-cast").innerHTML = "";
  document.getElementById("ent-recommendations-container").style.display = "none";
  
  try {
    const res = await window.pywebview.api.ent_get_details(type, id);
    if(res.status !== "success" && res.status !== "error_fallback") {
      document.getElementById("ent-modal-title").innerText = "حدث خطأ أثناء تحميل التفاصيل.";
      return;
    }
    
    const item = res.data;
    currentDetailsItem = item;
    
    document.getElementById("ent-modal-title").innerText = item.title;
    document.getElementById("ent-modal-overview").innerText = item.overview || "لا يوجد وصف متوفر.";
    document.getElementById("ent-modal-poster").src = item.poster;
    if(item.backdrop) {
      document.getElementById("ent-modal-backdrop").style.backgroundImage = `url('${item.backdrop}')`;
    }
    
    let tagsHtml = "";
    if(item.rating > 0) tagsHtml += `<span class="ent-tag">★ ${parseFloat(item.rating).toFixed(1)}</span>`;
    if(item.releaseDate) tagsHtml += `<span class="ent-tag">${item.releaseDate.substring(0,4)}</span>`;
    if(item.runtime) tagsHtml += `<span class="ent-tag">⏱️ ${item.runtime} دقيقة</span>`;
    if(item.seasons) tagsHtml += `<span class="ent-tag">📺 ${item.seasons} موسم</span>`;
    item.genres.forEach(g => tagsHtml += `<span class="ent-tag">${g}</span>`);
    document.getElementById("ent-modal-tags").innerHTML = tagsHtml;
    
    const btnTrailer = document.getElementById("ent-btn-trailer");
    if(item.trailer) {
      btnTrailer.style.display = "flex";
      btnTrailer.onclick = () => window.open(item.trailer, '_blank');
    }
    
    const btnFav = document.getElementById("ent-btn-favorite");
    const isFav = isFavorite(item.id, item.type);
    btnFav.innerHTML = isFav ? "❌ إزالة من المفضلة" : "❤️ أضف للمفضلة";
    btnFav.onclick = () => {
      const added = toggleFavorite(item);
      btnFav.innerHTML = added ? "❌ إزالة من المفضلة" : "❤️ أضف للمفضلة";
      if(!document.getElementById("ent-content-favorites").style.display.includes("none")) {
        loadFavorites(); 
      }
    };
    
    document.getElementById("ent-btn-tmdb").onclick = () => {
      window.open(`https://www.themoviedb.org/${item.type}/${item.id}`, '_blank');
    };
    
    let castHtml = "";
    item.cast.forEach(c => {
      castHtml += `
        <div class="ent-actor">
          <img class="ent-actor-img" loading="lazy" decoding="async" src="${c.image || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}">
          <div class="ent-actor-name">${c.name}</div>
          <div class="ent-actor-role">${c.character}</div>
        </div>
      `;
    });
    document.getElementById("ent-modal-cast").innerHTML = castHtml;
    
    if(item.recommendations && item.recommendations.length > 0) {
      document.getElementById("ent-recommendations-container").style.display = "block";
      let recsHtml = "";
      item.recommendations.forEach(r => recsHtml += buildEntCard(r));
      document.getElementById("ent-modal-recommendations").innerHTML = recsHtml;
    }
    
    const userRegion = entSettings.region || "SA";
    const provList = document.getElementById("ent-providers-list");
    provList.innerHTML = "";
    
    if(item.providers && item.providers[userRegion]) {
      const regionData = item.providers[userRegion];
      let flatrate = regionData.flatrate || [];
      if(flatrate.length > 0) {
        document.getElementById("ent-providers-container").style.display = "block";
        flatrate.forEach(p => {
          provList.innerHTML += `<img class="ent-provider-icon" loading="lazy" decoding="async" src="https://image.tmdb.org/t/p/w92${p.logo_path}" title="${p.provider_name}">`;
        });
      }
    }
    
  } catch(e) {
    document.getElementById("ent-modal-title").innerText = "خطأ في التحميل.";
  }
}

document.getElementById("btn-close-ent").addEventListener("click", () => {
  document.getElementById("ent-details-dialog").style.display = "none";
});

// Settings init
function initEntSettings(settings) {
  if(settings.entertainment) {
    entSettings = settings.entertainment;
    
    document.getElementById("set-ent-enabled").checked = entSettings.enabled !== false;
    if(entSettings.use_default_api !== false) {
      document.getElementById("set-ent-api-default").checked = true;
      document.getElementById("set-ent-tmdb-key").style.display = "none";
    } else {
      document.getElementById("set-ent-api-custom").checked = true;
      document.getElementById("set-ent-tmdb-key").style.display = "block";
      document.getElementById("set-ent-tmdb-key").value = entSettings.tmdb_api_key || "";
    }
    
    if(entSettings.region) document.getElementById("set-ent-region").value = entSettings.region;
    
    // Render Genres
    const genresContainer = document.getElementById("ent-genres-container");
    genresContainer.innerHTML = "";
    entGenres.forEach(g => {
      const isChecked = entSettings.genres && entSettings.genres.includes(g.id);
      genresContainer.innerHTML += `
        <label style="display:flex; align-items:center; gap:0.5em; background:var(--bg); padding:0.5em 1em; border-radius:16px; border:1px solid var(--line); cursor:pointer;">
          <input type="checkbox" class="ent-genre-cb" value="${g.id}" ${isChecked ? 'checked' : ''}>
          ${g.name}
        </label>
      `;
    });
  }
}

function saveEntSettings() {
  const enabled = document.getElementById("set-ent-enabled").checked;
  const use_default = document.getElementById("set-ent-api-default").checked;
  const tmdb_key = document.getElementById("set-ent-tmdb-key").value;
  const region = document.getElementById("set-ent-region").value;
  
  const checkedGenres = [];
  document.querySelectorAll(".ent-genre-cb").forEach(cb => {
    if(cb.checked) checkedGenres.push(cb.value);
  });
  
  return {
    enabled: enabled,
    use_default_api: use_default,
    tmdb_api_key: tmdb_key,
    region: region,
    language: "ar-SA",
    genres: checkedGenres
  };
}

document.getElementById("set-ent-api-default").addEventListener("change", (e) => {
  if(e.target.checked) document.getElementById("set-ent-tmdb-key").style.display = "none";
});
document.getElementById("set-ent-api-custom").addEventListener("change", (e) => {
  if(e.target.checked) document.getElementById("set-ent-tmdb-key").style.display = "block";
});

// Setup Main Tabs
function showEntPage(pageId) {
  document.querySelectorAll(".ent-page").forEach(p => p.style.display = "none");
  document.querySelectorAll(".ent-nav .nav-tab").forEach(p => p.classList.remove("active"));
  
  document.getElementById(`ent-content-${pageId}`).style.display = "block";
  document.getElementById(`ent-tab-${pageId}`).classList.add("active");
  
  if(pageId === 'discover') loadDiscover();
  if(pageId === 'calendar') loadCalendar();
  if(pageId === 'favorites') loadFavorites();
}

document.getElementById("ent-tab-discover").addEventListener("click", () => showEntPage('discover'));
document.getElementById("ent-tab-calendar").addEventListener("click", () => showEntPage('calendar'));
document.getElementById("ent-tab-search").addEventListener("click", () => showEntPage('search'));
document.getElementById("ent-tab-favorites").addEventListener("click", () => showEntPage('favorites'));

let searchTimeout = null;
document.getElementById("ent-search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    handleSearch(e.target.value);
  }, 500);
});

