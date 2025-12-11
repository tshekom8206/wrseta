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
- **Circuit Breaker**: DHA API resilience with automatic failover
- **Bulk Verification**: Process up to 500 IDs in a single request
- **Health Monitoring**: Kubernetes-ready health check endpoints
- **Audit Logging**: Full POPIA compliance with detailed audit trails
- **CORS Support**: Cross-origin requests for LMS integration

---

## What's New in v1.1.0

### New Endpoints

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Health | `/api/health` | GET | Basic health check |
| Health | `/api/health/detailed` | GET | Detailed health with DB connectivity |
| Health | `/api/health/ready` | GET | Kubernetes readiness probe |
| Health | `/api/health/live` | GET | Kubernetes liveness probe |
| Verification | `/api/verification/verify-batch` | POST | Bulk verify up to 500 IDs |
| Verification | `/api/verification/dha-status` | GET | DHA circuit breaker status |
| Learners | `/api/learners/{id}` | PUT | Update learner details |
| Learners | `/api/learners/{id}/deactivate` | POST | Deactivate/withdraw learner |
| Learners | `/api/learners/detail/{id}` | GET | Get learner by ID |
| Auth | `/api/auth/logout` | POST | Logout and revoke tokens |
| Auth | `/api/auth/revoke` | POST | Revoke specific refresh token |
| Auth | `/api/auth/revoke-all/{username}` | POST | Revoke all user tokens |
| Auth | `/api/auth/session` | GET | Get current session info |

### New Features

1. **Health Checks** - Load balancer probes and monitoring
2. **Audit Logging** - POPIA compliance via `AuditLogService`
3. **API Request Logging** - All requests logged via `ApiLoggingHandler`
4. **Circuit Breaker** - DHA API resilience (CLOSED -> OPEN -> HALF-OPEN)
5. **Bulk Verification** - Process up to 500 IDs in one request
6. **CORS Configuration** - Enabled for LMS cross-origin requests
7. **Correlation IDs** - `X-Request-ID` header for request tracing
8. **Global Error Handling** - Consistent error responses with proper HTTP status codes

### What's New in v1.2.0

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Swagger | `/swagger` | GET | Interactive API documentation (Swagger UI) |
| Swagger | `/swagger/json` | GET | OpenAPI 3.0 JSON specification |
| Telemetry | `/api/telemetry/metrics` | GET | Application metrics |
| Telemetry | `/api/telemetry/status` | GET | Telemetry configuration status |
| Telemetry | `/api/telemetry/prometheus` | GET | Prometheus-format metrics |

### New Features in v1.2.0

1. **Swagger UI** - Interactive API documentation at `/swagger`
2. **OpenTelemetry Support** - Distributed tracing with OTLP export
3. **Docker Support** - Containerized deployment with docker-compose
4. **All 21 SETA API Keys** - Pre-configured API keys for all SETAs
5. **Prometheus Metrics** - `/api/telemetry/prometheus` endpoint
6. **Telemetry Dashboard** - Track requests, errors, verifications

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
| POST | `/api/auth/logout` | Logout and revoke all tokens |
| POST | `/api/auth/revoke` | Revoke specific refresh token |
| POST | `/api/auth/revoke-all/{username}` | Revoke all tokens for a user |
| GET | `/api/auth/session` | Get current session info |

### Health Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/detailed` | Detailed health with DB connectivity |
| GET | `/api/health/ready` | Kubernetes readiness probe |
| GET | `/api/health/live` | Kubernetes liveness probe |

### ID Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/verify` | Full ID verification with duplicate check |
| POST | `/api/verification/verify-batch` | Bulk verify up to 500 IDs |
| POST | `/api/verification/validate-format` | Quick format validation only |
| GET | `/api/verification/recent/{setaId}` | Get recent verification attempts |
| GET | `/api/verification/dha-status` | Get DHA service and circuit breaker status |

### Learners

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/learners/enroll` | Enroll a learner (with duplicate check) |
| GET | `/api/learners/{setaId}` | Get learners for a SETA |
| GET | `/api/learners/detail/{learnerId}` | Get learner by ID |
| PUT | `/api/learners/{learnerId}` | Update learner details |
| POST | `/api/learners/{learnerId}/deactivate` | Deactivate/withdraw learner |
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

### Health Check

```bash
curl -X GET "http://localhost:5000/api/health" \
  -H "X-API-Key: wrseta-lms-key-2025"
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T16:57:38Z",
  "version": "1.0.0",
  "service": "SETA.API"
}
```

### Detailed Health Check

```bash
curl -X GET "http://localhost:5000/api/health/detailed" \
  -H "X-API-Key: wrseta-lms-key-2025"
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T16:57:50Z",
  "version": "1.0.0",
  "service": "SETA.API",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Connected",
      "responseTimeMs": 69
    },
    "api": {
      "status": "healthy",
      "uptime": "0d 0h 5m 12s"
    }
  }
}
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
  "timestamp": "2025-12-11T10:30:00Z",
  "requestId": "abc12345"
}
```

### Bulk Verification (up to 500 IDs)

```bash
curl -X POST "http://localhost:5000/api/verification/verify-batch" \
  -H "X-API-Key: wrseta-lms-key-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "idNumbers": [
      {"idNumber": "8506155012089", "firstName": "Thabo", "surname": "Mokoena", "reference": "LMS-001"},
      {"idNumber": "9001015026087", "firstName": "Sipho", "surname": "Nkosi", "reference": "LMS-002"}
    ],
    "batchSize": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 2,
    "successCount": 2,
    "failedCount": 0,
    "processingTimeMs": 125,
    "results": [
      {
        "idNumber": "8506****089",
        "reference": "LMS-001",
        "status": "YELLOW",
        "message": "Format valid, DHA verification pending",
        "isValid": true,
        "duplicateFound": false
      },
      {
        "idNumber": "9001****087",
        "reference": "LMS-002",
        "status": "YELLOW",
        "message": "Format valid, DHA verification pending",
        "isValid": true,
        "duplicateFound": false
      }
    ]
  },
  "timestamp": "2025-12-11T10:31:00Z",
  "requestId": "def67890"
}
```

### DHA Circuit Breaker Status

```bash
curl -X GET "http://localhost:5000/api/verification/dha-status" \
  -H "X-API-Key: wrseta-lms-key-2025"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "circuitBreaker": {
      "state": "Closed",
      "failureCount": 0,
      "lastFailure": "0001-01-01T00:00:00Z",
      "lastSuccess": "2025-12-11T16:57:59Z",
      "failureThreshold": 5,
      "openTimeoutSeconds": 300,
      "halfOpenSuccessCount": 0,
      "halfOpenSuccessThreshold": 2
    },
    "configured": false,
    "timeoutMs": 5000
  },
  "timestamp": "2025-12-11T16:57:59Z",
  "requestId": "b0473924"
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

### Update a Learner

```bash
curl -X PUT "http://localhost:5000/api/learners/123" \
  -H "X-API-Key: wrseta-lms-key-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Thabo",
    "surname": "Mokoena-Updated",
    "status": "Active"
  }'
```

### Deactivate/Withdraw a Learner

```bash
curl -X POST "http://localhost:5000/api/learners/123/deactivate" \
  -H "X-API-Key: wrseta-lms-key-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Learner withdrew from programme",
    "effectiveDate": "2025-12-11T00:00:00Z"
  }'
```

### Logout

```bash
curl -X POST "http://localhost:5000/api/auth/logout" \
  -H "X-API-Key: wrseta-lms-key-2025" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out",
    "tokensRevoked": 1
  }
}
```

---

## Traffic Light Status

| Status | Meaning | Action |
|--------|---------|--------|
| **GREEN** | ID verified, no duplicates | Proceed with enrollment |
| **YELLOW** | ID valid, DHA verification pending | Manual review required |
| **RED** | Invalid ID or duplicate found | Block enrollment |

---

## Circuit Breaker States

The DHA verification service uses a circuit breaker pattern for resilience:

| State | Description |
|-------|-------------|
| **CLOSED** | Normal operation - DHA calls proceed |
| **OPEN** | DHA unavailable - calls skipped, returns YELLOW status |
| **HALF-OPEN** | Testing recovery - limited calls to check if DHA is back |

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
├── swagger.json                     # OpenAPI 3.0 specification
├── README.md                        # This file
├── SETA.API/                        # Web API (VB.NET)
│   ├── Program.vb                   # Entry point (OWIN self-hosted)
│   ├── App_Start/
│   │   ├── Startup.vb               # OWIN configuration (CORS, handlers, filters)
│   │   └── WebApiConfig.vb          # Route configuration
│   ├── Controllers/
│   │   ├── AuthController.vb        # JWT authentication + logout
│   │   ├── HealthController.vb      # Health check endpoints
│   │   ├── VerificationController.vb # ID verification + bulk
│   │   ├── LearnersController.vb    # Learner enrollment + update
│   │   ├── DashboardController.vb   # Statistics
│   │   └── SETAsController.vb       # SETA lookup
│   ├── Models/
│   │   └── ApiModels.vb             # Request/Response DTOs
│   ├── Security/
│   │   ├── ApiKeyAuthAttribute.vb   # API Key validation
│   │   ├── JwtTokenService.vb       # JWT generation
│   │   └── JwtAuthHandler.vb        # JWT validation
│   ├── Services/
│   │   ├── AuditLogService.vb       # POPIA compliance logging
│   │   ├── ApiRequestLogService.vb  # Request logging
│   │   ├── DHACircuitBreaker.vb     # Circuit breaker pattern
│   │   └── DHAVerificationService.vb # DHA API integration
│   ├── Filters/
│   │   └── GlobalExceptionFilter.vb # Global error handling
│   ├── Handlers/
│   │   ├── CorrelationIdHandler.vb  # Request ID tracing
│   │   └── ApiLoggingHandler.vb     # API request logging
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

### CORS Configuration

Edit `SETA.API/App.config` to specify allowed origins:

```xml
<appSettings>
  <add key="CorsOrigins" value="http://localhost:4200,https://lms.wrseta.org.za" />
</appSettings>
```

Leave empty or omit for development (allows all origins).

---

## Testing API Keys

The database includes test API keys for all 21 SETAs:

| SETA | API Key | Rate Limit |
|------|---------|------------|
| WRSETA | `wrseta-lms-key-2025` | 5000/hour |
| MICT | `mict-lms-key-2025` | 3000/hour |
| MERSETA | `merseta-lms-key-2025` | 3000/hour |
| SERVICES | `services-lms-key-2025` | 2000/hour |
| CETA | `ceta-lms-key-2025` | 2000/hour |
| CHIETA | `chieta-lms-key-2025` | 2000/hour |
| ETDP | `etdp-lms-key-2025` | 2000/hour |
| EWSETA | `ewseta-lms-key-2025` | 2000/hour |
| FASSET | `fasset-lms-key-2025` | 2000/hour |
| FOODBEV | `foodbev-lms-key-2025` | 2000/hour |
| FPM | `fpm-lms-key-2025` | 1500/hour |
| HWSETA | `hwseta-lms-key-2025` | 3000/hour |
| INSETA | `inseta-lms-key-2025` | 2000/hour |
| LGSETA | `lgseta-lms-key-2025` | 2500/hour |
| MQA | `mqa-lms-key-2025` | 3000/hour |
| PSETA | `pseta-lms-key-2025` | 2500/hour |
| SASSETA | `sasseta-lms-key-2025` | 2500/hour |
| AgriSETA | `agriseta-lms-key-2025` | 2000/hour |
| CATHSSETA | `cathsseta-lms-key-2025` | 2000/hour |
| TETA | `teta-lms-key-2025` | 2500/hour |
| BANKSETA | `bankseta-lms-key-2025` | 3000/hour |

Run `SETA.Core/Data/Seed_Additional_ApiKeys.sql` to create all API keys.

---

## Response Headers

All API responses include:

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Correlation ID for request tracing |
| `X-Processing-Time-Ms` | Server processing time in milliseconds |
| `Access-Control-Allow-Origin` | CORS header |

---

## Swagger Documentation

