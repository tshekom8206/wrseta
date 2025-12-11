# SETA ID Verification API

## W&RSETA Hackathon 2025

A Multi-SETA ID Verification & Duplicate Detection System built with VB.NET and SQL Server.

---

## Overview

This API provides South African ID number verification and cross-SETA duplicate detection for 21 Sector Education and Training Authorities (SETAs). It prevents learners from double-dipping on government-funded training programmes.

### Key Features

- **ID Verification**: Validates SA ID numbers using format checks, Luhn algorithm, and DHA verification
- **Cross-SETA Duplicate Detection**: Prevents learners from enrolling in the same learnership at different SETAs
- **Traffic Light Status**: GREEN (verified), YELLOW (pending), RED (invalid/duplicate)
- **JWT Authentication**: Secure API access with API Key + JWT tokens
- **POPIA Compliant**: ID numbers stored as SHA-256 hashes, PII masked in responses
- **Multi-Tenant**: Supports all 21 South African SETAs

---

## Prerequisites

- **Visual Studio 2019/2022** (with .NET desktop development workload)
- **SQL Server Express** (LocalDB or full instance)
- **.NET Framework 4.8**
- **NuGet Package Manager**

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tshekom8206/wrseta.git
cd wrseta/SETA_IDVerification
```

### 2. Create the Database

1. Open **SQL Server Management Studio** (SSMS)
2. Connect to `localhost\SQLEXPRESS` (or your SQL Server instance)
3. Run the database creation script:

```sql
-- Create database
CREATE DATABASE WRSETA_HACKATHON;
GO

USE WRSETA_HACKATHON;
GO
```

4. Run the schema script located at:
   - `SETA_IDVerification/Database/Schema.sql`

### 3. Restore NuGet Packages

```bash
cd SETA.API
nuget restore packages.config -PackagesDirectory packages
```

Or in Visual Studio:
- Right-click solution > **Restore NuGet Packages**

### 4. Build the Solution

```bash
# Using MSBuild
msbuild SETA.API.vbproj /t:Build /p:Configuration=Debug
```

Or in Visual Studio:
- Build > **Build Solution** (Ctrl+Shift+B)

### 5. Run the API

```bash
cd bin\Debug
SETA.API.exe
```

You should see:
```
================================================
  SETA ID VERIFICATION API
  W&RSETA Hackathon 2025
================================================

API Server started successfully!
Base URL: http://localhost:5000

Available Endpoints:
--------------------------------------------
  POST /api/auth/token       - Get JWT token
  POST /api/verification/verify - Verify ID
  GET  /api/setas            - List all SETAs
  GET  /api/dashboard/stats/1 - SETA stats
  POST /api/learners/register - Register learner
--------------------------------------------

Press ENTER to stop the server...
```

---

## API Endpoints

### Authentication

All endpoints require the `X-API-Key` header:

```
X-API-Key: wrseta-lms-key-2025
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/token` | Get JWT token |
| POST | `/api/auth/refresh` | Refresh JWT token |

### ID Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/verify` | Full ID verification with duplicate check |
| POST | `/api/verification/validate-format` | Quick format validation only |
| GET | `/api/verification/recent/{setaId}` | Get recent verification attempts |

### Learners

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/learners/enroll` | Enroll a learner (with duplicate check) |
| GET | `/api/learners/{setaId}` | Get learners for a SETA |
| POST | `/api/learners/search` | Search learners by ID or name |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats/{setaId}` | Get SETA statistics |
| GET | `/api/dashboard/summary` | Get cross-SETA summary (admin) |
| GET | `/api/dashboard/trends/{setaId}` | Get verification trends |
| GET | `/api/dashboard/blocked/{setaId}` | Get blocked enrollment attempts |

### SETAs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/setas` | List all 21 SETAs |
| GET | `/api/setas/{code}` | Get SETA by code (e.g., WRSETA) |
| GET | `/api/setas/provinces` | Get all provinces |
| GET | `/api/setas/current` | Get current SETA (from API key) |

---

## Example Requests

### Get All SETAs

```bash
curl -X GET "http://localhost:5000/api/setas" \
  -H "X-API-Key: wrseta-lms-key-2025"
```

### Verify an ID Number

```bash
curl -X POST "http://localhost:5000/api/verification/verify" \
  -H "X-API-Key: wrseta-lms-key-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "idNumber": "8506155012089",
    "firstName": "Thabo",
    "surname": "Mokoena"
  }'
```

**Response (GREEN - Verified):**
```json
{
  "success": true,
  "data": {
    "status": "GREEN",
    "message": "Identity verified successfully",
    "isValid": true,
    "formatValid": true,
    "luhnValid": true,
    "dhaVerified": true,
    "duplicateFound": false,
    "demographics": {
      "dateOfBirth": "1985-06-15",
      "gender": "Male",
      "citizenship": "SA Citizen",
      "age": 40
    }
  },
  "timestamp": "2025-12-11T10:30:00Z"
}
```

