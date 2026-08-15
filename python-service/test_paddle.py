

from paddleocr import PaddleOCR

print("Loading model...")

ocr = PaddleOCR(
    use_angle_cls=True,
    lang="en"
)

print("Model loaded successfully")