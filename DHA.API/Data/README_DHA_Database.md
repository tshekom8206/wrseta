# DHA Mock Database Setup

This guide explains how to set up the DHA Mock database for testing and development.

## Prerequisites

- SQL Server Express or SQL Server (local instance)
- SQL Server Management Studio (SSMS) or similar tool

## Setup Steps

### 1. Create the Database

Run the SQL script `Schema_DHA_Mock.sql` in SQL Server Management Studio:

1. Open SQL Server Management Studio
2. Connect to your local SQL Server instance (e.g., `localhost\SQLEXPRESS`)
3. Open the file `DHA.API/Data/Schema_DHA_Mock.sql`
4. Execute the script (F5)

This will:
- Create the `DHA_Mock` database
- Create the `People` table
- Create the `VerificationLog` table
- Create stored procedures for data access

### 2. Verify Connection String

Ensure the connection string in `DHA.API/App.config` matches your SQL Server instance:

```xml
<connectionStrings>
  <add name="DHAConnection"
       connectionString="Data Source=localhost\SQLEXPRESS;Initial Catalog=DHA_Mock;Integrated Security=True;TrustServerCertificate=True"
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

**Note:** Adjust `localhost\SQLEXPRESS` to match your SQL Server instance name.

### 3. Test the Connection

Use the API endpoint to test the database connection:

```
GET /api/dha/data/test-connection
Headers: X-API-Key: your-api-key
```

### 4. Add Sample Data

You can add sample data using the API endpoint:

```
POST /api/dha/data/add-sample-data?count=10
Headers: X-API-Key: your-api-key
```

Or add individual people:

```
POST /api/dha/data/add-person
Headers: X-API-Key: your-api-key
Content-Type: application/json

{
  "idNumber": "9001015801085",
  "firstName": "John",
  "surname": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "citizenship": "SA Citizen",
  "isDeceased": false,
  "isSuspended": false,
  "needsManualReview": false
}
```

## Database Schema

### People Table

Stores identity information for people in the mock DHA database.

| Column | Type | Description |
|--------|------|-------------|
| PersonId | INT | Primary key, auto-increment |
| IdNumber | NVARCHAR(13) | Unique ID number |
| FirstName | NVARCHAR(100) | First name |
| Surname | NVARCHAR(100) | Surname |
| DateOfBirth | DATE | Date of birth |
| Gender | NVARCHAR(10) | 'Male' or 'Female' |
| Citizenship | NVARCHAR(50) | 'SA Citizen' or 'Permanent Resident' |
| IsDeceased | BIT | Whether person is deceased |
| DateOfDeath | DATE | Date of death (nullable) |
| IsSuspended | BIT | Whether ID is suspended |
| SuspensionReason | NVARCHAR(500) | Reason for suspension (nullable) |
| NeedsManualReview | BIT | Whether manual review is needed |
| ReviewReason | NVARCHAR(500) | Reason for review (nullable) |
| CreatedAt | DATETIME2 | Record creation timestamp |
| UpdatedAt | DATETIME2 | Last update timestamp |
| IsActive | BIT | Soft delete flag |

### VerificationLog Table

Logs all verification requests made to the DHA API.

| Column | Type | Description |
|--------|------|-------------|
| LogId | BIGINT | Primary key, auto-increment |
| IdNumber | NVARCHAR(13) | ID number verified |
| VerificationStatus | NVARCHAR(50) | Status (VERIFIED, NOT_FOUND, etc.) |
| VerificationReference | NVARCHAR(50) | Reference number (nullable) |
| RequestId | NVARCHAR(50) | Request correlation ID (nullable) |
| ProcessingTimeMs | INT | Processing time in milliseconds (nullable) |
| ErrorMessage | NVARCHAR(1000) | Error message if any (nullable) |
| VerifiedAt | DATETIME2 | Verification timestamp |
| ClientIp | NVARCHAR(50) | Client IP address (nullable) |

## API Endpoints

### Test Connection
```
GET /api/dha/data/test-connection
```

### Add Person
```
POST /api/dha/data/add-person
Body: AddPersonRequest
```

### Add Sample Data
```
POST /api/dha/data/add-sample-data?count=10
```

### Get Person
```
GET /api/dha/data/person/{idNumber}
```

## Troubleshooting

### Connection Issues

1. **Verify SQL Server is running**
   - Check SQL Server service status
   - Ensure SQL Server Browser service is running (for named instances)

2. **Check connection string**
   - Verify server name matches your instance
   - For default instance: `localhost` or `.`
   - For named instance: `localhost\INSTANCENAME`

3. **Check database exists**
   - Verify `DHA_Mock` database was created
   - Check database permissions

### Permission Issues

If you encounter permission errors:
- Ensure your Windows account has access to SQL Server
- Or use SQL Server authentication and update connection string:
  ```
  Data Source=localhost\SQLEXPRESS;Initial Catalog=DHA_Mock;User Id=sa;Password=yourpassword;TrustServerCertificate=True
  ```

## Next Steps

After setting up the database:
1. Test the connection using the test endpoint
2. Add sample data using the add-sample-data endpoint
3. Verify data was added by querying the People table in SSMS
4. Test verification endpoints to see database integration
