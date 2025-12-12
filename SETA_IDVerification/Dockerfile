# =============================================
# SETA ID Verification API - Dockerfile
# W&RSETA Hackathon 2025
# =============================================
# Multi-stage build for .NET Framework 4.8 on Windows
# =============================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/framework/sdk:4.8-windowsservercore-ltsc2019 AS build

WORKDIR /src

# Copy solution and project files
COPY ["SETA_IDVerification.sln", "./"]
COPY ["SETA.API/SETA.API.vbproj", "SETA.API/"]
COPY ["SETA.API/packages.config", "SETA.API/"]
COPY ["SETA.Core/SETA.Core.vbproj", "SETA.Core/"]
COPY ["SETA.UI/SETA.UI.vbproj", "SETA.UI/"]

# Restore NuGet packages
RUN nuget restore SETA_IDVerification.sln

# Copy everything else
COPY . .

# Build the solution
RUN msbuild SETA.API/SETA.API.vbproj /t:Build /p:Configuration=Release /p:OutputPath=/app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/framework/runtime:4.8-windowsservercore-ltsc2019 AS runtime

WORKDIR /app

# Copy published output
COPY --from=build /app/publish .

# Copy swagger.json for API documentation
COPY ["swagger.json", "./"]

# Environment variables
ENV SETA_API_PORT=5000
ENV SETA_DB_SERVER=host.docker.internal\\SQLEXPRESS
ENV SETA_DB_NAME=SETA_IDVerification
ENV ASPNETCORE_URLS=http://+:5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD powershell -Command "try { $response = Invoke-WebRequest -Uri http://localhost:5000/api/health -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

# Entry point
ENTRYPOINT ["SETA.API.exe"]
