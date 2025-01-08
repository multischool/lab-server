# Use the official Ubuntu base image
FROM ubuntu:latest

# Set environment variable to suppress prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package lists and install essential packages
RUN apt-get update && \
    apt-get install -y \
        sudo \
        build-essential \
        curl \
        wget \
        vim \
        git \
        unzip \
        zip \
        htop \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a new user (optional)
RUN useradd -m newuser && \
    echo "newuser:password" | chpasswd && \
    adduser newuser sudo

# Allow passwordless sudo for the new user (optional)
RUN echo "newuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to the new user (optional)
USER newuser

# Set the default command to bash
CMD ["bash"]
