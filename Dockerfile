# Use nginx as the base image
FROM nginx:alpine

# Set working directory inside the container
WORKDIR /usr/share/nginx/html

# Remove default nginx static files
RUN rm -rf ./*

# Copy the frontend HTML file from the subdirectory
COPY frontend/index.html .

# Expose port 80
EXPOSE 80
