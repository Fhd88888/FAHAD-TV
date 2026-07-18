import os
import json
import time
import urllib.request
import urllib.parse
from typing import Dict, List, Any

def get_user_data_dir() -> str:
    app_data = os.getenv("LOCALAPPDATA")
    if not app_data:
        app_data = os.path.expanduser("~")
    d = os.path.join(app_data, "FAHAD_TV")
    os.makedirs(d, exist_ok=True)
    return d

ENTERTAINMENT_CACHE_FILE = os.path.join(get_user_data_dir(), "ent_cache.json")

class EntertainmentProvider:
    def fetch_trending(self, time_window: str, api_key: str, lang: str) -> List[Dict]:
        raise NotImplementedError
        
    def fetch_discover(self, media_type: str, api_key: str, lang: str, genres: str) -> List[Dict]:
        raise NotImplementedError
        
    def fetch_calendar(self, api_key: str, lang: str, region: str) -> Dict[str, List]:
        raise NotImplementedError
        
    def search(self, query: str, api_key: str, lang: str) -> List[Dict]:
        raise NotImplementedError
        
    def fetch_details(self, media_type: str, item_id: str, api_key: str, lang: str) -> Dict:
        raise NotImplementedError


class TMDBProvider(EntertainmentProvider):
    BASE_URL = "https://api.themoviedb.org/3"
    
    def _get(self, endpoint: str, api_key: str, params: Dict[str, str]) -> Dict:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        query_params = {"api_key": api_key}
        query_params.update(params)
        qs = urllib.parse.urlencode(query_params)
        url = f"{self.BASE_URL}{endpoint}?{qs}"
        
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FAHAD-TV"})
            with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
                return json.loads(r.read())
        except Exception as e:
            print(f"TMDB Error on {endpoint}: {e}")
            return {}

    def _normalize(self, item: Dict, media_type: str = None) -> Dict:
        mt = item.get("media_type", media_type)
        if not mt:
            mt = "movie" if "title" in item else "tv"
            
        return {
            "id": str(item.get("id", "")),
            "type": mt,
            "title": item.get("title") or item.get("name") or "",
            "poster": f"https://image.tmdb.org/t/p/w342{item['poster_path']}" if item.get("poster_path") else "",
            "backdrop": f"https://image.tmdb.org/t/p/w500{item['backdrop_path']}" if item.get("backdrop_path") else "",
            "overview": item.get("overview", ""),
            "releaseDate": item.get("release_date") or item.get("first_air_date") or "",
            "rating": item.get("vote_average", 0),
            "provider": "tmdb"
        }

    def fetch_trending(self, time_window: str, api_key: str, lang: str) -> List[Dict]:
        data = self._get(f"/trending/all/{time_window}", api_key, {"language": lang})
        results = data.get("results", [])
        return [self._normalize(r) for r in results if r.get("media_type") in ("movie", "tv")]

    def fetch_discover(self, media_type: str, api_key: str, lang: str, genres: str) -> List[Dict]:
        params = {"language": lang, "sort_by": "popularity.desc"}
        if genres:
            params["with_genres"] = genres
        data = self._get(f"/discover/{media_type}", api_key, params)
        return [self._normalize(r, media_type) for r in data.get("results", [])]
        
    def fetch_calendar(self, api_key: str, lang: str, region: str) -> Dict[str, List]:
        import datetime
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        next_month = (datetime.datetime.now() + datetime.timedelta(days=30)).strftime("%Y-%m-%d")
        
        movies_data = self._get("/discover/movie", api_key, {
            "language": lang, "region": region, 
            "primary_release_date.gte": today, 
            "primary_release_date.lte": next_month,
            "sort_by": "popularity.desc"
        })
        
        tv_data = self._get("/discover/tv", api_key, {
            "language": lang,
            "air_date.gte": today,
            "air_date.lte": next_month,
            "sort_by": "popularity.desc"
        })
        
        return {
            "movies": [self._normalize(r, "movie") for r in movies_data.get("results", [])],
            "tv": [self._normalize(r, "tv") for r in tv_data.get("results", [])]
        }

    def search(self, query: str, api_key: str, lang: str) -> List[Dict]:
        data = self._get("/search/multi", api_key, {"query": query, "language": lang})
        results = []
        for r in data.get("results", []):
            if r.get("media_type") in ["movie", "tv"]:
                results.append(self._normalize(r))
            elif r.get("media_type") == "person":
                results.append({
                    "id": str(r.get("id", "")),
                    "type": "person",
                    "title": r.get("name", ""),
                    "poster": f"https://image.tmdb.org/t/p/w342{r['profile_path']}" if r.get("profile_path") else "",
                    "provider": "tmdb"
                })
        return results

    def fetch_details(self, media_type: str, item_id: str, api_key: str, lang: str) -> Dict:
        data = self._get(f"/{media_type}/{item_id}", api_key, {
            "language": lang,
            "append_to_response": "videos,watch/providers,credits,recommendations"
        })
        if not data or "id" not in data:
            return {}
            
        base = self._normalize(data, media_type)
        base["backdrop"] = f"https://image.tmdb.org/t/p/original{data['backdrop_path']}" if data.get("backdrop_path") else ""
        base["genres"] = [g["name"] for g in data.get("genres", [])]
        base["runtime"] = data.get("runtime") or (data.get("episode_run_time")[0] if data.get("episode_run_time") else None)
        base["status"] = data.get("status", "")
        
        if media_type == "tv":
            base["seasons"] = data.get("number_of_seasons", 0)
            base["episodes"] = data.get("number_of_episodes", 0)
            
        cast = []
        for c in data.get("credits", {}).get("cast", [])[:10]:
            cast.append({
                "name": c.get("name"),
                "character": c.get("character"),
                "image": f"https://image.tmdb.org/t/p/w185{c['profile_path']}" if c.get("profile_path") else ""
            })
        base["cast"] = cast
        
        trailer = None
        for v in data.get("videos", {}).get("results", []):
            if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                trailer = f"https://www.youtube.com/watch?v={v['key']}"
                break
        base["trailer"] = trailer
        
        recs = [self._normalize(r, media_type) for r in data.get("recommendations", {}).get("results", [])[:8]]
        base["recommendations"] = recs
        
        providers_data = data.get("watch/providers", {}).get("results", {})
        base["providers"] = providers_data 
        
        collection = None
        if data.get("belongs_to_collection"):
            collection = {
                "id": str(data["belongs_to_collection"]["id"]),
                "name": data["belongs_to_collection"]["name"],
                "poster": f"https://image.tmdb.org/t/p/w342{data['belongs_to_collection']['poster_path']}" if data["belongs_to_collection"].get("poster_path") else ""
            }
        base["collection"] = collection
        
        return base

