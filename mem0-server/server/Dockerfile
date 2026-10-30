FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

# Patch psycopg -> psycopg[binary] (bundle libpq statis, tanpa apt install libpq)
# Image python:3.12-slim tidak punya libpq -> pure-python psycopg gagal dengan
# "ImportError: no pq wrapper available ... libpq library not found"
RUN sed -i 's/^psycopg>=/psycopg[binary]>=/' requirements.txt \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

# Tanpa --reload untuk production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
