# APIs Orchestrator

This project orchestrates both APIs (DHA.API and SETA.API) to run simultaneously, similar to how .NET Aspire works.

## Features

- Starts both APIs in separate console windows
- Manages lifecycle of both APIs
- Graceful shutdown when you press ENTER
- Displays status and URLs for both APIs

## Ports

- **DHA.API**: http://localhost:5000
- **SETA.API**: http://localhost:5001

## Usage

### Option 1: Run from Visual Studio

1. Set `APIs.Orchestrator` as the startup project
2. Build the solution (F6)
3. Run the orchestrator (F5)

### Option 2: Run from Command Line

1. Build both API projects first:
   ```bash
   msbuild DHA.API\DHA.API.vbproj /p:Configuration=Debug
   msbuild SETA.API\SETA.API.vbproj /p:Configuration=Debug
   ```

2. Build and run the orchestrator:
   ```bash
   msbuild APIs.Orchestrator\APIs.Orchestrator.vbproj /p:Configuration=Debug
   APIs.Orchestrator\bin\Debug\APIs.Orchestrator.exe
   ```

## How It Works

The orchestrator:
1. Launches DHA.API.exe in its own console window on port 5000
2. Launches SETA.API.exe in its own console window on port 5001
3. Displays status information
4. Waits for you to press ENTER
5. Gracefully shuts down both APIs when you press ENTER

## Notes

- Each API runs in its own console window, so you can see their individual output
- Make sure both API projects are built before running the orchestrator
- The orchestrator will automatically find the API executables in their `bin\Debug` folders
