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

# Copy the requirements file (Fixed syntax)
COPY requirements.txt .

# Install packages
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn gunicorn

# Copy the rest of the code
COPY . .

# Render uses port 10000 by default
EXPOSE 10000

# Run using the PORT environment variable provided by Render
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]