class EntertainmentService:
    def __init__(self, provider: EntertainmentProvider):
        self.provider = provider
        self.cache = {}
        self.load_cache()
        self.DEFAULT_API_KEY = "ee755a676a4c1e0cb8f52cf9b84f91c5"
        
    def load_cache(self):
        if os.path.exists(ENTERTAINMENT_CACHE_FILE):
            try:
                with open(ENTERTAINMENT_CACHE_FILE, "r", encoding="utf-8") as f:
                    self.cache = json.load(f)
            except:
                self.cache = {}
                
    def save_cache(self):
        try:
            with open(ENTERTAINMENT_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.cache, f)
        except Exception as e:
            print("Error saving ent cache:", e)

    def _is_valid_cache(self, key: str, ttl_hours: int) -> bool:
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry.get("time", 0) < ttl_hours * 3600:
                return True
        return False

    def _get_api_key(self, prefs: Dict) -> str:
        k = prefs.get("tmdb_api_key", "").strip()
        use_default = prefs.get("use_default_api", True)
        if not use_default and k:
            return k
        return self.DEFAULT_API_KEY

    def get_discover_page(self, prefs: Dict) -> Dict:
        api_key = self._get_api_key(prefs)
        if not api_key:
            return {"status": "error", "message": "no_api_key"}
            
        lang = prefs.get("language", "ar-SA")
        genres = ",".join(prefs.get("genres", []))
        
        c_key = f"discover_{lang}_{genres}"
        if self._is_valid_cache(c_key, 12):
            return {"status": "success", "data": self.cache[c_key]["data"]}
            
        try:
            data = {
                "trending_today": self.provider.fetch_trending("day", api_key, lang),
                "trending_week": self.provider.fetch_trending("week", api_key, lang),
                "movies": self.provider.fetch_discover("movie", api_key, lang, genres),
                "tv": self.provider.fetch_discover("tv", api_key, lang, genres)
            }
            self.cache[c_key] = {"time": time.time(), "data": data}
            self.save_cache()
            return {"status": "success", "data": data}
        except Exception as e:
            if c_key in self.cache:
                return {"status": "error_fallback", "data": self.cache[c_key]["data"], "error": str(e)}
            return {"status": "error", "error": str(e)}

    def get_calendar(self, prefs: Dict) -> Dict:
        api_key = self._get_api_key(prefs)
        if not api_key:
            return {"status": "error", "message": "no_api_key"}
            
        lang = prefs.get("language", "ar-SA")
        region = prefs.get("region", "SA")
        
        c_key = f"calendar_{lang}_{region}"
        if self._is_valid_cache(c_key, 24):
            return {"status": "success", "data": self.cache[c_key]["data"]}
            
        try:
            data = self.provider.fetch_calendar(api_key, lang, region)
            self.cache[c_key] = {"time": time.time(), "data": data}
            self.save_cache()
            return {"status": "success", "data": data}
        except Exception as e:
            if c_key in self.cache:
                return {"status": "error_fallback", "data": self.cache[c_key]["data"], "error": str(e)}
            return {"status": "error", "error": str(e)}

    def search(self, query: str, prefs: Dict) -> Dict:
        api_key = self._get_api_key(prefs)
        if not api_key:
            return {"status": "error", "message": "no_api_key"}
            
        lang = prefs.get("language", "ar-SA")
        try:
            data = self.provider.search(query, api_key, lang)
            return {"status": "success", "data": data}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_details(self, media_type: str, item_id: str, prefs: Dict) -> Dict:
        api_key = self._get_api_key(prefs)
        if not api_key:
            return {"status": "error", "message": "no_api_key"}
            
        lang = prefs.get("language", "ar-SA")
        c_key = f"details_{media_type}_{item_id}_{lang}"
        if self._is_valid_cache(c_key, 7 * 24):
            return {"status": "success", "data": self.cache[c_key]["data"]}
            
        try:
            data = self.provider.fetch_details(media_type, item_id, api_key, lang)
            self.cache[c_key] = {"time": time.time(), "data": data}
            self.save_cache()
            return {"status": "success", "data": data}
        except Exception as e:
            if c_key in self.cache:
                return {"status": "error_fallback", "data": self.cache[c_key]["data"], "error": str(e)}
            return {"status": "error", "error": str(e)}

entertainment_service = EntertainmentService(TMDBProvider())
