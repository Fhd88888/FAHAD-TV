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


def resource_path(name: str) -> str:
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, name)


CONFIG = os.path.join(app_dir(), "apps.json")
# legacy icons directory (already used by v3)
ICONS_DIR = os.path.join(app_dir(), "icons")
# new caches for richer metadata
CACHE_DIR = os.path.join(app_dir(), "cache")
ICONS_CACHE_DIR = os.path.join(CACHE_DIR, "icons")
WALLPAPERS_CACHE_DIR = os.path.join(CACHE_DIR, "wallpapers")

os.makedirs(ICONS_CACHE_DIR, exist_ok=True)
os.makedirs(WALLPAPERS_CACHE_DIR, exist_ok=True)



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
    path = os.path.join(app_dir(), "settings.json")
    default_settings = {
        "start_with_windows": False,
        "fullscreen": True,
        "theme": "dark",
        "blur_strength": 10,
        "animations": True,
        "hero_backgrounds": True
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
    path = os.path.join(app_dir(), "settings.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

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
    return app



class Api:
    """الدوال هذي تنستدعى من JavaScript عبر window.pywebview.api"""

    def browse_file(self, file_type="exe"):
        if not webview.windows:
            return {"ok": False}
        window = webview.windows[0]
        if file_type == "exe":
            file_types = ('Applications (*.exe;*.lnk)', 'All files (*.*)')
        elif file_type == "icon":
            file_types = ('Images (*.png;*.jpg;*.jpeg;*.ico)', 'All files (*.*)')
        else:
            file_types = ('All files (*.*)',)
            
        result = window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=file_types
        )
        if result and len(result) > 0:
            return {"ok": True, "path": result[0]}
        return {"ok": False}

    def get_settings(self):
        return load_settings()

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
        return {"ok": True}

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
        _, app = find_app(rows, app_id)
        if app is None:
            return {"ok": False, "msg": "التطبيق غير موجود"}

        try:
            target = app.get("target")
            args = app.get("args") or ""
            launch_target(target, args)
            return {"ok": True}
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

    def add_app(self, row_index: int, name: str, path: str, glyph: str, img_url: str = "", icon_url: str = "", c1: str = "#31566e", c2: str = "#1b3242"):
        """إضافة تطبيق لصف معين (stage-1)."""
        rows = load_rows()
        if not (0 <= row_index < len(rows)):
            return {"ok": False, "msg": "الصف غير موجود"}

        app_id = "app_" + str(int(time.time() * 1000))
        p = path.strip().strip('"')
        sub = p if p.startswith("http") else os.path.basename(p)

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
            # new fields (stage-1)
            "backgroundPath": background,
            "iconPath": iconPath,
            "args": "",
            # legacy field for existing UI fallback
            "img": background,
            "target": path,
        })
        save_rows(rows)
        return {"ok": True, "rows": rows}


    def update_app(self, app_id: str, name: str, path: str, glyph: str, img_url: str = "", icon_url: str = "", new_row_index: int = -1, c1: str = "", c2: str = ""):
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

    def quit(self):
        for w in webview.windows:
            w.destroy()


if __name__ == "__main__":
    settings = load_settings()
    webview.create_window(
        title="FAHAD TV",
        url=resource_path("ui.html"),
        js_api=Api(),
        fullscreen=settings.get("fullscreen", True),
        background_color="#181a1f",
    )
    webview.start()
