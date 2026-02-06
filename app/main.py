from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from sqlalchemy.orm import Session
from app.core.cf_api import cf_api
from app.db.models import init_db, SessionLocal, Friend as FriendModel, Message as MessageModel, Blog as BlogModel, UserSetting as SettingModel, Bookmark as BookmarkModel
import time

# Initialize database
init_db()

app = FastAPI(title="merge_requests API")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Mount static files
static_path = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(static_path, "index.html"))

@app.get("/login")
async def read_login():
    return FileResponse(os.path.join(static_path, "login.html"))

@app.post("/api/login")
async def login(handle: str, db: Session = Depends(get_db)):
    try:
        user = cf_api.get_user_info(handle)
        # In a real app, we'd set a secure cookie/session here
        return {"status": "ok", "user": user}
    except:
        raise HTTPException(status_code=400, detail="Invalid Codeforces handle")

@app.get("/api/user/{handle}")
async def get_user(handle: str):
    try:
        return cf_api.get_user_info(handle)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/user/{handle}/status")
async def get_user_status(handle: str):
    try:
        return cf_api.get_user_status(handle)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/user/{handle}/streak")
async def get_user_streak(handle: str):
    try:
        return cf_api.get_streak_and_heatmap(handle)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/user/{handle}/rating")
async def get_user_rating(handle: str):
    try:
        return cf_api.get_user_rating(handle)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/contests/upcoming")
async def get_upcoming_contests():
    try:
        contests = cf_api.get_contest_list()
        upcoming = [c for c in contests if c.get('phase') == 'BEFORE']
        return sorted(upcoming, key=lambda x: x.get('startTimeSeconds', 0))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/problems")
async def get_problems(tags: str = None):
    try:
        tag_list = tags.split(",") if tags else None
        return cf_api.get_problemset_problems(tag_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/problemset/status")
async def get_problemset_status(count: int = 50):
    return cf_api.get_recent_status(count)

@app.get("/api/contests/{id}/problems")
async def get_contest_problems(id: int):
    standings = cf_api.get_contest_standings(id, count=1)
    return standings.get("problems", [])

@app.get("/api/contests/{id}/status")
async def get_contest_status(id: int, count: int = 50):
    # CF API doesn't have a direct "contest status" without standings
    # We can use standings to see recent rank changes or submissions if supported
    standings = cf_api.get_contest_standings(id, count=count)
    return standings.get("rows", [])

@app.get("/api/blogs")
async def get_global_blogs(db: Session = Depends(get_db)):
    return db.query(BlogModel).order_by(BlogModel.timestamp.desc()).all()

@app.get("/api/user/{handle}/blogs")
async def get_user_blogs(handle: str, db: Session = Depends(get_db)):
    # Combine platform blogs and CF blogs
    internal = db.query(BlogModel).filter(BlogModel.author_handle == handle).all()
    try:
        external = cf_api.get_user_blog(handle)
    except:
        external = []
    return {"internal": internal, "external": external}

@app.post("/api/user/settings")
async def save_settings(handle: str, theme: str, primary_handle: str, db: Session = Depends(get_db)):
    setting = db.query(SettingModel).filter(SettingModel.user_handle == handle).first()
    if not setting:
        setting = SettingModel(user_handle=handle)
        db.add(setting)
    setting.theme = theme
    setting.primary_handle = primary_handle
    db.commit()
    return {"status": "saved"}

@app.get("/api/user/{handle}/settings")
async def get_settings(handle: str, db: Session = Depends(get_db)):
    return db.query(SettingModel).filter(SettingModel.user_handle == handle).first()

@app.get("/api/friends/{handle}")
async def get_friends(handle: str, db: Session = Depends(get_db)):
    friends = db.query(FriendModel).filter(FriendModel.my_handle == handle).all()
    return [f.friend_handle for f in friends]

@app.post("/api/friends")
async def add_friend(my_handle: str, friend_handle: str, db: Session = Depends(get_db)):
    # Verify friend exists on CF
    try:
        cf_api.get_user_info(friend_handle)
    except:
        raise HTTPException(status_code=400, detail="Friend handle not found on Codeforces")
    
    existing = db.query(FriendModel).filter(
        FriendModel.my_handle == my_handle, 
        FriendModel.friend_handle == friend_handle
    ).first()
    
    if existing:
        return {"message": "Friend already added"}
        
    db_friend = FriendModel(my_handle=my_handle, friend_handle=friend_handle)
    db.add(db_friend)
    db.commit()
    return {"message": "Friend added successfully"}

@app.get("/api/chat")
async def get_messages(user1: str, user2: str, db: Session = Depends(get_db)):
    messages = db.query(MessageModel).filter(
        ((MessageModel.sender == user1) & (MessageModel.receiver == user2)) |
        ((MessageModel.sender == user2) & (MessageModel.receiver == user1))
    ).order_by(MessageModel.timestamp).all()
    return messages

@app.post("/api/chat")
async def send_message(sender: str, receiver: str, content: str, db: Session = Depends(get_db)):
    db_msg = MessageModel(sender=sender, receiver=receiver, content=content, timestamp=int(time.time()))
    db.add(db_msg)
    db.commit()
    return {"status": "sent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
