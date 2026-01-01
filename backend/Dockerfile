# Use official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install packages
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn gunicorn

# Copy the rest of the code
COPY . .

# Railway detects and uses its own port, but we keep this for documentation
EXPOSE 8000

# FIX: This command writes your Google JSON to a file AND starts the server
# It uses the shell form to ensure $PORT is correctly read by Railway
CMD sh -c "echo \$GOOGLE_APPLICATION_CREDENTIALS_JSON > /app/google-credentials.json && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"