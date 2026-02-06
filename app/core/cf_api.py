import requests
import time
from typing import Dict, Any, List, Optional

class CodeforcesAPI:
    BASE_URL = "https://codeforces.com/api/"
    
    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = 60  # Default TTL in seconds
        
    def _get_from_cache(self, key: str) -> Optional[Any]:
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry['timestamp'] < self.cache_ttl:
                return entry['data']
        return None
    
    def _save_to_cache(self, key: str, data: Any):
        self.cache[key] = {
            'data': data,
            'timestamp': time.time()
        }
        
    def _make_request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        url = f"{self.BASE_URL}{endpoint}"
        
        # Simple cache key based on URL and params
        cache_key = f"{endpoint}_{str(params)}"
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
            
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data['status'] == 'OK':
                self._save_to_cache(cache_key, data['result'])
                return data['result']
            else:
                raise Exception(f"CF API Error: {data.get('comment', 'Unknown error')}")
        except Exception as e:
            print(f"Request failed: {e}")
            raise
            
    def get_user_info(self, handle: str) -> Dict[str, Any]:
        result = self._make_request("user.info", {"handles": handle})
        return result[0] if result else {}
        
    def get_user_status(self, handle: str, count: int = 10000) -> List[Dict[str, Any]]:
        return self._make_request("user.status", {"handle": handle, "from": 1, "count": count})
        
    def get_streak_and_heatmap(self, handle: str) -> Dict[str, Any]:
        submissions = self.get_user_status(handle)
        
        # heatmap: Map<DateString, AcceptedCount>
        heatmap = {}
        # solvedDates: Set of sorted dates for streak calculation
        solved_dates = set()
        
        for sub in submissions:
            if sub.get('verdict') == 'OK':
                # Convert to local date string (YYYY-MM-DD)
                ts = sub.get('creationTimeSeconds')
                date_str = time.strftime('%Y-%m-%d', time.gmtime(ts))
                heatmap[date_str] = heatmap.get(date_str, 0) + 1
                solved_dates.add(date_str)
        
        sorted_dates = sorted(list(solved_dates), reverse=True)
        
        current_streak = 0
        max_streak = 0
        
        if sorted_dates:
            # Calculate current streak (starting from today or yesterday)
            today = time.strftime('%Y-%m-%d', time.gmtime())
            yesterday = time.strftime('%Y-%m-%d', time.gmtime(time.time() - 86400))
            
            check_date = today
            if sorted_dates[0] == today or sorted_dates[0] == yesterday:
                idx = 0
                temp_date = sorted_dates[0]
                while idx < len(sorted_dates):
                    current_streak += 1
                    if idx + 1 < len(sorted_dates):
                        # Use timestamps to check if the next date is exactly one day before
                        curr_ts = time.mktime(time.strptime(sorted_dates[idx], '%Y-%m-%d'))
                        next_ts = time.mktime(time.strptime(sorted_dates[idx+1], '%Y-%m-%d'))
                        if curr_ts - next_ts <= 86400: # Allow for same day or 1 day diff
                            idx += 1
                        else:
                            break
                    else:
                        break

            # Calculate max streak
            temp_max = 0
            curr_temp = 0
            for i in range(len(sorted_dates)):
                curr_temp += 1
                if i + 1 < len(sorted_dates):
                    curr_ts = time.mktime(time.strptime(sorted_dates[i], '%Y-%m-%d'))
                    next_ts = time.mktime(time.strptime(sorted_dates[i+1], '%Y-%m-%d'))
                    if curr_ts - next_ts > 86400:
                        max_streak = max(max_streak, curr_temp)
                        curr_temp = 0
                else:
                    max_streak = max(max_streak, curr_temp)

        return {
            "current_streak": current_streak,
            "max_streak": max_streak,
            "heatmap": heatmap
        }
        
    def get_user_rating(self, handle: str) -> List[Dict[str, Any]]:
        return self._make_request("user.rating", {"handle": handle})
        
    def get_contest_list(self, gym: bool = False) -> List[Dict[str, Any]]:
        return self._make_request("contest.list", {"gym": gym})
        
    def get_problemset_problems(self, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        params = {}
        if tags:
            params['tags'] = ";".join(tags)
        return self._make_request("problemset.problems", params)

    def get_contest_standings(self, contest_id: int, from_index: int = 1, count: int = 100) -> Dict[str, Any]:
        return self._make_request("contest.standings", {"contestId": contest_id, "from": from_index, "count": count})
        
    def get_user_blog(self, handle: str) -> List[Dict[str, Any]]:
        return self._make_request("user.blogEntries", {"handle": handle})

    def get_recent_status(self, count: int = 50) -> List[Dict[str, Any]]:
        return self._make_request("problemset.recentStatus", {"count": count})

cf_api = CodeforcesAPI()
