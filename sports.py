# -*- coding: utf-8 -*-
"""
خدمة المباريات — مبنية على ESPN API (مجاني بالكامل وبدون مفتاح API)
تعرض مباريات آخر أسبوع + الشهر القادم حسب الدوريات المفضلة.
"""
import json
import os
import time
import datetime
import urllib.request
from typing import Dict, List

ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?dates={dates}&limit=300"

# قائمة البطولات المدعومة (المعرّف = رمز ESPN)
CURATED_LEAGUES = [
    {"id": "fifa.world",            "name": "كأس العالم (World Cup)",                        "country": "العالم",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/4.png"},
    {"id": "ksa.1",                 "name": "دوري روشن السعودي (Saudi Pro League)",          "country": "السعودية",   "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2488.png"},
    {"id": "ksa.kings.cup",         "name": "كأس الملك (Saudi King's Cup)",                  "country": "السعودية",   "type": "Cup",    "logo": "https://a.espncdn.com/i/teamlogos/countries/500/ksa.png"},
    {"id": "uefa.champions",        "name": "دوري أبطال أوروبا (Champions League)",          "country": "أوروبا",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png"},
    {"id": "uefa.europa",           "name": "الدوري الأوروبي (Europa League)",               "country": "أوروبا",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png"},
    {"id": "uefa.europa.conf",      "name": "دوري المؤتمر الأوروبي (Conference League)",     "country": "أوروبا",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/20296.png"},
    {"id": "eng.1",                 "name": "الدوري الإنجليزي الممتاز (Premier League)",     "country": "إنجلترا",    "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png"},
    {"id": "eng.fa",                "name": "كأس الاتحاد الإنجليزي (FA Cup)",                "country": "إنجلترا",    "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/40.png"},
    {"id": "eng.league_cup",        "name": "كأس كاراباو (Carabao Cup)",                     "country": "إنجلترا",    "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/41.png"},
    {"id": "esp.1",                 "name": "الدوري الإسباني (LaLiga)",                      "country": "إسبانيا",    "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png"},
    {"id": "esp.copa_del_rey",      "name": "كأس ملك إسبانيا (Copa del Rey)",                "country": "إسبانيا",    "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/80.png"},
    {"id": "ita.1",                 "name": "الدوري الإيطالي (Serie A)",                     "country": "إيطاليا",    "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png"},
    {"id": "ger.1",                 "name": "الدوري الألماني (Bundesliga)",                  "country": "ألمانيا",    "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png"},
    {"id": "fra.1",                 "name": "الدوري الفرنسي (Ligue 1)",                      "country": "فرنسا",      "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png"},
    {"id": "ned.1",                 "name": "الدوري الهولندي (Eredivisie)",                  "country": "هولندا",     "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png"},
    {"id": "por.1",                 "name": "الدوري البرتغالي (Primeira Liga)",              "country": "البرتغال",   "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/14.png"},
    {"id": "tur.1",                 "name": "الدوري التركي (Super Lig)",                     "country": "تركيا",      "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/18.png"},
    {"id": "sco.1",                 "name": "الدوري الاسكتلندي (Premiership)",               "country": "اسكتلندا",   "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/45.png"},
    {"id": "usa.1",                 "name": "الدوري الأمريكي (MLS)",                         "country": "أمريكا",     "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/19.png"},
    {"id": "mex.1",                 "name": "الدوري المكسيكي (Liga MX)",                     "country": "المكسيك",    "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/22.png"},
    {"id": "bra.1",                 "name": "الدوري البرازيلي (Brasileirão)",                "country": "البرازيل",   "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png"},
    {"id": "arg.1",                 "name": "الدوري الأرجنتيني (Liga Profesional)",          "country": "الأرجنتين",  "type": "League", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/1.png"},
    {"id": "fifa.cwc",              "name": "كأس العالم للأندية (Club World Cup)",           "country": "العالم",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/1932.png"},
    {"id": "uefa.euro",             "name": "كأس أمم أوروبا (EURO)",                         "country": "أوروبا",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/74.png"},
    {"id": "uefa.nations",          "name": "دوري الأمم الأوروبية (Nations League)",         "country": "أوروبا",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png"},
    {"id": "uefa.super_cup",        "name": "كأس السوبر الأوروبي (UEFA Super Cup)",          "country": "أوروبا",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/1272.png"},
    {"id": "conmebol.america",      "name": "كوبا أمريكا (Copa América)",                    "country": "أمريكا الجنوبية", "type": "Cup", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/83.png"},
    {"id": "conmebol.libertadores", "name": "كأس ليبرتادوريس (Copa Libertadores)",           "country": "أمريكا الجنوبية", "type": "Cup", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/58.png"},
    {"id": "afc.champions",         "name": "دوري أبطال آسيا للنخبة (AFC Champions League)", "country": "آسيا",       "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2200.png"},
    {"id": "afc.cup",               "name": "دوري أبطال آسيا 2 (ACL Two)",                   "country": "آسيا",       "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2243.png"},
    {"id": "afc.asian.cup",         "name": "كأس آسيا (AFC Asian Cup)",                      "country": "آسيا",       "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2243.png"},
    {"id": "caf.champions",         "name": "دوري أبطال أفريقيا (CAF Champions League)",     "country": "أفريقيا",    "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2391.png"},
    {"id": "caf.nations",           "name": "كأس أمم أفريقيا (AFCON)",                       "country": "أفريقيا",    "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/76.png"},
    {"id": "concacaf.champions",    "name": "كأس أبطال الكونكاكاف (Concacaf)",               "country": "أمريكا الشمالية", "type": "Cup", "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/2298.png"},
    {"id": "fifa.friendly",         "name": "مباريات ودية دولية (Friendlies)",               "country": "العالم",     "type": "Cup",    "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/53.png"},
]

# تحويل معرفات API-Football القديمة (أرقام) إلى رموز ESPN
LEGACY_LEAGUE_MAP = {
    "1": "fifa.world", "2": "uefa.champions", "3": "uefa.europa", "4": "uefa.euro",
    "5": "uefa.nations", "6": "caf.nations", "7": "afc.asian.cup", "9": "conmebol.america",
    "10": "fifa.friendly", "12": "caf.champions", "13": "conmebol.libertadores",
    "15": "fifa.cwc", "17": "afc.champions", "39": "eng.1", "45": "eng.fa",
    "48": "eng.league_cup", "61": "fra.1", "71": "bra.1", "78": "ger.1",
    "88": "ned.1", "94": "por.1", "128": "arg.1", "135": "ita.1", "140": "esp.1",
    "143": "esp.copa_del_rey", "179": "sco.1", "203": "tur.1", "253": "usa.1",
    "262": "mex.1", "307": "ksa.1", "504": "ksa.kings.cup", "848": "uefa.europa.conf",
}

VALID_LEAGUE_IDS = {l["id"] for l in CURATED_LEAGUES}


def migrate_league_ids(league_ids: List[str]) -> List[str]:
    """يحوّل المعرفات القديمة الرقمية إلى رموز ESPN ويحذف غير المدعوم."""
    migrated = []
    for lid in league_ids:
        lid = str(lid)
        if lid in VALID_LEAGUE_IDS:
            migrated.append(lid)
        elif lid in LEGACY_LEAGUE_MAP:
            migrated.append(LEGACY_LEAGUE_MAP[lid])
    # إزالة التكرار مع الحفاظ على الترتيب
    return list(dict.fromkeys(migrated))


def get_user_data_dir():
    app_data = os.getenv("LOCALAPPDATA")
    if not app_data:
        app_data = os.path.expanduser("~")
    d = os.path.join(app_data, "FAHAD_TV")
    os.makedirs(d, exist_ok=True)
    return d


MATCHES_CACHE_FILE = os.path.join(get_user_data_dir(), "matches.json")


class SportsProvider:
    def fetch_matches(self, user_preferences: Dict) -> List[Dict]:
        raise NotImplementedError

    def fetch_all_leagues(self) -> List[Dict]:
        raise NotImplementedError


class EspnProvider(SportsProvider):
    def _http_get(self, url: str) -> Dict:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FAHAD-TV"})
        with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
            return json.loads(r.read())

    def fetch_all_leagues(self) -> List[Dict]:
        return CURATED_LEAGUES

    def _parse_event(self, event: Dict, league_meta: Dict) -> Dict:
        comp = (event.get("competitions") or [{}])[0]
        status = comp.get("status") or event.get("status") or {}
        stype = status.get("type", {})
        state = stype.get("state", "pre")  # pre / in / post

        if state == "in":
            m_status = "live"
        elif state == "post":
            m_status = "finished"
        else:
            m_status = "upcoming"

        # الوقت يجي من ESPN بتوقيت UTC مثل 2026-07-11T21:00Z — نحوله للتوقيت المحلي
        date_part, time_part = "", "--:--"
        raw_date = event.get("date", "")
        try:
            dt = datetime.datetime.strptime(raw_date, "%Y-%m-%dT%H:%MZ")
            dt = dt.replace(tzinfo=datetime.timezone.utc).astimezone()
            date_part = dt.strftime("%Y-%m-%d")
            time_part = dt.strftime("%H:%M")
        except Exception:
            date_part = raw_date.split("T")[0] if "T" in raw_date else raw_date

        home, away = {}, {}
        for c in comp.get("competitors", []):
            team = c.get("team", {})
            side = {
                "id": str(team.get("id", "")),
                "name": team.get("displayName") or team.get("name") or "",
                "logo": team.get("logo", ""),
                "score": c.get("score"),
            }
            if c.get("homeAway") == "home":
                home = side
            else:
                away = side

        if m_status == "live":
            minute = status.get("displayClock") or stype.get("shortDetail", "")
        elif m_status == "finished":
            minute = stype.get("shortDetail", "FT")
        else:
            minute = ""

        def to_score(v):
            try:
                return int(v)
            except (TypeError, ValueError):
                return None

        return {
            "id": str(event.get("id", "")),
            "competition": {
                "id": league_meta["id"],
                "name": league_meta["name"],
                "logo": league_meta["logo"],
            },
            "homeTeam": {"id": home.get("id", ""), "name": home.get("name", ""), "logo": home.get("logo", "")},
            "awayTeam": {"id": away.get("id", ""), "name": away.get("name", ""), "logo": away.get("logo", "")},
            "date": date_part,
            "time": time_part,
            "status": m_status,
            "homeScore": to_score(home.get("score")),
            "awayScore": to_score(away.get("score")),
            "minute": minute,
        }

    def fetch_matches(self, user_preferences: Dict) -> List[Dict]:
        leagues = migrate_league_ids(user_preferences.get("favoriteLeagues", []))
        if not leagues:
            return []

        today = datetime.datetime.now()
        from_date = (today - datetime.timedelta(days=7)).strftime("%Y%m%d")
        to_date = (today + datetime.timedelta(days=30)).strftime("%Y%m%d")
        dates_range = f"{from_date}-{to_date}"

        league_by_id = {l["id"]: l for l in CURATED_LEAGUES}
        matches = []
        for slug in leagues:
            meta = league_by_id.get(slug)
            if not meta:
                continue
            try:
                data = self._http_get(ESPN_SCOREBOARD.format(slug=slug, dates=dates_range))
                for event in data.get("events", []):
                    try:
                        matches.append(self._parse_event(event, meta))
                    except Exception as parse_err:
                        print(f"Parse error ({slug}): {parse_err}")
            except Exception as e:
                print(f"ESPN error for league {slug}: {e}")

        # الترتيب: المباشر أولاً ثم القادمة ثم المنتهية (الأحدث أولاً)
        live = sorted([m for m in matches if m["status"] == "live"], key=lambda m: (m["date"], m["time"]))
        upcoming = sorted([m for m in matches if m["status"] == "upcoming"], key=lambda m: (m["date"], m["time"]))
        finished = sorted([m for m in matches if m["status"] == "finished"], key=lambda m: (m["date"], m["time"]), reverse=True)
        return live + upcoming + finished


class SportsService:
    def __init__(self, provider: SportsProvider):
        self.provider = provider
        self.cache = []
        self.last_fetch_time = 0
        self.cache_ttl = 30 * 60  # 30 دقيقة
        self.last_leagues = []
        self.load_cache_from_disk()

    def load_cache_from_disk(self):
        if os.path.exists(MATCHES_CACHE_FILE):
            try:
                with open(MATCHES_CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.cache = data.get("matches", [])
                    self.last_fetch_time = data.get("time", 0)
                    self.last_leagues = data.get("leagues", [])
            except Exception:
                pass

    def save_cache_to_disk(self):
        try:
            with open(MATCHES_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "matches": self.cache,
                    "time": self.last_fetch_time,
                    "leagues": self.last_leagues,
                }, f, ensure_ascii=False)
        except Exception as e:
            print("Error saving matches cache:", e)

    def get_matches(self, user_preferences: Dict, force_refresh: bool = False) -> Dict:
        now = time.time()
        current_leagues = migrate_league_ids(user_preferences.get("favoriteLeagues", []))

        if sorted(current_leagues) != sorted(self.last_leagues):
            force_refresh = True

        if not force_refresh and self.cache and (now - self.last_fetch_time) < self.cache_ttl:
            return {"status": "success", "data": self.cache, "cached": True}

        try:
            matches = self.provider.fetch_matches(user_preferences)
            self.cache = matches
            self.last_fetch_time = now
            self.last_leagues = current_leagues
            self.save_cache_to_disk()
            return {"status": "success", "data": matches, "cached": False}
        except Exception as e:
            if self.cache:
                return {"status": "error_fallback", "data": self.cache, "cached": True, "error": str(e)}
            return {"status": "error", "data": [], "cached": False, "error": str(e)}

    def get_all_leagues(self) -> Dict:
        try:
            return {"status": "success", "data": self.provider.fetch_all_leagues()}
        except Exception as e:
            return {"status": "error", "data": [], "error": str(e)}


sports_service = SportsService(EspnProvider())
