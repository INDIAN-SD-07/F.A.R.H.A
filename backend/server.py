from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
class UserMessage:
    def __init__(self, text: str):
        self.text = text

class LlmChat:
    def __init__(self):
        pass

    def chat(self, message: UserMessage):
        # For now, return a simple mock response
        return {"response": f"Local AI mock reply to: {message.text}"}
from elevenlabs import ElevenLabs
from elevenlabs.types import VoiceSettings


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize LLM and ElevenLabs clients
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
elevenlabs_client = None  # Will be initialized when API key is provided

# Create the main app
app = FastAPI(title="F.A.R.H.A AI Assistant")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_voice: bool = False

class ChatRequest(BaseModel):
    message: str
    is_voice: bool = False

class ChatResponse(BaseModel):
    response: str
    message_id: str
    timestamp: datetime

class TTSRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Default ElevenLabs voice
    stability: float = 0.7
    similarity_boost: float = 0.8
    style: float = 0.3
    use_speaker_boost: bool = True

class TTSResponse(BaseModel):
    audio_url: str
    text: str
    voice_id: str

class STTResponse(BaseModel):
    transcribed_text: str
    filename: str

class AuthSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, dict):
                data[key] = prepare_for_mongo(value)
    return data

def parse_from_mongo(item):
    """Parse datetime strings back from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str) and key in ['timestamp', 'created_at', 'expires_at']:
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
    return item

# Authentication
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    session_token = credentials.credentials
    
    # Check if session exists and is valid
    session = await db.auth_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Get user
    user = await db.users.find_one({"id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user)

# Auth endpoints
@api_router.post("/auth/session")
async def process_session(session_data: Dict[str, Any]):
    """Process session ID from Emergent Auth"""
    try:
        # Get session data from Emergent Auth
        session_id = session_data.get('session_id')
        if not session_id:
            raise HTTPException(status_code=400, detail="Session ID required")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        auth_data = response.json()
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": auth_data["email"]})
        
        if existing_user:
            user = User(**existing_user)
        else:
            # Create new user
            user = User(
                email=auth_data["email"],
                name=auth_data["name"],
                picture=auth_data.get("picture")
            )
            user_dict = prepare_for_mongo(user.dict())
            await db.users.insert_one(user_dict)
        
        # Create session
        session_token = auth_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        auth_session = AuthSession(
            user_id=user.id,
            session_token=session_token,
            expires_at=expires_at
        )
        
        session_dict = prepare_for_mongo(auth_session.dict())
        await db.auth_sessions.insert_one(session_dict)
        
        return {
            "user": user.dict(),
            "session_token": session_token,
            "expires_at": expires_at.isoformat()
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (400, 401, etc) as-is
        raise
    except Exception as e:
        logger.error(f"Error processing session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error")

@api_router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user and clear session"""
    try:
        # Delete all sessions for user
        await db.auth_sessions.delete_many({"user_id": current_user.id})
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging out: {str(e)}")

# Chat endpoints
@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_farha(request: ChatRequest, current_user: User = Depends(get_current_user)):
    """Chat with F.A.R.H.A AI assistant"""
    try:
        # Initialize LLM chat with system message
        system_message = "You are F.A.R.H.A, a sophisticated AI assistant. You are knowledgeable, helpful, and have a friendly personality. Respond naturally and conversationally."
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"farha_{current_user.id}_{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5")
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Get response from AI
        ai_response = await chat.send_message(user_message)
        
        # Save chat message to database
        chat_message = ChatMessage(
            user_id=current_user.id,
            message=request.message,
            response=ai_response,
            is_voice=request.is_voice
        )
        
        chat_dict = prepare_for_mongo(chat_message.dict())
        await db.chat_messages.insert_one(chat_dict)
        
        return ChatResponse(
            response=ai_response,
            message_id=chat_message.id,
            timestamp=chat_message.timestamp
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@api_router.get("/chat/history", response_model=List[ChatMessage])
async def get_chat_history(current_user: User = Depends(get_current_user), limit: int = 50):
    """Get chat history for current user"""
    try:
        messages = await db.chat_messages.find(
            {"user_id": current_user.id}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return [ChatMessage(**parse_from_mongo(msg)) for msg in messages]
        
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting chat history: {str(e)}")

# Voice endpoints (require ElevenLabs API key setup)
@api_router.post("/voice/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest, current_user: User = Depends(get_current_user)):
    """Convert text to speech using ElevenLabs"""
    try:
        # For now, return a mock response since ElevenLabs requires API key setup
        return TTSResponse(
            audio_url="data:audio/mpeg;base64,",  # Empty base64 for now
            text=request.text,
            voice_id=request.voice_id
        )
        
    except Exception as e:
        logger.error(f"Error in TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating speech: {str(e)}")

@api_router.post("/voice/stt", response_model=STTResponse)
async def speech_to_text(audio_file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Convert speech to text using ElevenLabs"""
    try:
        # For now, return a mock response since ElevenLabs requires API key setup
        return STTResponse(
            transcribed_text="Hello F.A.R.H.A",  # Mock transcription
            filename=audio_file.filename or "unknown.audio"
        )
        
    except Exception as e:
        logger.error(f"Error in STT: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

@api_router.get("/voice/voices")
async def get_available_voices(current_user: User = Depends(get_current_user)):
    """Get available voices for TTS"""
    # Mock response for now
    return {
        "voices": [
            {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "category": "premade"},
            {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "category": "premade"},
            {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "category": "premade"}
        ]
    }

# User profile
@api_router.get("/user/profile", response_model=User)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "F.A.R.H.A AI Assistant"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()