from __future__ import annotations
from pathlib import Path
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from api.service import Tagging

ROOT = Path(__file__).parents[1]

MODEL_PATH = ROOT / "model.onnx"

tagger = Tagging(MODEL_PATH)


app = FastAPI(title="POS TAGGING")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/api/predict")
def predict(text: str | None = Form(default=None)):
    try:
        return tagger.predict(text)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail={"error": f"{type(e).__name__}: {str(e)}"}
        )

