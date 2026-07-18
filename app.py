# -*- coding: utf-8 -*-
"""
تطبيق واجهة الميني بي سي — نسخة v3
=====================================
- الصفوف بالترتيب: التطبيقات والترفيه ← الوصول السريع ← ألعابي
- إضافة وتعديل وحذف التطبيقات من داخل الواجهة (تنحفظ في apps.json)
- صور/خلفيات للبلاطات مع بحث عن الصور من الإنترنت (iTunes Search API)
- الصور المختارة تنحفظ محليًا في مجلد icons جنب التطبيق

التجهيز:   pip install pywebview pyinstaller
التجربة:   python app.py
البناء:    pyinstaller --onefile --windowed --add-data "ui.html;." --name "HTPCLauncher" app.py
الناتج:    dist/HTPCLauncher.exe   |   الخروج: Ctrl+Q
"""
import json
import os
import sys
import subprocess
import urllib.parse
import urllib.request
import uuid
import webbrowser
import winreg

import webview
from sports import sports_service, migrate_league_ids
from entertainment import entertainment_service

PALETTE = [
    ("#1d5c8f", "#12395c"), ("#a3282d", "#5e1518"), ("#a67c1e", "#5f470f"),
    ("#2e7d55", "#174330"), ("#6a3fa0", "#3a2159"), ("#1f7a72", "#0f423d"),
    ("#31566e", "#1b3242"), ("#8f1f24", "#4a0f12"), ("#565d6b", "#2e323b"),
]

ROW_ORDER = ["التطبيقات والترفيه", "الوصول السريع", "ألعابي"]

DEFAULT_ROWS = [
    {
        "label": "التطبيقات والترفيه",
        "apps": [
            {"id": "netflix", "name": "نتفلكس", "sub": "Netflix", "glyph": "🎬",
             "c1": "#8f1f24", "c2": "#4a0f12", "img": "",
             "target": "https://www.netflix.com"},
            {"id": "media", "name": "مشغل الوسائط", "sub": "Media Player", "glyph": "🎵",
             "c1": "#1f7a72", "c2": "#0f423d", "img": "",
             "target": "wmplayer.exe"},
            {"id": "settings", "name": "الإعدادات", "sub": "Settings", "glyph": "⚙️",
             "c1": "#565d6b", "c2": "#2e323b", "img": "",
             "target": ["cmd", "/c", "start", "ms-settings:"]},
        ],
    },
    {
        "label": "الوصول السريع",
        "apps": [
            {"id": "browser", "name": "المتصفح", "sub": "Google Chrome", "glyph": "🌐",
             "c1": "#1d5c8f", "c2": "#12395c", "img": "",
             "target": r"C:\Program Files\Google\Chrome\Application\chrome.exe"},
            {"id": "youtube", "name": "يوتيوب", "sub": "YouTube", "glyph": "▶️",
             "c1": "#a3282d", "c2": "#5e1518", "img": "",
             "target": "https://www.youtube.com"},
            {"id": "files", "name": "مستكشف الملفات", "sub": "File Explorer", "glyph": "📁",
             "c1": "#a67c1e", "c2": "#5f470f", "img": "",
             "target": "explorer.exe"},
        ],
    },
    {
        "label": "ألعابي",
        "apps": [
            {"id": "steam", "name": "مكتبة الألعاب", "sub": "Steam", "glyph": "🎮",
             "c1": "#31566e", "c2": "#1b3242", "img": "",
             "target": [r"C:\Program Files (x86)\Steam\steam.exe", "steam://open/bigpicture"]},
        ],
    },
]


def app_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def user_data_dir() -> str:
    app_data = os.getenv("LOCALAPPDATA")
    if not app_data:
        app_data = os.path.expanduser("~")
    d = os.path.join(app_data, "FAHAD_TV")
    os.makedirs(d, exist_ok=True)
    return d

def resource_path(name: str) -> str:
    return os.path.join(app_dir(), name)

USER_DIR = user_data_dir()
CONFIG = os.path.join(USER_DIR, "apps.json")
ICONS_DIR = os.path.join(USER_DIR, "icons")
CACHE_DIR = os.path.join(USER_DIR, "cache")
ICONS_CACHE_DIR = os.path.join(CACHE_DIR, "icons")
WALLPAPERS_CACHE_DIR = os.path.join(CACHE_DIR, "wallpapers")
SETTINGS_FILE = os.path.join(USER_DIR, "settings.json")

os.makedirs(ICONS_CACHE_DIR, exist_ok=True)
os.makedirs(WALLPAPERS_CACHE_DIR, exist_ok=True)

