from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from jose import JWTError, jwt

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")

client = AsyncIOMotorClient(MONGO_URI)
db = client["todo_shared"]
tasks_collection = db["tasks"]

app = FastAPI()
security = HTTPBearer()

class TaskModel(BaseModel):
    id: str = Field(default_factory=str, alias="_id")
    title: str
    description: str

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class TaskCreate(BaseModel):
    title: str
    description: str

def verify_jwt(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return verify_jwt(credentials.credentials)

@app.get("/tasks", response_model=List[TaskModel], dependencies=[Depends(get_current_user)])
async def list_tasks():
    tasks = []
    async for task in tasks_collection.find():
        task["_id"] = str(task["_id"])
        tasks.append(TaskModel(**task))
    return tasks

@app.post("/tasks", response_model=TaskModel, dependencies=[Depends(get_current_user)])
async def create_task(task: TaskCreate):
    doc = task.dict()
    result = await tasks_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return TaskModel(**doc)

@app.post("/tasks/events")
async def receive_event(request: Request):
    event = await request.json()
    # Placeholder: just echo the event for now
    return {"received": event}