### Enroll a Learner

```bash
curl -X POST "http://localhost:5000/api/learners/enroll" \
  -H "X-API-Key: wrseta-lms-key-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "idNumber": "8506155012089",
    "firstName": "Thabo",
    "surname": "Mokoena",
    "learnershipCode": "SAQA-12345",
    "provinceCode": "GP",
    "email": "thabo@email.com",
    "phone": "0821234567"
  }'
```

### Get Dashboard Statistics

```bash
curl -X GET "http://localhost:5000/api/dashboard/stats/1" \
  -H "X-API-Key: wrseta-lms-key-2025"
```

---

## Traffic Light Status

| Status | Meaning | Action |
|--------|---------|--------|
| **GREEN** | ID verified, no duplicates | Proceed with enrollment |
| **YELLOW** | ID valid, DHA verification pending | Manual review required |
| **RED** | Invalid ID or duplicate found | Block enrollment |

---

## Business Rules

### Duplicate Detection Rules

| Scenario | Allowed? |
|----------|----------|
| Same learner, same learnership, same SETA, same province, same year | **NO** |
| Same learner, same learnership, same SETA, **different province**, same year | **YES** |
| Same learner, **different learnership**, same SETA, same year | **YES** |
| Same learner, same learnership, **different SETA**, same year | **NO** |

---

## Project Structure

```
SETA_IDVerification/
├── SETA_IDVerification.sln          # Visual Studio solution
├── SETA.API/                        # Web API (VB.NET)
│   ├── Program.vb                   # Entry point (OWIN self-hosted)
│   ├── App_Start/
│   │   ├── Startup.vb               # OWIN configuration
│   │   └── WebApiConfig.vb          # Route configuration
│   ├── Controllers/
│   │   ├── AuthController.vb        # JWT authentication
│   │   ├── VerificationController.vb # ID verification
│   │   ├── LearnersController.vb    # Learner enrollment
│   │   ├── DashboardController.vb   # Statistics
│   │   └── SETAsController.vb       # SETA lookup
│   ├── Models/
│   │   └── ApiModels.vb             # Request/Response DTOs
│   ├── Security/
│   │   ├── ApiKeyAuthAttribute.vb   # API Key validation
│   │   ├── JwtTokenService.vb       # JWT generation
│   │   └── JwtAuthHandler.vb        # JWT validation
│   ├── swagger.json                 # OpenAPI 3.0 specification
│   └── App.config                   # Configuration
├── SETA.Core/                       # Core business logic
├── SETA.UI/                         # Windows Forms UI
└── Database/
    └── Schema.sql                   # Database schema
```

---

## Configuration

### Connection String

Edit `SETA.API/App.config`:

```xml
<connectionStrings>
  <add name="SETAConnection"
       connectionString="Server=localhost\SQLEXPRESS;Database=WRSETA_HACKATHON;Trusted_Connection=True;"
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

### JWT Settings

Edit `SETA.API/App.config`:

```xml
<appSettings>
  <add key="JwtSecret" value="your-256-bit-secret-key-here-minimum-32-chars" />
  <add key="JwtIssuer" value="SETA.API" />
  <add key="JwtAudience" value="SETA.LMS" />
  <add key="JwtExpiryMinutes" value="60" />
</appSettings>
```

---

## Testing API Keys

The database includes test API keys:

| SETA | API Key | Rate Limit |
|------|---------|------------|
| WRSETA | `wrseta-lms-key-2025` | 1000/hour |
| MICT | `mict-lms-key-2025` | 500/hour |
| MERSETA | `merseta-lms-key-2025` | 500/hour |

---

## Swagger Documentation

The API includes OpenAPI 3.0 documentation:

- **Swagger JSON**: `SETA.API/swagger.json`
- View in Swagger Editor: https://editor.swagger.io/

---

## Troubleshooting

### Port Already in Use

```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Database Connection Failed

1. Ensure SQL Server is running
2. Check connection string in App.config
3. Verify Windows Authentication is enabled

### NuGet Package Restore Issues

```bash
nuget restore SETA.API/packages.config -PackagesDirectory packages
```

---

## Security Notes

- API Keys are hashed with SHA-256 before storage
- ID numbers are stored as hashes (POPIA compliant)
- JWT tokens expire after 60 minutes
- Rate limiting prevents abuse (configurable per SETA)
- All requests logged to AuditTrail table

---

## License

This project was created for the W&RSETA Hackathon 2025.

---

## Contact

For questions or support, contact the development team.