import shutil
def migrate_legacy_data():
    legacy_config = os.path.join(app_dir(), "apps.json")
    if os.path.exists(legacy_config) and not os.path.exists(CONFIG):
        try: shutil.copy2(legacy_config, CONFIG)
        except: pass

    legacy_settings = os.path.join(app_dir(), "settings.json")
    if os.path.exists(legacy_settings) and not os.path.exists(SETTINGS_FILE):
        try: shutil.copy2(legacy_settings, SETTINGS_FILE)
        except: pass

migrate_legacy_data()


def migrate_sports_settings():
    """تحويل معرفات الدوريات القديمة (API-Football الرقمية) إلى رموز ESPN الجديدة."""
    try:
        settings = load_settings()
        sports = settings.get("sports", {})
        old_favs = [str(x) for x in sports.get("favoriteLeagues", [])]
        new_favs = migrate_league_ids(old_favs)
        if new_favs != old_favs:
            sports["favoriteLeagues"] = new_favs
            settings["sports"] = sports
            save_settings(settings)
        # كاش الدوريات القديم من API-Football لم يعد مستخدماً
        legacy_leagues_cache = os.path.join(USER_DIR, "leagues.json")
        if os.path.exists(legacy_leagues_cache):
            os.remove(legacy_leagues_cache)
    except Exception as e:
        print("Sports migration failed:", e)


def sort_rows(rows):
    return rows


def load_rows():
    if not os.path.exists(CONFIG):
        save_rows(DEFAULT_ROWS)
        return json.loads(json.dumps(DEFAULT_ROWS))
    try:
        with open(CONFIG, encoding="utf-8") as f:
            rows = sort_rows(json.load(f))
        # normalize for compatibility
        for row in rows:
            for app in row.get("apps", []):
                normalize_app(app)
        return rows
    except Exception:
        return json.loads(json.dumps(DEFAULT_ROWS))

def load_settings():
    path = SETTINGS_FILE
    default_settings = {
        "start_with_windows": False,
        "fullscreen": True,
        "theme": "dark",
        "blur_strength": 10,
        "animations": True,
        "hero_backgrounds": True,
        "sports": {
            "enabled": True,
            "favoriteLeagues": [],
            "favoriteTeams": []
        },
        "entertainment": {
            "enabled": True,
            "tmdb_api_key": "",
            "use_default_api": True,
            "language": "ar-SA",
            "region": "SA",
            "genres": []
        }
    }
    if not os.path.exists(path):
        return default_settings
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            default_settings.update(data)
            return default_settings
    except:
        return default_settings

def save_settings(settings):
    path = SETTINGS_FILE
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving settings: {e}")

def toggle_startup(enable: bool):
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
        if enable:
            exe_path = sys.executable if getattr(sys, "frozen", False) else f'"{sys.executable}" "{os.path.abspath(__file__)}"'
            winreg.SetValueEx(key, "FAHAD_TV", 0, winreg.REG_SZ, exe_path)
        else:
            try:
                winreg.DeleteValue(key, "FAHAD_TV")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception as e:
        print("Startup toggle failed:", e)



def save_rows(rows):
    with open(CONFIG, "w", encoding="utf-8") as f:
        json.dump(sort_rows(rows), f, ensure_ascii=False, indent=2)


def count_apps(rows) -> int:
    return sum(len(r["apps"]) for r in rows)


def find_app(rows, app_id):
    for row in rows:
        for app in row["apps"]:
            if app.get("id") == app_id:
                return row, app
    return None, None


def split_args(args: str):
    """Very small helper to turn a string into argv safely-ish."""
    if not args:
        return []
    if isinstance(args, list):
        return args
    # naive split respecting quotes is better done via shlex
    import shlex
    try:
        return shlex.split(args)
    except Exception:
        return [args]


def resolve_shortcut(path):
    try:
        import win32com.client
        shell = win32com.client.Dispatch("WScript.Shell")
        shortcut = shell.CreateShortCut(path)
        return shortcut.TargetPath, shortcut.Arguments, shortcut.WorkingDirectory
    except ImportError:
        # Fallback if pywin32 is not installed
        return None, None, None
    except Exception:
        return None, None, None

