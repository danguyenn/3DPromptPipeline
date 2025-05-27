# Use official Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install Flask and CORS
RUN pip install flask flask-cors
# Install libraries for api calls and rendering
RUN pip install requests ipython openai numpy pyvista
#for loading env
RUN pip install python-dotenv

# Copy backend and frontend
COPY backend/ backend/
COPY frontend/ frontend/

# Expose port
EXPOSE 5000

# Run Flask app with static file support
CMD ["python", "-u", "backend/app.py"]
