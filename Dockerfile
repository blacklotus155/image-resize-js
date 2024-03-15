# Use the official Node.js 22 image as base
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files to the working directory
COPY . .

# Expose the port on which the server will run
EXPOSE 3000

# Command to run the server
CMD ["node", "app.js"]
