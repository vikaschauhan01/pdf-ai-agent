# paddle_ocr_service.py

from fastapi import FastAPI
from pydantic import BaseModel
from paddleocr import PaddleOCR

app = FastAPI()

ocr = PaddleOCR(
    use_angle_cls=True,
    lang="en"
)

class OCRRequest(BaseModel):
    image_path: str

@app.post("/ocr")
async def extract_text(request: OCRRequest):

    result = ocr.ocr(
        request.image_path,
        cls=True
    )

    text = []

    if result and result[0]:
        for line in result[0]:
            text.append(line[1][0])

    final_text = "\n".join(text)

    return {
        "text": final_text,
        "characters": len(final_text)
    }