from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.app.routers import data, health, my_club, players, recruitment
import os

app = FastAPI(
    title="Football Recruitment Platform API",
    version="0.2.0",
    description="Explainable recruitment, similarity and squad-intelligence API by Aarón Expósito.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRP_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(recruitment.router)
app.include_router(players.router)
app.include_router(my_club.router)
app.include_router(data.router)
