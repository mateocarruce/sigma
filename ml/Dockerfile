FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Entrena el modelo en build time para que la imagen siempre tenga un
# model.pkl fresco (dataset sintetico, ver train_model.py).
RUN python train_model.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
