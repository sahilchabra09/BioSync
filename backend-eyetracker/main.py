from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from api.process_audio import router as audio_router
from api.chat_responses import router as chat_router
from eye_tracking import router as eye_router, shutdown_tracker as shutdown_eye_tracker


# Setup logging
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Alice API",
    description="Alice - Search, audio transcription, computer control, bot control",
    version="2.0.0",
)

# Allow all origins for testing/dev, adjust as needed for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(audio_router, prefix="", tags=["audio"])
app.include_router(chat_router, prefix="", tags=["chat"])
app.include_router(eye_router, prefix="", tags=["eye-tracker"])

@app.get("/")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event():
    """Initialize bot MQTT client and conversation context on startup"""
    logger.info("🤖 Starting Alice AI Backend...")
    logger.info("🚀 Alice AI Backend ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup bot MQTT client on shutdown"""
    shutdown_eye_tracker()
    logger.info("👋 Goodbye!")