def launch_target(target, args: str = ""):
    """Launch a target in a backward-compatible way."""
    argv_args = split_args(args)
    if isinstance(target, str) and target.startswith("http"):
        # Special-case Chrome App Mode when launching from a URL
        if any(a.startswith("--app=") for a in argv_args):
            subprocess.Popen(["chrome.exe"] + argv_args)
            return
        webbrowser.open(target)
        return

    # legacy: list => argv
    if isinstance(target, list):
        subprocess.Popen(target + argv_args)
        return

    if isinstance(target, str):
        # Resolve .lnk
        if target.lower().endswith(".lnk"):
            t, a, cwd = resolve_shortcut(target)
            if t:
                # Detect Chrome PWAs from the shortcut
                if "chrome.exe" in t.lower() or "msedge.exe" in t.lower():
                    # Parse shortcut arguments to run it directly
                    subprocess.Popen([t] + split_args(a))
                    return
                # Normal resolved target
                if a:
                    argv_args = split_args(a) + argv_args
                target = t
                if cwd and os.path.exists(cwd):
                    subprocess.Popen([target] + argv_args, cwd=cwd)
                    return
            
            # Fallback for .lnk if win32com failed or didn't return a target
            os.startfile(target)
            return

        # UWP apps
        if target.startswith("shell:AppsFolder\\"):
            subprocess.Popen(["cmd", "/c", "start", target])
            return

        # exe or path
        if os.path.isabs(target) and os.path.exists(target):
            subprocess.Popen([target] + argv_args)
            return
        # try a direct spawn (works for explorer.exe, wmplayer.exe, ms-settings:, etc.)
        subprocess.Popen(["cmd", "/c", "start", "", target] + argv_args)
        return

    raise ValueError("Unsupported target")



