# Use official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies (needed for pdf2image/poppler)
# poppler-utils is required for pdf2image processing
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt . as requirements.txt

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
# Explicitly install uvicorn and gunicorn if not in requirements
RUN pip install uvicorn gunicorn

# Copy the current directory contents into the container at /app
COPY . .

# Expose port 8000
EXPOSE 8000

# Run the application
# Using gunicorn with uvicorn workers for production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
