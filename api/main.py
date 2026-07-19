from __future__ import annotations
from pathlib import Path
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from service import Tagging
import os
import urllib.request
ROOT = Path(__file__).parents[1]

# MODEL_PATH = ROOT / "model.onnx"
MODEL_PATH = "/tmp/model.onnx"
MODEL_URL = "https://github.com/phnguyen26/pos-tagging/releases/download/1.0/model.onnx"

def load_onnx_model():
    if not os.path.exists(MODEL_PATH):
        print("Downloading model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model dowloaded!")
    return MODEL_PATH
tagger = Tagging(load_onnx_model())


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

