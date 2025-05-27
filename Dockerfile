# Use official Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libx11-6 \
    libgl1-mesa-glx \
    libgl1-mesa-dev \
    libxrender1 \
    libxext6 \
    libsm6 \
    libxft2 \
    && apt-get clean

# Install Flask and CORS
RUN pip install flask flask-cors
# Install libraries for api calls and rendering
RUN pip install requests ipython openai numpy pyvista
#for loading env
RUN pip install python-dotenv

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run Flask app with static file support
CMD ["python", "-u", "backend/app.py"]
