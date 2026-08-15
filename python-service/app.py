from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List
import uvicorn

app = FastAPI(title="Local Embedding Service")

print("Loading embedding model...")

# Start with small model
model = SentenceTransformer("BAAI/bge-small-en-v1.5")

print("Model loaded successfully")


class EmbeddingRequest(BaseModel):
    texts: List[str]


@app.get("/")
def health():
    return {
        "status": "running",
        "model": "BAAI/bge-small-en-v1.5"
    }


@app.post("/embed")
async def embed(request: EmbeddingRequest):
    try:
        embeddings = model.encode(
            request.texts,
            batch_size=32,
            normalize_embeddings=True,
            show_progress_bar=False
        )

        return {
            "count": len(request.texts),
            "embeddings": embeddings.tolist()
        }

    except Exception as e:
        return {
            "error": str(e)
        }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )