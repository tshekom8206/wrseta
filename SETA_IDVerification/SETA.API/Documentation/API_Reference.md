# SETA ID Verification API Reference

## Overview

The SETA ID Verification API provides RESTful endpoints for South African ID number verification and learner enrollment management. This API is designed for integration with Learning Management Systems (LMS) and other SETA internal systems.

**Base URL:** `https://your-server/api`

**API Version:** 1.0

---

## Authentication

The API uses a dual authentication mechanism:

### 1. API Key (Required for all requests)

Include your API key in the `X-API-Key` header:

```
X-API-Key: your-api-key-here
```

### 2. JWT Token (Required for protected endpoints)

After obtaining a JWT token from the `/api/auth/token` endpoint, include it in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...
```

---

## Endpoints

### Authentication

#### POST /api/auth/token

Generate a JWT token using your credentials.

**Request:**
```json
{
  "username": "lms_service_account",
  "password": "your_password",
  "setaId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "expiresAt": "2025-12-11T15:30:00Z",
    "refreshToken": "abc123xyz...",
    "setaId": 1,
    "setaCode": "WRSETA",
    "setaName": "Wholesale and Retail SETA"
  },
  "timestamp": "2025-12-11T14:30:00Z",
  "requestId": "abc12345"
}
```

#### POST /api/auth/refresh

Refresh an expired JWT token.

**Request:**
```json
{
  "refreshToken": "abc123xyz..."
}
```

**Response:** Same as `/api/auth/token`

---

### ID Verification

#### POST /api/verification/verify

Verify a South African ID number and check for cross-SETA duplicates.

**Request:**
```json
{
  "idNumber": "8506155012089",
  "firstName": "Thabo",
  "surname": "Mokoena"
}
```

**Response (GREEN - Valid and Unique):**
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
  "timestamp": "2025-12-11T14:30:00Z",
  "requestId": "abc12345"
}
```

**Response (YELLOW - Valid but Pending DHA):**
```json
{
  "success": true,
  "data": {
    "status": "YELLOW",
    "message": "ID format valid but DHA verification pending",
    "isValid": true,
    "formatValid": true,
    "luhnValid": true,
    "dhaVerified": false,
    "duplicateFound": false,
    "demographics": {
      "dateOfBirth": "1985-06-15",
      "gender": "Male",
      "citizenship": "SA Citizen",
      "age": 40
    }
  }
}
```

**Response (RED - Duplicate Found):**
```json
{
  "success": true,
  "data": {
    "status": "RED",
    "message": "Learner already registered at another SETA",
    "isValid": true,
    "formatValid": true,
    "luhnValid": true,
    "dhaVerified": false,
    "duplicateFound": true,
    "demographics": {
      "dateOfBirth": "1985-06-15",
      "gender": "Male",
      "citizenship": "SA Citizen",
      "age": 40
    },
    "conflictingSeta": {
      "setaId": 7,
      "setaCode": "MICT",
      "setaName": "Media, ICT and Electronics SETA",
      "registrationDate": "2025-01-15T00:00:00Z"
    }
  }
}
```

#### POST /api/verification/validate-format

Quick validation of ID format and Luhn checksum only (no DHA or duplicate check).

**Request:**
```json
{
  "idNumber": "8506155012089"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "GREEN",
    "message": "ID format is valid",
    "isValid": true,
    "formatValid": true,
    "luhnValid": true,
    "dhaVerified": false,
    "duplicateFound": false,
    "demographics": {
      "dateOfBirth": "1985-06-15",
      "gender": "Male",
      "citizenship": "SA Citizen",
      "age": 40
    }
  }
}
```

#### GET /api/verification/recent/{setaId}

Get recent verification attempts for your SETA.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "logId": 12345,
      "status": "GREEN",
      "message": "Verified successfully",
      "verifiedAt": "2025-12-11T14:25:00Z"
    }
  ]
}
```

---

### Learner Enrollment

#### POST /api/learners/enroll

Enroll a learner in a learnership. Checks for duplicate enrollments based on:
- Same learnership + Same SETA + Same province + Same year = **BLOCKED**
- Same learnership + Different SETA + Same year = **BLOCKED**
- Same learnership + Same SETA + Different province = **ALLOWED**
- Different learnership at same SETA = **ALLOWED**

**Request:**
```json
{
  "idNumber": "8506155012089",
  "firstName": "Thabo",
  "surname": "Mokoena",
  "learnershipCode": "SAQA-12345",
  "learnershipName": "NQF 5 Logistics Management",
  "enrollmentYear": 2025,
  "province": "GP",
  "setaId": 1
}
```

**Response (ALLOWED - New Enrollment):**
```json
{
  "success": true,
  "data": {
    "decision": "ALLOWED",
    "duplicateType": "NEW_ENROLLMENT",
    "message": "Enrollment successful",
    "enrollmentId": "ABC123XYZ456"
  }
}
```

**Response (BLOCKED - Same SETA Same Province):**
```json
{
  "success": true,
  "data": {
    "decision": "BLOCKED",
    "duplicateType": "SAME_SETA_SAME_PROVINCE",
    "message": "Learner already enrolled in this learnership at this SETA in this province",
    "existingEnrollment": {
      "setaId": 1,
      "setaCode": "WRSETA",
      "setaName": "Wholesale and Retail SETA",
      "learnershipCode": "SAQA-12345",
      "province": "GP",
      "enrollmentYear": 2025,
      "enrollmentDate": "2025-01-15T00:00:00Z"
    }
  }
}
```

**Response (BLOCKED - Different SETA Same Year):**
```json
{
  "success": true,
  "data": {
    "decision": "BLOCKED",
    "duplicateType": "DIFFERENT_SETA_SAME_YEAR",
    "message": "Learner already enrolled in this learnership at another SETA this year",
    "existingEnrollment": {
      "setaId": 7,
      "setaCode": "MICT",
      "setaName": "Media, ICT and Electronics SETA",
      "learnershipCode": "SAQA-12345",
      "province": "GP",
      "enrollmentYear": 2025,
      "enrollmentDate": "2025-02-10T00:00:00Z"
    }
  }
}
```

**Response (ALLOWED - Different Province):**
```json
{
  "success": true,
  "data": {
    "decision": "ALLOWED",
    "duplicateType": "DIFFERENT_PROVINCE",
    "message": "Enrollment approved - learner has existing enrollment in different province",
    "enrollmentId": "DEF456GHI789",
    "existingEnrollment": {
      "setaId": 1,
      "setaCode": "WRSETA",
      "setaName": "Wholesale and Retail SETA",
      "learnershipCode": "SAQA-12345",
      "province": "GP",
      "enrollmentYear": 2025,
      "enrollmentDate": "2025-01-15T00:00:00Z"
    }
  }
}
```

#### GET /api/learners/{setaId}

Get learners for your SETA (paginated).

**Query Parameters:**
- `page` (optional, default: 1)
- `pageSize` (optional, default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "learners": [
      {
        "learnerId": 12345,
        "idNumberMasked": "850615****089",
        "firstName": "Thabo",
        "surname": "Mokoena",
        "learnershipCode": "SAQA-12345",
        "programmeName": "NQF 5 Logistics Management",
        "province": "GP",
        "registrationDate": "2025-01-15T00:00:00Z",
        "status": "Active"
      }
    ],
    "page": 1,
    "pageSize": 50
  }
}
```

#### GET /api/learners/search

Search for learners by ID number or name.

**Query Parameters:**
- `idNumber` (optional) - Full ID number
- `firstName` (optional)
- `surname` (optional)
- `setaId` (optional, defaults to your SETA)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "learnerId": 12345,
      "idNumberMasked": "850615****089",
      "firstName": "Thabo",
      "surname": "Mokoena",
      "learnershipCode": "SAQA-12345",
      "programmeName": "NQF 5 Logistics Management",
      "province": "GP",
      "registrationDate": "2025-01-15T00:00:00Z",
      "status": "Active"
    }
  ]
}
```

---

### Dashboard & Statistics

#### GET /api/dashboard/stats/{setaId}

Get dashboard statistics for your SETA.

**Response:**
```json
{
  "success": true,
  "data": {
    "setaId": 1,
    "setaCode": "WRSETA",
    "setaName": "Wholesale and Retail SETA",
    "totalLearners": 15234,
    "verifiedGreen": 12500,
    "verifiedYellow": 2000,
    "verifiedRed": 734,
    "blockedAttempts": 156,
    "todayVerifications": 87,
    "thisMonthEnrollments": 345
  }
}
```

#### GET /api/dashboard/summary

Get summary statistics across all SETAs (admin view).

**Response:**
```json
{
  "success": true,
  "data": {
    "setas": [
      {
        "setaId": 1,
        "setaCode": "WRSETA",
        "setaName": "Wholesale and Retail SETA",
        "totalLearners": 15234,
        "totalVerifications": 25000,
        "thisMonthEnrollments": 345
      }
    ],
    "totalSETAs": 21,
    "grandTotalLearners": 250000,
    "grandTotalVerifications": 500000
  }
}
```

#### GET /api/dashboard/trends/{setaId}

Get verification trends over time.

**Query Parameters:**
- `days` (optional, default: 30, max: 365)

**Response:**
```json
{
  "success": true,
  "data": {
    "days": 30,
    "trends": [
      {
        "date": "2025-12-01",
        "green": 45,
        "yellow": 12,
        "red": 8,
        "total": 65
      }
    ]
  }
}
```

#### GET /api/dashboard/blocked/{setaId}

Get blocked enrollment attempts (paginated).

**Query Parameters:**
- `page` (optional, default: 1)
- `pageSize` (optional, default: 20)

---

### SETA Reference Data

#### GET /api/setas

Get all active SETAs.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "setaId": 1,
      "setaCode": "WRSETA",
      "setaName": "Wholesale and Retail SETA",
      "sector": "Wholesale and Retail",
      "isActive": true
    },
    {
      "setaId": 2,
      "setaCode": "MICT",
      "setaName": "Media, ICT and Electronics SETA",
      "sector": "Information and Communication Technology",
      "isActive": true
    }
  ]
}
```

#### GET /api/setas/{code}

Get SETA by code.

**Response:**
```json
{
  "success": true,
  "data": {
    "setaId": 1,
    "setaCode": "WRSETA",
    "setaName": "Wholesale and Retail SETA",
    "sector": "Wholesale and Retail",
    "isActive": true
  }
}
```

#### GET /api/setas/provinces

Get all South African provinces.

**Response:**
```json
{
  "success": true,
  "data": [
    { "provinceCode": "EC", "provinceName": "Eastern Cape" },
    { "provinceCode": "FS", "provinceName": "Free State" },
    { "provinceCode": "GP", "provinceName": "Gauteng" },
    { "provinceCode": "KZN", "provinceName": "KwaZulu-Natal" },
    { "provinceCode": "LP", "provinceName": "Limpopo" },
    { "provinceCode": "MP", "provinceName": "Mpumalanga" },
    { "provinceCode": "NC", "provinceName": "Northern Cape" },
    { "provinceCode": "NW", "provinceName": "North West" },
    { "provinceCode": "WC", "provinceName": "Western Cape" }
  ]
}
```

#### GET /api/setas/current

Get your current SETA context (from API key).

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "timestamp": "2025-12-11T14:30:00Z",
  "requestId": "abc12345"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Missing or invalid request parameters |
| `INVALID_ID` | 400 | Invalid ID number format |
| `INVALID_CREDENTIALS` | 401 | Invalid username or password |
| `UNAUTHORIZED` | 401 | Missing or invalid API key/JWT token |
| `SETA_MISMATCH` | 403 | Attempted to access another SETA's data |
| `ACCESS_DENIED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_ENROLLMENT` | 200 | Enrollment blocked due to duplicate |
| `CROSS_SETA_DUPLICATE` | 200 | Duplicate found at another SETA |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- Default rate limit: **1000 requests per hour** per API key
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests per hour
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Security Considerations

1. **POPIA Compliance**: ID numbers are stored as SHA-256 hashes in global tables. Full PII is only stored in SETA-partitioned tables with Row-Level Security.

2. **ID Number Masking**: All API responses mask ID numbers (e.g., "850615****089") to protect PII.

3. **SETA Isolation**: Each API key is bound to a specific SETA. You cannot access other SETAs' learner data.

4. **Audit Logging**: All verification and enrollment requests are logged for compliance.

---

## Sample Integration Code (VB.NET)

```vb
Imports System.Net.Http
Imports System.Net.Http.Headers
Imports Newtonsoft.Json

Public Class SETAApiClient
    Private ReadOnly _httpClient As HttpClient
    Private ReadOnly _apiKey As String
    Private _jwtToken As String

    Public Sub New(baseUrl As String, apiKey As String)
        _httpClient = New HttpClient()
        _httpClient.BaseAddress = New Uri(baseUrl)
        _apiKey = apiKey
    End Sub

    Public Async Function AuthenticateAsync(username As String, password As String, setaId As Integer) As Task(Of Boolean)
        _httpClient.DefaultRequestHeaders.Clear()
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey)

        Dim request = New With {
            .username = username,
            .password = password,
            .setaId = setaId
        }

        Dim content = New StringContent(JsonConvert.SerializeObject(request), System.Text.Encoding.UTF8, "application/json")
        Dim response = Await _httpClient.PostAsync("/api/auth/token", content)

        If response.IsSuccessStatusCode Then
            Dim json = Await response.Content.ReadAsStringAsync()
            Dim result = JsonConvert.DeserializeObject(Of ApiResponse(Of TokenResponse))(json)
            _jwtToken = result.Data.Token
            Return True
        End If

        Return False
    End Function

    Public Async Function VerifyIdAsync(idNumber As String) As Task(Of VerificationResponse)
        _httpClient.DefaultRequestHeaders.Clear()
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey)
        _httpClient.DefaultRequestHeaders.Authorization = New AuthenticationHeaderValue("Bearer", _jwtToken)

        Dim request = New With { .idNumber = idNumber }
        Dim content = New StringContent(JsonConvert.SerializeObject(request), System.Text.Encoding.UTF8, "application/json")
        Dim response = Await _httpClient.PostAsync("/api/verification/verify", content)

        Dim json = Await response.Content.ReadAsStringAsync()
        Dim result = JsonConvert.DeserializeObject(Of ApiResponse(Of VerificationResponse))(json)
        Return result.Data
    End Function
End Class
```

---

## Contact & Support

For API access requests and technical support, contact your SETA IT administrator or the central verification hub support team.