def cache_image(app_id: str, url: str, dst_dir: str = ICONS_DIR) -> str:
    """ينزّل الصورة ويحفظها محليًا — يرجع المسار المحلي."""
    os.makedirs(dst_dir, exist_ok=True)
    ext = ".png" if ".png" in url.lower() else ".jpg"
    path = os.path.join(dst_dir, f"{app_id}{ext}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=10) as r, open(path, "wb") as f:
        f.write(r.read())
    return path

import shutil
def cache_local_image(app_id: str, local_path: str, dst_dir: str) -> str:
    if not local_path or not os.path.exists(local_path):
        return local_path
    os.makedirs(dst_dir, exist_ok=True)
    ext = os.path.splitext(local_path)[1]
    if not ext: ext = ".png"
    new_path = os.path.join(dst_dir, f"{app_id}{ext}")
    try:
        shutil.copy2(local_path, new_path)
        return new_path
    except:
        return local_path


def get_exe_name(target_path: str) -> str:
    """Extracts FileDescription from EXE if available."""
    if not target_path or not os.path.exists(target_path):
        return ""
    if target_path.lower().endswith(".exe"):
        try:
            import win32api
            lang, codepage = win32api.GetFileVersionInfo(target_path, '\\VarFileInfo\\Translation')[0]
            str_info = u'\\StringFileInfo\\%04X%04X\\%s' % (lang, codepage, 'FileDescription')
            desc = win32api.GetFileVersionInfo(target_path, str_info)
            if desc and desc.strip():
                return desc.strip()
        except Exception:
            pass
    # Fallback to filename
    base = os.path.basename(target_path)
    name, _ = os.path.splitext(base)
    return name

def extract_icon(target_path: str, app_id: str, dst_dir: str = ICONS_CACHE_DIR) -> str:
    """Extracts icon from EXE or LNK files automatically."""
    if not target_path or not os.path.exists(target_path):
        return ""
    
    if target_path.lower().endswith(".lnk"):
        t, _, _ = resolve_shortcut(target_path)
        if t and os.path.exists(t):
            target_path = t

    if target_path.lower().endswith(".exe"):
        try:
            from icoextract import IconExtractor
            extractor = IconExtractor(target_path)
            out_path = os.path.join(dst_dir, f"{app_id}_extracted.ico")
            extractor.export_icon(out_path)
            return out_path
        except Exception as e:
            print(f"Failed to extract icon for {target_path}: {e}")
    return ""


def normalize_app(app: dict) -> dict:
    """Backward compatible migration for existing items."""
    # legacy fields: img (background tile image) + glyph + c1/c2 + target
    if "iconPath" not in app:
        app["iconPath"] = app.get("icon", "")
    if "backgroundPath" not in app:
        # img was used as tile background in v3
        app["backgroundPath"] = app.get("img", "")
    # args support (optional)
    if "args" not in app:
        app["args"] = app.get("launchArgs", "")
    # default colors
    if "c1" not in app or not app["c1"]:
        app["c1"] = "#31566e"
    if "c2" not in app or not app["c2"]:
        app["c2"] = "#1b3242"
        
    # v1.10 metadata
    if "favorite" not in app:
        app["favorite"] = False
    if "hidden" not in app:
        app["hidden"] = False
    if "launchCount" not in app:
        app["launchCount"] = 0
    if "lastOpened" not in app:
        app["lastOpened"] = 0
        
    return app

class Api:
    """الدوال هذي تنستدعى من JavaScript عبر window.pywebview.api"""

    def browse_file(self, file_type="exe"):
        if not webview.windows:
            return {"ok": False}
        window = webview.windows[0]
        allow_multiple = False
        if file_type == "exe":
            file_types = ('Applications (*.exe;*.lnk)', 'All files (*.*)')
            allow_multiple = True
        elif file_type == "icon":
            file_types = ('Images (*.png;*.jpg;*.jpeg;*.ico)', 'All files (*.*)')
        else:
            file_types = ('All files (*.*)',)
            
        result = window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=allow_multiple,
            file_types=file_types
        )
        if result and len(result) > 0:
            if file_type == "exe":
                return {"ok": True, "paths": list(result), "path": result[0]}
            return {"ok": True, "path": result[0]}
        return {"ok": False}

    def get_settings(self):
        return load_settings()

    def get_sports_data(self, force=False):
        return sports_service.get_matches(load_settings().get('sports', {}), force)
        
    def get_all_leagues(self):
        return sports_service.get_all_leagues()

    def ent_get_discover(self):
        return entertainment_service.get_discover_page(load_settings().get('entertainment', {}))

    def ent_get_calendar(self):
        return entertainment_service.get_calendar(load_settings().get('entertainment', {}))

    def ent_search(self, query):
        return entertainment_service.search(query, load_settings().get('entertainment', {}))

    def ent_get_details(self, media_type, item_id):
        return entertainment_service.get_details(media_type, item_id, load_settings().get('entertainment', {}))

    def read_image(self, path: str):
        if not path or not os.path.exists(path):
            return ""
        try:
            import base64
            with open(path, "rb") as f:
                data = f.read()
            ext = os.path.splitext(path)[1].lower()
            mime = "image/jpeg"
            if ext == ".png": mime = "image/png"
            elif ext == ".ico": mime = "image/x-icon"
            elif ext == ".webp": mime = "image/webp"
            return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"
        except Exception:
            return ""

    def update_settings(self, new_settings):
        settings = load_settings()
        settings.update(new_settings)
        save_settings(settings)
        toggle_startup(settings.get("start_with_windows", False))
        return {"ok": True, "settings": settings}

    def add_row(self, label: str):
        rows = load_rows()
        rows.append({"label": label, "apps": []})
        save_rows(rows)
        return {"ok": True, "rows": rows}
        
    def rename_row(self, row_index: int, new_label: str):
        rows = load_rows()
        if 0 <= row_index < len(rows):
            rows[row_index]["label"] = new_label
            save_rows(rows)
            return {"ok": True, "rows": rows}
        return {"ok": False}
        
    def delete_row(self, row_index: int):
        rows = load_rows()
        if 0 <= row_index < len(rows):
            rows.pop(row_index)
            save_rows(rows)
            return {"ok": True, "rows": rows}
        return {"ok": False}
        
    def move_row(self, row_index: int, up: bool):
        rows = load_rows()
        if 0 <= row_index < len(rows):
            target_idx = row_index - 1 if up else row_index + 1
            if 0 <= target_idx < len(rows):
                rows[row_index], rows[target_idx] = rows[target_idx], rows[row_index]
                save_rows(rows)
                return {"ok": True, "rows": rows}
        return {"ok": False}

    def power(self, action):
        if action == "shutdown":
            os.system("shutdown /s /t 0")
        elif action == "restart":
            os.system("shutdown /r /t 0")
        elif action == "sleep":
            os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
        elif action == "restart_app":
            # يشغّل نسخة جديدة ثم يغلق الحالية — Popen بقائمة يتعامل مع المسارات ذات المسافات
            try:
                if getattr(sys, "frozen", False):
                    subprocess.Popen([sys.executable])
                else:
                    subprocess.Popen([sys.executable, os.path.abspath(__file__)])
            except Exception as e:
                print("restart_app failed:", e)
            self.quit()
        return {"ok": True}

    def factory_reset(self):
        try:
            # Delete apps.json
            if os.path.exists(CONFIG):
                os.remove(CONFIG)
            
            # Reset settings
            if os.path.exists(SETTINGS_FILE):
                os.remove(SETTINGS_FILE)
            
            # Disable startup
            toggle_startup(False)
            
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "msg": str(e)}

    def get_rows(self):
        return load_rows()

    def reorder_app(self, app_id: str, from_row: int, from_col: int, to_row: int, to_col: int):
        rows = load_rows()

        if not (0 <= from_row < len(rows)) or not (0 <= to_row < len(rows)):
            return {"ok": False, "msg": "الصف غير موجود"}

        row_from = rows[from_row]
        row_to = rows[to_row]
        apps_from = row_from.get("apps", [])
        apps_to = row_to.get("apps", [])

        idx_from = next((i for i, a in enumerate(apps_from) if a.get("id") == app_id), None)
        if idx_from is None:
            return {"ok": False, "msg": "التطبيق غير موجود"}

        if from_row == to_row:
            if not (0 <= to_col < len(apps_from)):
                to_col = min(max(to_col, 0), len(apps_from) - 1)
            if idx_from == to_col:
                return {"ok": True, "rows": rows}
            if idx_from < to_col:
                to_col -= 1
                to_col = max(to_col, 0)
            item = apps_from.pop(idx_from)
            apps_from.insert(to_col, item)
        else:
            if not (0 <= to_col <= len(apps_to)):
                to_col = max(0, min(to_col, len(apps_to)))
            item = apps_from.pop(idx_from)
            apps_to.insert(to_col, item)

        save_rows(rows)
        return {"ok": True, "rows": rows}

    def launch(self, app_id: str):
        rows = load_rows()
        row, app = find_app(rows, app_id)
        if app is None:
            return {"ok": False, "msg": "التطبيق غير موجود"}

        try:
            target = app.get("target")
            args = app.get("args") or ""
            launch_target(target, args)
            
            # Update launch metadata
            import time
            app["lastOpened"] = int(time.time() * 1000)
            app["launchCount"] = app.get("launchCount", 0) + 1
            save_rows(rows)
            
            return {"ok": True, "rows": rows}
        except Exception as e:
            return {"ok": False, "msg": f"فشل التشغيل: {e}"}


    def search_images(self, query: str):
        """بحث عن أيقونات التطبيقات عبر iTunes Search API — مجاني وبدون مفاتيح."""
        try:
            q = urllib.parse.quote((query or "").strip())
            if not q:
                return {"ok": False, "msg": "اكتب كلمة للبحث"}
            url = f"https://itunes.apple.com/search?term={q}&entity=software&limit=12"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=12) as r:
                data = json.load(r)
            results = []
            for item in data.get("results", []):
                art = item.get("artworkUrl512") or item.get("artworkUrl100")
                if art:
                    results.append({"url": art, "name": item.get("trackName", "")})
            if not results:
                return {"ok": False, "msg": "ما لقيت نتائج"}
            return {"ok": True, "results": results}
        except Exception as e:
            return {"ok": False, "msg": f"فشل البحث: {e}"}

    def add_app(self, row_index: int, name: str, path: str, glyph: str, img_url: str = "", icon_url: str = "", c1: str = "#31566e", c2: str = "#1b3242", favorite: bool = False, hidden: bool = False):
        import time
        rows = load_rows()
        if not (0 <= row_index < len(rows)):
            return {"ok": False, "msg": "الصف غير موجود"}

        app_id = "app_" + str(int(time.time() * 1000))
        p = path.strip().strip('"')
        
        bg = ""
        if img_url:
            img_url = str(img_url).strip()
            if img_url.startswith("http"):
                try:
                    bg = cache_image(app_id + "_bg", img_url, dst_dir=WALLPAPERS_CACHE_DIR)
                except Exception:
                    bg = img_url
            elif img_url.startswith("data:"):
                bg = img_url
            else:
                bg = cache_local_image(app_id + "_bg", img_url, WALLPAPERS_CACHE_DIR)
                
        iconPath = ""
        if icon_url:
            icon_url = str(icon_url).strip()
            if icon_url.startswith("http"):
                try:
                    iconPath = cache_image(app_id + "_ic", icon_url, dst_dir=ICONS_CACHE_DIR)
                except Exception:
                    iconPath = icon_url
            elif icon_url.startswith("data:"):
                iconPath = icon_url
            else:
                iconPath = cache_local_image(app_id + "_ic", icon_url, ICONS_CACHE_DIR)

        if not iconPath and not bg and path:
            # Auto-extract icon if nothing provided
            extracted = extract_icon(p, app_id)
            if extracted:
                iconPath = extracted

        rows[row_index]["apps"].append({
            "id": app_id,
            "name": name,
            "sub": path if path.startswith("http") else os.path.basename(path),
            "glyph": glyph or "📌",
            "c1": c1,
            "c2": c2,
            "backgroundPath": bg,
            "iconPath": iconPath,
            "args": "",
            "img": bg,
            "target": path,
            "favorite": favorite,
            "hidden": hidden,
            "launchCount": 0,
            "lastOpened": 0
        })
        save_rows(rows)
        return {"ok": True, "rows": rows}

    def add_apps_bulk(self, row_index: int, paths: list):
        """إضافة عدة تطبيقات دفعة واحدة مع استخراج الأسماء والأيقونات تلقائياً."""
        import time
        rows = load_rows()
        if not (0 <= row_index < len(rows)):
            return {"ok": False, "msg": "الصف غير موجود"}

        added_count = 0
        for p in paths:
            if not p or not os.path.exists(p):
                continue
            
            target_path = p
            # Resolve LNK if needed
            if p.lower().endswith(".lnk"):
                t, _, _ = resolve_shortcut(p)
                if t and os.path.exists(t):
                    target_path = t
            
            name = get_exe_name(target_path)
            app_id = "app_" + str(int(time.time() * 1000)) + str(added_count)
            
            iconPath = extract_icon(p, app_id)
            
            app_obj = {
                "id": app_id,
                "name": name,
                "sub": os.path.basename(p),
                "glyph": "📌",
                "c1": "#31566e",
                "c2": "#1b3242",
                "backgroundPath": "",
                "iconPath": iconPath,
                "args": "",
                "img": "",
                "target": p,
                "favorite": False,
                "hidden": False,
                "launchCount": 0,
                "lastOpened": 0
            }
            rows[row_index]["apps"].append(app_obj)
            added_count += 1
            
        if added_count > 0:
            save_rows(rows)
            return {"ok": True, "rows": rows, "count": added_count}
        return {"ok": False, "msg": "لم يتم إضافة أي تطبيق صحيح"}


    def update_app(self, app_id: str, name: str, path: str, glyph: str, img_url: str = "", icon_url: str = "", new_row_index: int = -1, c1: str = "", c2: str = "", favorite: bool = False, hidden: bool = False):
        """تعديل تطبيق موجود (stage-1).
        img_url: '' = بدون تغيير، 'none' = إزالة الخلفية، رابط/مسار = خلفية جديدة.
        icon_url: '' = بدون تغيير، 'none' = إزالة الأيقونة، رابط/مسار = أيقونة جديدة.
        """
        rows = load_rows()
        old_row, app = find_app(rows, app_id)
        if app is None:
            return {"ok": False, "msg": "التطبيق غير موجود"}

        if (name or "").strip():
            app["name"] = name.strip()

        if (path or "").strip():
            p = path.strip().strip('"')
            app["target"] = p
            app["sub"] = p if p.startswith("http") else os.path.basename(p)

        if glyph:
            app["glyph"] = glyph

        if c1: app["c1"] = c1
        if c2: app["c2"] = c2

        # background update
        if img_url == "none":
            app["img"] = ""
            app["backgroundPath"] = ""
        elif img_url:
            img_url = str(img_url).strip()
            if img_url.startswith("http"):
                try:
                    bg = cache_image(app_id + "_bg", img_url, dst_dir=WALLPAPERS_CACHE_DIR)
                except Exception:
                    bg = img_url
                app["img"] = bg
                app["backgroundPath"] = bg
            elif img_url.startswith("data:"):
                app["img"] = img_url
                app["backgroundPath"] = img_url
            else:
                bg = cache_local_image(app_id + "_bg", img_url, WALLPAPERS_CACHE_DIR)
                app["img"] = bg
                app["backgroundPath"] = bg

        # icon update (optional)
        if icon_url == "none":
            app["iconPath"] = ""
        elif icon_url:
            icon_url = str(icon_url).strip()
            if icon_url.startswith("http"):
                try:
                    ic = cache_image(app_id + "_ic", icon_url, dst_dir=ICONS_CACHE_DIR)
                except Exception:
                    ic = icon_url
                app["iconPath"] = ic
            elif icon_url.startswith("data:"):
                app["iconPath"] = icon_url
            else:
                ic = cache_local_image(app_id + "_ic", icon_url, ICONS_CACHE_DIR)
                app["iconPath"] = ic
        
        app["favorite"] = favorite
        app["hidden"] = hidden

        # move to new row
        if new_row_index != -1 and 0 <= new_row_index < len(rows) and old_row != rows[new_row_index]:
            old_row["apps"].remove(app)
            rows[new_row_index]["apps"].append(app)

        save_rows(rows)
        return {"ok": True, "rows": rows}

    def move_app(self, app_id: str, direction: str):
        """نقل التطبيق يمين أو يسار داخل نفس الصف.
        direction: 'left' أو 'right'
        """
        rows = load_rows()
        row, app = find_app(rows, app_id)
        if app is None:
            return {"ok": False, "msg": "التطبيق غير موجود"}
        apps = row["apps"]
        idx = apps.index(app)
        if direction == "left" and idx > 0:
            apps[idx], apps[idx - 1] = apps[idx - 1], apps[idx]
        elif direction == "right" and idx < len(apps) - 1:
            apps[idx], apps[idx + 1] = apps[idx + 1], apps[idx]
        else:
            return {"ok": False, "msg": "ما يقدر يتحرك أكثر"}
        save_rows(rows)
        new_idx = apps.index(app)
        return {"ok": True, "rows": rows, "newCol": new_idx}

    def remove_app(self, app_id: str):
        rows = load_rows()
        row, app = find_app(rows, app_id)
        if app is None:
            return {"ok": False, "msg": "التطبيق غير موجود"}
        row["apps"].remove(app)
        save_rows(rows)
        return {"ok": True, "rows": rows}

    def get_windows_status(self):
        import subprocess
        wifi_status = "غير متصل"
        try:
            out = subprocess.check_output('netsh wlan show interfaces', shell=True, text=True, encoding='utf-8', errors='ignore')
            for line in out.splitlines():
                if 'SSID' in line and 'BSSID' not in line:
                    wifi_status = line.split(':', 1)[1].strip()
                    break
        except: pass
        
        bt_status = "غير معروف"
        try:
            out = subprocess.check_output('powershell -command "Get-Service bthserv | Select-Object -ExpandProperty Status"', shell=True, text=True, encoding='utf-8', errors='ignore').strip()
            if out == "Running":
                bt_status = "مُفعّل"
            elif out == "Stopped":
                bt_status = "متوقف"
        except: pass
        
        return {"ok": True, "wifi": wifi_status, "bluetooth": bt_status}

    def get_network_status(self):
        """حالة الشبكة لمؤشر الشريط العلوي: واي فاي (متصل + اسم الشبكة) وإيثرنت."""
        wifi = {"connected": False, "ssid": ""}
        ethernet = {"connected": False}

        # واي فاي عبر netsh — وجود SSID غير فارغ = متصل (لا يعتمد على لغة الويندوز)
        try:
            out = subprocess.check_output(
                'netsh wlan show interfaces', shell=True, text=True,
                encoding='utf-8', errors='ignore')
            ssid = ""
            for line in out.splitlines():
                l = line.strip()
                low = l.lower()
                if low.startswith('ssid') and not low.startswith('bssid') and ':' in l:
                    val = l.split(':', 1)[1].strip()
                    if val:
                        ssid = val
                        break
            if ssid:
                wifi = {"connected": True, "ssid": ssid}
        except Exception:
            pass

        # إيثرنت عبر PowerShell — محوّل فيزيائي سلكي (802.3) وحالته Up
        try:
            ps = ('powershell -NoProfile -Command "'
                  "(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | "
                  "Where-Object { $_.Status -eq 'Up' -and "
                  "($_.PhysicalMediaType -eq '802.3' -or $_.MediaType -eq '802.3') } | "
                  'Measure-Object).Count"')
            out = subprocess.check_output(
                ps, shell=True, text=True, encoding='utf-8', errors='ignore').strip()
            if out.isdigit() and int(out) > 0:
                ethernet = {"connected": True}
        except Exception:
            pass

        return {"ok": True, "wifi": wifi, "ethernet": ethernet}

    def search_windows_apps(self, query: str):
        query = query.strip().lower()
        if not query:
            return {"ok": False, "msg": "أدخل نص البحث"}
        
        results = []
        try:
            from pathlib import Path
            import glob
            
            paths_to_scan = [
                os.path.expandvars(r"%ProgramData%\Microsoft\Windows\Start Menu\Programs"),
                os.path.expandvars(r"%AppData%\Microsoft\Windows\Start Menu\Programs")
            ]
            
            for base_path in paths_to_scan:
                if not os.path.exists(base_path): continue
                # Limit scan to avoid slow perf
                for p in glob.glob(base_path + '/**/*.lnk', recursive=True):
                    name = os.path.splitext(os.path.basename(p))[0]
                    if query in name.lower():
                        results.append({
                            "name": name,
                            "path": p
                        })
                        if len(results) > 20: # Limit results
                            break
                if len(results) > 20: break
                
            return {"ok": True, "results": results}
        except Exception as e:
            return {"ok": False, "msg": f"فشل البحث: {str(e)}"}

    def detect_installed_apps(self):
        """Finds all installed apps in Start Menu without a query."""
        results = []
        try:
            import glob
            
            paths_to_scan = [
                os.path.expandvars(r"%ProgramData%\Microsoft\Windows\Start Menu\Programs"),
                os.path.expandvars(r"%AppData%\Microsoft\Windows\Start Menu\Programs")
            ]
            
            for base_path in paths_to_scan:
                if not os.path.exists(base_path): continue
                for p in glob.glob(base_path + '/**/*.lnk', recursive=True):
                    name = os.path.splitext(os.path.basename(p))[0]
                    # Filter out uninstallers and website links
                    nl = name.lower()
                    if "uninstall" in nl or "help" in nl or "url" in nl: continue
                    results.append({"name": name, "path": p})
            
            # Sort alphabetically and remove duplicates by name
            unique_results = {r["name"]: r for r in results}.values()
            sorted_results = sorted(list(unique_results), key=lambda x: x["name"])
            return {"ok": True, "results": sorted_results}
        except Exception as e:
            return {"ok": False, "msg": f"فشل الكشف: {str(e)}"}

    def scan_folder_for_apps(self, folder_path: str):
        """Scans a directory for .exe files."""
        if not folder_path or not os.path.exists(folder_path):
            return {"ok": False, "msg": "مسار المجلد غير صالح"}
            
        results = []
        try:
            for root, dirs, files in os.walk(folder_path):
                # Don't go too deep or into obvious non-app folders
                if "node_modules" in dirs: dirs.remove("node_modules")
                if "Crashpad" in dirs: dirs.remove("Crashpad")
                
                for f in files:
                    if f.lower().endswith(".exe"):
                        nl = f.lower()
                        # Filter out common non-launchers
                        if "unins" in nl or "setup" in nl or "crash" in nl or "update" in nl or "vcredist" in nl or "dxweb" in nl:
                            continue
                            
                        fp = os.path.join(root, f)
                        # Filter out small files (< 500KB usually aren't main games/apps unless it's a very simple tool)
                        try:
                            if os.path.getsize(fp) < 300 * 1024:
                                continue
                        except: pass
                        
                        name = get_exe_name(fp)
                        if not name: name = os.path.splitext(f)[0]
                        results.append({"name": name, "path": fp})
            
            unique_results = {r["name"]: r for r in results}.values()
            sorted_results = sorted(list(unique_results), key=lambda x: x["name"])
            return {"ok": True, "results": sorted_results}
        except Exception as e:
            return {"ok": False, "msg": f"فشل الفحص: {str(e)}"}

    def browse_folder(self):
        """Open a directory picker."""
        try:
            import win32gui, win32con
            from win32com.shell import shell, shellcon
            desktop_pidl = shell.SHGetFolderLocation(0, shellcon.CSIDL_DESKTOP, 0, 0)
            pidl, display_name, image_list = shell.SHBrowseForFolder(
                win32gui.GetDesktopWindow(),
                desktop_pidl,
                "اختر المجلد لفحصه بحثاً عن التطبيقات:",
                0,
                None,
                None
            )
            if pidl:
                path = shell.SHGetPathFromIDList(pidl)
                return {"ok": True, "path": path.decode("utf-8")}
        except ImportError:
            # Fallback if pywin32 is not fully functional for this
            pass
            
        # Fallback to tkinter
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            folder_path = filedialog.askdirectory(parent=root, title="اختر مجلد التطبيقات")
            root.destroy()
            if folder_path:
                return {"ok": True, "path": folder_path.replace("/", "\\")}
        except Exception as e:
            pass
            
        return {"ok": False, "msg": "إلغاء"}

    def get_storage_stats(self):
        def get_size(start_path):
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(start_path):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        total_size += os.path.getsize(fp)
            return total_size
            
        icons_sz = get_size(ICONS_CACHE_DIR) if os.path.exists(ICONS_CACHE_DIR) else 0
        wall_sz = get_size(WALLPAPERS_CACHE_DIR) if os.path.exists(WALLPAPERS_CACHE_DIR) else 0
        
        return {
            "ok": True,
            "icons_mb": round(icons_sz / (1024 * 1024), 2),
            "wallpapers_mb": round(wall_sz / (1024 * 1024), 2)
        }

    def quit(self):
        for w in webview.windows:
            w.destroy()