The API includes interactive Swagger UI documentation:

- **Swagger UI**: http://localhost:5000/swagger
- **Swagger JSON**: http://localhost:5000/swagger/json
- **Swagger JSON File**: `SETA_IDVerification/swagger.json`
- View in Swagger Editor: https://editor.swagger.io/

---

## OpenTelemetry (OTEL) Setup

The API supports OpenTelemetry for distributed tracing and metrics.

### Enable OpenTelemetry

Edit `SETA.API/App.config`:

```xml
<appSettings>
  <!-- Enable OpenTelemetry -->
  <add key="TelemetryEnabled" value="true" />
  <add key="OtlpEndpoint" value="http://localhost:4318/v1/traces" />
  <add key="ServiceName" value="SETA.API" />
  <add key="ServiceVersion" value="1.2.0" />
</appSettings>
```

### Run Jaeger (Trace Collector)

```bash
# Using Docker
docker run -d --name jaeger \
  -p 6831:6831/udp \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -e COLLECTOR_OTLP_ENABLED=true \
  jaegertracing/all-in-one:latest

# View traces at: http://localhost:16686
```

### Telemetry Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/telemetry/metrics` | Application metrics (JSON) |
| `GET /api/telemetry/status` | Telemetry configuration |
| `GET /api/telemetry/prometheus` | Prometheus-format metrics |
| `POST /api/telemetry/trace` | Create test trace span |

### View Metrics

```bash
# Get application metrics
curl http://localhost:5000/api/telemetry/metrics \
  -H "X-API-Key: wrseta-lms-key-2025"

# Get Prometheus metrics
curl http://localhost:5000/api/telemetry/prometheus \
  -H "X-API-Key: wrseta-lms-key-2025"
```

### Response Example

```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalRequests": 150,
      "totalErrors": 3,
      "totalVerifications": 45,
      "totalDuplicatesBlocked": 5,
      "errorRate": 2.0,
      "duplicateRate": 11.11
    },
    "tracing": {
      "activeSpans": 0,
      "enabled": true,
      "endpoint": "http://localhost:4318/v1/traces"
    },
    "service": {
      "name": "SETA.API",
      "version": "1.2.0"
    }
  }
}
```

---

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Start all services (API + SQL Server)
docker-compose up -d

# With monitoring (Jaeger + Seq)
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f seta-api

# Stop services
docker-compose down
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SQL_SA_PASSWORD` | SQL Server SA password | `YourStrong@Passw0rd` |
| `JWT_SECRET` | JWT signing key | (32+ chars required) |
| `SETA_DB_SERVER` | Database server | `sqlserver` |
| `SETA_DB_NAME` | Database name | `SETA_IDVerification` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

### Build and Run Manually

```bash
# Build the Docker image
docker build -t seta-api:latest .

# Run the container
docker run -d -p 5000:5000 \
  -e SETA_DB_SERVER=host.docker.internal\\SQLEXPRESS \
  -e SETA_DB_NAME=SETA_IDVerification \
  --name seta-api \
  seta-api:latest

# Check health
curl http://localhost:5000/api/health
```

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `seta-api` | 5000 | SETA ID Verification API |
| `sqlserver` | 1433 | SQL Server 2019 |
| `seq` | 5341 | Centralized logging (optional) |
| `jaeger` | 16686, 4317, 4318 | Distributed tracing (optional) |

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

### Circuit Breaker in OPEN State

If DHA verification is being skipped:
1. Check `/api/verification/dha-status` endpoint
2. Wait for the open timeout (default 5 minutes)
3. Check DHA API connectivity

---

## Security Notes

- API Keys are hashed with SHA-256 before storage
- ID numbers are stored as hashes (POPIA compliant)
- JWT tokens expire after 60 minutes
- Rate limiting prevents abuse (configurable per SETA)
- All requests logged to AuditTrail table
- Correlation IDs enable request tracing
- CORS configured for known origins only
- HTTPS required in production

---

## License

This project was created for the W&RSETA Hackathon 2025.

---

## Contact

For questions or support, contact the development team.

GitHub: https://github.com/tshekom8206/wrseta
