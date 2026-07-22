FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

ENV TOPICS_DB_PATH=/data/topics.db
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1
VOLUME ["/data"]

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