def _current_exe_name():
    """اسم ملف التطبيق التنفيذي (للنسخة المبنية) أو FAHAD_TV.exe افتراضياً."""
    if getattr(sys, "frozen", False):
        return os.path.basename(sys.executable)
    return "FAHAD_TV.exe"


def _kill_running_instances(include_self=False):
    """يغلق نسخ FAHAD TV العاملة عبر taskkill (يستثني هذه العملية افتراضياً)."""
    try:
        import time
        name = _current_exe_name()
        if include_self:
            cmd = f'taskkill /F /IM "{name}"'
        else:
            cmd = f'taskkill /F /IM "{name}" /FI "PID ne {os.getpid()}"'
        subprocess.run(cmd, shell=True, capture_output=True)
        time.sleep(0.6)  # مهلة بسيطة ليُحرَّر منفذ النافذة قبل الإقلاع من جديد
    except Exception:
        pass


if __name__ == "__main__":
    # أيقونات سطح المكتب:  --restart لإعادة التشغيل  |  --quit لإغلاق البرنامج
    if "--restart" in sys.argv:
        _kill_running_instances(include_self=False)  # يُغلق النسخة العاملة ثم يكمل الإقلاع
    elif "--quit" in sys.argv or "--shutdown" in sys.argv:
        _kill_running_instances(include_self=True)   # يُغلق كل النسخ ويخرج
        raise SystemExit(0)

    migrate_sports_settings()
    settings = load_settings()
    webview.create_window(
        title="FAHAD TV",
        url=resource_path("ui.html"),
        js_api=Api(),
        fullscreen=settings.get("fullscreen", True),
        background_color="#181a1f",
    )
    webview.start()
