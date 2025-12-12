-- =============================================
-- MULTI-SETA ID VERIFICATION SCHEMA
-- Version: 1.0
-- Date: December 2025
-- Description: Database schema for the Multi-SETA
--              ID Verification & Duplicate Detection System
-- Designed for adoption by all 21 South African SETAs
-- =============================================

-- Create Database (run separately if needed)
-- CREATE DATABASE SETA_IDVerification;
-- GO
-- USE SETA_IDVerification;
-- GO

-- =============================================
-- TABLE: SETAs
-- Purpose: Master table for all 21 South African SETAs
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SETAs')
BEGIN
    CREATE TABLE SETAs (
        SETAID INT IDENTITY(1,1) PRIMARY KEY,
        SETACode VARCHAR(10) NOT NULL UNIQUE,
        SETAName NVARCHAR(200) NOT NULL,
        Sector NVARCHAR(200),
        IsActive BIT DEFAULT 1,
        CreatedDate DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table SETAs created successfully.';
END
GO

-- =============================================
-- SEED DATA: All 21 South African SETAs
-- =============================================
IF NOT EXISTS (SELECT * FROM SETAs)
BEGIN
    INSERT INTO SETAs (SETACode, SETAName, Sector) VALUES
    ('WRSETA', 'Wholesale & Retail SETA', 'Wholesale and Retail'),
    ('MICT', 'Media, ICT and Electronics SETA', 'ICT and Electronics'),
    ('SERVICES', 'Services SETA', 'Services Sector'),
    ('CETA', 'Construction Education & Training Authority', 'Construction'),
    ('CHIETA', 'Chemical Industries Education & Training Authority', 'Chemical'),
    ('ETDP', 'Education, Training and Development Practices SETA', 'Education'),
    ('EWSETA', 'Energy and Water SETA', 'Energy and Water'),
    ('FASSET', 'Financial and Accounting Services SETA', 'Finance'),
    ('FOODBEV', 'Food and Beverages Manufacturing SETA', 'Food and Beverage'),
    ('FPM', 'Fibre Processing and Manufacturing SETA', 'Fibre Processing'),
    ('HWSETA', 'Health and Welfare SETA', 'Health'),
    ('INSETA', 'Insurance SETA', 'Insurance'),
    ('LGSETA', 'Local Government SETA', 'Local Government'),
    ('MERSETA', 'Manufacturing, Engineering and Related Services SETA', 'Manufacturing'),
    ('MQA', 'Mining Qualifications Authority', 'Mining'),
    ('PSETA', 'Public Service SETA', 'Public Service'),
    ('SASSETA', 'Safety and Security SETA', 'Safety and Security'),
    ('AgriSETA', 'Agricultural SETA', 'Agriculture'),
    ('CATHSSETA', 'Culture, Arts, Tourism, Hospitality and Sport SETA', 'Tourism'),
    ('TETA', 'Transport Education Training Authority', 'Transport'),
    ('BANKSETA', 'Banking Sector Education and Training Authority', 'Banking');

    PRINT 'Seed data inserted: 21 SETAs added.';
END
GO

-- =============================================
-- TABLE: LearnerRegistry
-- Purpose: Central registry of all learners across all SETAs
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerRegistry')
BEGIN
    CREATE TABLE LearnerRegistry (
        LearnerID INT IDENTITY(1,1) PRIMARY KEY,
        IDNumber VARCHAR(13) NOT NULL,
        IDNumberHash VARCHAR(64) NOT NULL,           -- SHA-256 hash for privacy-preserving lookups
        FirstName NVARCHAR(100),
        Surname NVARCHAR(100),
        DateOfBirth DATE,
        Gender VARCHAR(10),
        RegisteredSETAID INT NOT NULL,               -- Which SETA registered this learner
        ProgrammeName NVARCHAR(200),
        RegistrationDate DATETIME DEFAULT GETDATE(),
        Status VARCHAR(20) DEFAULT 'Active',         -- Active/Completed/Withdrawn
        CreatedBy NVARCHAR(100),
        CONSTRAINT FK_Learner_SETA FOREIGN KEY (RegisteredSETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table LearnerRegistry created successfully.';
END
GO

-- =============================================
-- TABLE: VerificationLog
-- Purpose: Records every ID verification attempt with results
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VerificationLog')
BEGIN
    CREATE TABLE VerificationLog (
        VerificationID INT IDENTITY(1,1) PRIMARY KEY,
        RequestingSETAID INT NOT NULL,               -- Which SETA requested the verification
        IDNumber VARCHAR(13) NOT NULL,
        FirstName NVARCHAR(100),
        Surname NVARCHAR(100),
        Status VARCHAR(10) NOT NULL,                 -- GREEN/YELLOW/RED
        StatusReason NVARCHAR(500),
        FormatValid BIT DEFAULT 0,
        LuhnValid BIT DEFAULT 0,
        DHAVerified BIT DEFAULT 0,
        DuplicateFound BIT DEFAULT 0,
        ConflictingSETAID INT NULL,                  -- If duplicate found, which SETA has the conflict
        VerifiedAt DATETIME DEFAULT GETDATE(),
        VerifiedBy NVARCHAR(100),
        CONSTRAINT FK_Verification_SETA FOREIGN KEY (RequestingSETAID) REFERENCES SETAs(SETAID),
        CONSTRAINT FK_Verification_Conflict FOREIGN KEY (ConflictingSETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table VerificationLog created successfully.';
END
GO

-- =============================================
-- TABLE: DuplicateAttempts
-- Purpose: Tracks cross-SETA "double-dip" registration attempts
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DuplicateAttempts')
BEGIN
    CREATE TABLE DuplicateAttempts (
        AttemptID INT IDENTITY(1,1) PRIMARY KEY,
        IDNumber VARCHAR(13) NOT NULL,
        AttemptedName NVARCHAR(200),
        AttemptingSETAID INT NOT NULL,               -- SETA trying to register this learner
        ExistingSETAID INT NOT NULL,                 -- SETA that already has this learner
        ExistingLearnerID INT NULL,
        AttemptDate DATETIME DEFAULT GETDATE(),
        Blocked BIT DEFAULT 1,
        ResolutionStatus VARCHAR(20) DEFAULT 'Pending', -- Pending/Resolved/Escalated
        ResolvedBy NVARCHAR(100) NULL,
        ResolvedDate DATETIME NULL,
        ResolutionNotes NVARCHAR(500) NULL,
        CONSTRAINT FK_Attempt_Requesting FOREIGN KEY (AttemptingSETAID) REFERENCES SETAs(SETAID),
        CONSTRAINT FK_Attempt_Existing FOREIGN KEY (ExistingSETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table DuplicateAttempts created successfully.';
END
GO

-- =============================================
-- TABLE: AuditTrail
-- Purpose: POPIA compliance - logs all PII access and actions
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditTrail')
BEGIN
    CREATE TABLE AuditTrail (
        AuditID INT IDENTITY(1,1) PRIMARY KEY,
        SETAID INT NOT NULL,
        Action VARCHAR(50) NOT NULL,                 -- Verify/Register/Export/Login/View/Update
        TableAffected VARCHAR(50),
        RecordID INT NULL,
        IDNumber VARCHAR(13) NULL,                   -- Masked in reports
        Details NVARCHAR(MAX),
        UserID NVARCHAR(100),
        IPAddress VARCHAR(45),
        ActionDate DATETIME DEFAULT GETDATE(),
        Success BIT DEFAULT 1,
        CONSTRAINT FK_Audit_SETA FOREIGN KEY (SETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table AuditTrail created successfully.';
END
GO

-- =============================================
-- TABLE: Users (Basic authentication)
-- Purpose: Store user accounts for each SETA
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash VARCHAR(64) NOT NULL,           -- SHA-256 hashed password
        FirstName NVARCHAR(100),
        Surname NVARCHAR(100),
        Email NVARCHAR(200),
        SETAID INT NOT NULL,
        Role VARCHAR(20) DEFAULT 'Clerk',            -- Admin/Clerk/Auditor
        IsActive BIT DEFAULT 1,
        LastLogin DATETIME NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_User_SETA FOREIGN KEY (SETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table Users created successfully.';
END
GO

-- =============================================
-- INDEXES: Performance optimization
-- =============================================
-- Index for fast ID number lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearnerRegistry_IDNumber')
BEGIN
    CREATE INDEX IX_LearnerRegistry_IDNumber ON LearnerRegistry(IDNumber);
    PRINT 'Index IX_LearnerRegistry_IDNumber created.';
END
GO

-- Index for hash-based lookups (privacy-preserving)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearnerRegistry_Hash')
BEGIN
    CREATE INDEX IX_LearnerRegistry_Hash ON LearnerRegistry(IDNumberHash);
    PRINT 'Index IX_LearnerRegistry_Hash created.';
END
GO

-- Index for verification log queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VerificationLog_IDNumber')
BEGIN
    CREATE INDEX IX_VerificationLog_IDNumber ON VerificationLog(IDNumber);
    PRINT 'Index IX_VerificationLog_IDNumber created.';
END
GO

-- Index for SETA-specific queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VerificationLog_SETA')
BEGIN
    CREATE INDEX IX_VerificationLog_SETA ON VerificationLog(RequestingSETAID);
    PRINT 'Index IX_VerificationLog_SETA created.';
END
GO

-- Index for duplicate attempt lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DuplicateAttempts_IDNumber')
BEGIN
    CREATE INDEX IX_DuplicateAttempts_IDNumber ON DuplicateAttempts(IDNumber);
    PRINT 'Index IX_DuplicateAttempts_IDNumber created.';
END
GO

-- Index for audit trail date range queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditTrail_Date')
BEGIN
    CREATE INDEX IX_AuditTrail_Date ON AuditTrail(ActionDate);
    PRINT 'Index IX_AuditTrail_Date created.';
END
GO

-- =============================================
-- SEED DATA: Default admin user for W&RSETA (for demo)
-- Password: admin123 (hashed with SHA-256)
-- =============================================
IF NOT EXISTS (SELECT * FROM Users WHERE Username = 'admin')
BEGIN
    INSERT INTO Users (Username, PasswordHash, FirstName, Surname, Email, SETAID, Role)
    VALUES ('admin',
            '240BE518FABD2724DDB6F04EEB1DA5967448D7E831C08C8FA822809F74C720A9', -- SHA256('admin123')
            'System',
            'Administrator',
            'admin@wrseta.org.za',
            (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA'),
            'Admin');
    PRINT 'Default admin user created for W&RSETA.';
END
GO

-- =============================================
-- SAMPLE DATA: Test learners for W&RSETA (Tenant 1)
-- =============================================
DECLARE @WRSETA_ID INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');
DECLARE @MICT_ID INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'MICT');
DECLARE @SERVICES_ID INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'SERVICES');

-- Only insert if no learners exist
IF NOT EXISTS (SELECT * FROM LearnerRegistry)
BEGIN
    -- =============================================
    -- W&RSETA LEARNERS (Tenant 1) - Primary test data
    -- =============================================
    INSERT INTO LearnerRegistry
        (IDNumber, IDNumberHash, FirstName, Surname, DateOfBirth, Gender,
         RegisteredSETAID, ProgrammeName, LearnershipCode, LearnershipName,
         ProvinceCode, EnrollmentYear, Status, CreatedBy, RegistrationDate)
    VALUES
    -- Learner 1: Thabo Mokoena - Retail Management in Gauteng
    ('8506155012089',
     HASHBYTES('SHA2_256', '8506155012089'),
     'Thabo', 'Mokoena', '1985-06-15', 'Male',
     @WRSETA_ID, 'Retail Management Learnership', 'SAQA-49648', 'NQF 5 Retail Management',
     'GP', 2025, 'Active', 'admin', '2025-01-15'),

    -- Learner 2: Sipho Ndlovu - Wholesale Operations in Gauteng
    ('9001015800085',
     HASHBYTES('SHA2_256', '9001015800085'),
     'Sipho', 'Ndlovu', '1990-01-01', 'Male',
     @WRSETA_ID, 'Wholesale Operations Learnership', 'SAQA-49649', 'NQF 4 Wholesale Operations',
     'GP', 2025, 'Active', 'admin', '2025-01-20'),

    -- Learner 3: Nomsa Dlamini - Retail Management in Western Cape (different province)
    ('9205230145087',
     HASHBYTES('SHA2_256', '9205230145087'),
     'Nomsa', 'Dlamini', '1992-05-23', 'Female',
     @WRSETA_ID, 'Retail Management Learnership', 'SAQA-49648', 'NQF 5 Retail Management',
     'WC', 2025, 'Active', 'admin', '2025-02-01'),

    -- Learner 4: John van der Merwe - Supply Chain in KwaZulu-Natal
    ('8812115023084',
     HASHBYTES('SHA2_256', '8812115023084'),
     'John', 'van der Merwe', '1988-12-11', 'Male',
     @WRSETA_ID, 'Supply Chain Management', 'SAQA-49650', 'NQF 5 Supply Chain Management',
     'KZN', 2025, 'Active', 'admin', '2025-02-10'),

    -- Learner 5: Lerato Molefe - Customer Service in Gauteng
    ('9507185044082',
     HASHBYTES('SHA2_256', '9507185044082'),
     'Lerato', 'Molefe', '1995-07-18', 'Female',
     @WRSETA_ID, 'Customer Service Excellence', 'SAQA-49651', 'NQF 3 Customer Service',
     'GP', 2025, 'Active', 'admin', '2025-02-15'),

    -- Learner 6: Peter Nkosi - Retail Management in Gauteng (2024 enrollment - previous year)
    ('8709105028083',
     HASHBYTES('SHA2_256', '8709105028083'),
     'Peter', 'Nkosi', '1987-09-10', 'Male',
     @WRSETA_ID, 'Retail Management Learnership', 'SAQA-49648', 'NQF 5 Retail Management',
     'GP', 2024, 'Completed', 'admin', '2024-03-01'),

    -- Learner 7: Maria Santos - Store Operations in Eastern Cape
    ('9103245087081',
     HASHBYTES('SHA2_256', '9103245087081'),
     'Maria', 'Santos', '1991-03-24', 'Female',
     @WRSETA_ID, 'Store Operations Management', 'SAQA-49652', 'NQF 4 Store Operations',
     'EC', 2025, 'Active', 'admin', '2025-03-01'),

    -- Learner 8: David Botha - Wholesale Operations in Free State
    ('9408125037089',
     HASHBYTES('SHA2_256', '9408125037089'),
     'David', 'Botha', '1994-08-12', 'Male',
     @WRSETA_ID, 'Wholesale Operations Learnership', 'SAQA-49649', 'NQF 4 Wholesale Operations',
     'FS', 2025, 'Active', 'admin', '2025-03-05'),

    -- =============================================
    -- MICT SETA LEARNER (Tenant 2) - For duplicate testing
    -- =============================================
    -- Learner at MICT: Sarah Khumalo - IT Support
    ('8803125678081',
     HASHBYTES('SHA2_256', '8803125678081'),
     'Sarah', 'Khumalo', '1988-03-12', 'Female',
     @MICT_ID, 'IT Support Learnership', 'SAQA-48872', 'NQF 4 IT Support',
     'GP', 2025, 'Active', 'admin', '2025-01-10'),

    -- =============================================
    -- SERVICES SETA LEARNER (Tenant 3) - For cross-SETA duplicate testing
    -- This learner (Thabo Mokoena) is ALSO at WRSETA - tests cross-SETA detection
    -- =============================================
    -- Duplicate test: Same person different SETA different learnership (ALLOWED)
    ('8506155012089',
     HASHBYTES('SHA2_256', '8506155012089'),
     'Thabo', 'Mokoena', '1985-06-15', 'Male',
     @SERVICES_ID, 'Business Administration', 'SAQA-61595', 'NQF 4 Business Admin',
     'GP', 2025, 'Active', 'admin', '2025-02-20');

    PRINT 'Sample learner data inserted: 8 W&RSETA learners, 1 MICT learner, 1 SERVICES learner.';
END
GO

-- =============================================
-- SAMPLE DATA: Populate LearnerEnrollmentIndex from LearnerRegistry
-- This ensures the global duplicate detection index is populated
-- =============================================
IF NOT EXISTS (SELECT * FROM LearnerEnrollmentIndex)
BEGIN
    INSERT INTO LearnerEnrollmentIndex
        (IDNumberHash, LearnershipCode, RegisteredSETAID, EnrollmentYear, ProvinceCode, RegistrationDate, IsActive)
    SELECT
        HASHBYTES('SHA2_256', IDNumber),
        ISNULL(LearnershipCode, 'UNKNOWN'),
        RegisteredSETAID,
        ISNULL(EnrollmentYear, YEAR(RegistrationDate)),
        ISNULL(ProvinceCode, 'GP'),
        RegistrationDate,
        CASE WHEN Status = 'Active' THEN 1 ELSE 0 END
    FROM LearnerRegistry
    WHERE LearnershipCode IS NOT NULL;

    PRINT 'LearnerEnrollmentIndex populated from LearnerRegistry.';
END
GO

-- =============================================
-- SAMPLE DATA: Populate LearnerIDIndex for cross-SETA duplicate detection
-- =============================================
IF NOT EXISTS (SELECT * FROM LearnerIDIndex)
BEGIN
    -- Insert unique ID numbers (first registration wins)
    INSERT INTO LearnerIDIndex (IDNumberHash, RegisteredSETAID, RegistrationDate, IsActive)
    SELECT
        HASHBYTES('SHA2_256', lr.IDNumber),
        lr.RegisteredSETAID,
        lr.RegistrationDate,
        1
    FROM LearnerRegistry lr
    INNER JOIN (
        SELECT IDNumber, MIN(RegistrationDate) AS FirstRegistration
        FROM LearnerRegistry
        GROUP BY IDNumber
    ) first ON lr.IDNumber = first.IDNumber AND lr.RegistrationDate = first.FirstRegistration;

    PRINT 'LearnerIDIndex populated with unique learner IDs.';
END
GO

-- =============================================
-- SAMPLE DATA: Verification Log entries for W&RSETA
-- =============================================
IF NOT EXISTS (SELECT * FROM VerificationLog WHERE RequestingSETAID = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA'))
BEGIN
    DECLARE @WRSETA_VL INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');

    INSERT INTO VerificationLog
        (RequestingSETAID, IDNumber, IDNumberHash, FirstName, Surname, Status, StatusReason, Message,
         FormatValid, LuhnValid, DHAVerified, DuplicateFound, VerifiedAt, VerifiedBy)
    VALUES
    -- GREEN verifications
    (@WRSETA_VL, '8506155012089', HASHBYTES('SHA2_256', '8506155012089'), 'Thabo', 'Mokoena',
     'GREEN', 'Identity verified', 'Identity verified successfully', 1, 1, 1, 0, '2025-01-15 09:30:00', 'admin'),

    (@WRSETA_VL, '9001015800085', HASHBYTES('SHA2_256', '9001015800085'), 'Sipho', 'Ndlovu',
     'GREEN', 'Identity verified', 'Identity verified successfully', 1, 1, 1, 0, '2025-01-20 10:15:00', 'admin'),

    (@WRSETA_VL, '9205230145087', HASHBYTES('SHA2_256', '9205230145087'), 'Nomsa', 'Dlamini',
     'GREEN', 'Identity verified', 'Identity verified successfully', 1, 1, 1, 0, '2025-02-01 11:00:00', 'admin'),

    -- YELLOW verification (DHA pending)
    (@WRSETA_VL, '9408125037089', HASHBYTES('SHA2_256', '9408125037089'), 'David', 'Botha',
     'YELLOW', 'DHA verification pending', 'ID format valid but DHA verification pending', 1, 1, 0, 0, '2025-03-05 14:30:00', 'admin'),

    -- RED verifications (invalid/duplicate)
    (@WRSETA_VL, '1234567890123', HASHBYTES('SHA2_256', '1234567890123'), 'Test', 'Invalid',
     'RED', 'Luhn check failed', 'Invalid ID number. Checksum validation failed.', 1, 0, 0, 0, '2025-01-25 15:00:00', 'admin'),

    (@WRSETA_VL, '0000000000000', HASHBYTES('SHA2_256', '0000000000000'), 'Fake', 'Person',
     'RED', 'Invalid format', 'Invalid ID format. Must be exactly 13 digits.', 0, 0, 0, 0, '2025-02-10 09:00:00', 'admin');

    PRINT 'Sample verification log entries inserted for W&RSETA.';
END
GO

-- =============================================
-- STORED PROCEDURE: Check for duplicates across SETAs
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CheckCrossSETADuplicate')
    DROP PROCEDURE sp_CheckCrossSETADuplicate;
GO

CREATE PROCEDURE sp_CheckCrossSETADuplicate
    @IDNumber VARCHAR(13),
    @RequestingSETAID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        l.LearnerID,
        l.IDNumber,
        l.FirstName,
        l.Surname,
        l.RegisteredSETAID,
        s.SETACode,
        s.SETAName,
        l.ProgrammeName,
        l.RegistrationDate,
        l.Status
    FROM LearnerRegistry l
    INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID
    WHERE l.IDNumber = @IDNumber
      AND l.RegisteredSETAID != @RequestingSETAID
      AND l.Status = 'Active';
END
GO

PRINT 'Stored procedure sp_CheckCrossSETADuplicate created.';
GO

-- =============================================
-- STORED PROCEDURE: Get dashboard statistics
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetDashboardStats')
    DROP PROCEDURE sp_GetDashboardStats;
GO

CREATE PROCEDURE sp_GetDashboardStats
    @SETAID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Total learners for this SETA
    SELECT
        (SELECT COUNT(*) FROM LearnerRegistry WHERE RegisteredSETAID = @SETAID) AS TotalLearners,
        (SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'GREEN') AS VerifiedGreen,
        (SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'YELLOW') AS VerifiedYellow,
        (SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'RED') AS VerifiedRed,
        (SELECT COUNT(*) FROM DuplicateAttempts WHERE AttemptingSETAID = @SETAID AND Blocked = 1) AS BlockedAttempts;
END
GO

PRINT 'Stored procedure sp_GetDashboardStats created.';
GO

-- =============================================
-- TABLE: LearnerEnrollmentIndex (GLOBAL - NOT PARTITIONED)
-- Purpose: Cross-SETA enrollment duplicate detection
-- Contains NO PII (only ID hashes) - POPIA compliant
-- Shared by ALL 21 SETAs for duplicate detection
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerEnrollmentIndex')
BEGIN
    CREATE TABLE LearnerEnrollmentIndex (
        IDNumberHash        VARBINARY(32)   NOT NULL,   -- SHA256 of ID Number
        LearnershipCode     VARCHAR(20)     NOT NULL,   -- e.g., "SAQA-12345"
        RegisteredSETAID    INT             NOT NULL,   -- Which SETA enrolled this learner
        EnrollmentYear      INT             NOT NULL,   -- Financial year (2024, 2025, etc.)
        ProvinceCode        VARCHAR(3)      NOT NULL,   -- GP, WC, KZN, EC, etc.
        RegistrationDate    DATETIME        NOT NULL DEFAULT GETDATE(),
        IsActive            BIT             NOT NULL DEFAULT 1,

        -- COMPOSITE KEY: Unique enrollment = ID + Learnership + SETA + Year + Province
        CONSTRAINT PK_LearnerEnrollment PRIMARY KEY CLUSTERED
            (IDNumberHash, LearnershipCode, RegisteredSETAID, EnrollmentYear, ProvinceCode),

        CONSTRAINT FK_LearnerEnrollment_SETA FOREIGN KEY (RegisteredSETAID)
            REFERENCES SETAs(SETAID)
    );
    PRINT 'Table LearnerEnrollmentIndex created successfully.';
END
GO

-- Fast lookup: "Is this learner enrolled in this learnership anywhere this year?"
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearnerEnrollment_Lookup')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LearnerEnrollment_Lookup
        ON LearnerEnrollmentIndex(IDNumberHash, LearnershipCode, EnrollmentYear)
        INCLUDE (RegisteredSETAID, ProvinceCode, IsActive);
    PRINT 'Index IX_LearnerEnrollment_Lookup created.';
END
GO

-- Dashboard: Enrollments per SETA per year
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearnerEnrollment_SETA_Year')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LearnerEnrollment_SETA_Year
        ON LearnerEnrollmentIndex(RegisteredSETAID, EnrollmentYear, IsActive);
    PRINT 'Index IX_LearnerEnrollment_SETA_Year created.';
END
GO

-- =============================================
-- TABLE: ApiKeys
-- Purpose: API authentication for LMS/external system integrations
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApiKeys')
BEGIN
    CREATE TABLE ApiKeys (
        ApiKeyID INT IDENTITY(1,1) PRIMARY KEY,
        ApiKeyHash VARCHAR(64) NOT NULL UNIQUE,         -- SHA-256 hash of the actual API key
        KeyName NVARCHAR(100) NOT NULL,                 -- "LMS System", "HR Portal", etc.
        SETAID INT NOT NULL,
        IsActive BIT DEFAULT 1,
        RateLimit INT DEFAULT 1000,                     -- Requests per hour
        CreatedDate DATETIME DEFAULT GETDATE(),
        ExpiresDate DATETIME NULL,
        LastUsedDate DATETIME NULL,
        CONSTRAINT FK_ApiKey_SETA FOREIGN KEY (SETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table ApiKeys created successfully.';
END
GO

-- Index for fast API key lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ApiKeys_Hash')
BEGIN
    CREATE INDEX IX_ApiKeys_Hash ON ApiKeys(ApiKeyHash) WHERE IsActive = 1;
    PRINT 'Index IX_ApiKeys_Hash created.';
END
GO

-- =============================================
-- TABLE: ApiRequestLog
-- Purpose: Log all API requests for monitoring and rate limiting
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApiRequestLog')
BEGIN
    CREATE TABLE ApiRequestLog (
        LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
        ApiKeyID INT NOT NULL,
        Endpoint VARCHAR(200),
        Method VARCHAR(10),                             -- GET, POST, PUT, DELETE
        RequestBody NVARCHAR(MAX),                      -- JSON request (PII masked)
        ResponseStatus INT,                             -- HTTP status code
        ResponseTime INT,                               -- Milliseconds
        IPAddress VARCHAR(45),
        RequestedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ApiLog_Key FOREIGN KEY (ApiKeyID) REFERENCES ApiKeys(ApiKeyID)
    );
    PRINT 'Table ApiRequestLog created successfully.';
END
GO

-- Index for rate limiting queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ApiRequestLog_KeyDate')
BEGIN
    CREATE INDEX IX_ApiRequestLog_KeyDate ON ApiRequestLog(ApiKeyID, RequestedAt);
    PRINT 'Index IX_ApiRequestLog_KeyDate created.';
END
GO

-- =============================================
-- TABLE: Provinces (Lookup table)
-- Purpose: South African provinces for enrollment tracking
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Provinces')
BEGIN
    CREATE TABLE Provinces (
        ProvinceCode VARCHAR(3) PRIMARY KEY,
        ProvinceName NVARCHAR(50) NOT NULL
    );

    INSERT INTO Provinces (ProvinceCode, ProvinceName) VALUES
    ('GP', 'Gauteng'),
    ('WC', 'Western Cape'),
    ('KZN', 'KwaZulu-Natal'),
    ('EC', 'Eastern Cape'),
    ('FS', 'Free State'),
    ('LP', 'Limpopo'),
    ('MP', 'Mpumalanga'),
    ('NC', 'Northern Cape'),
    ('NW', 'North West');

    PRINT 'Table Provinces created and seeded.';
END
GO

-- =============================================
-- UPDATE LearnerRegistry: Add learnership and province columns
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'LearnershipCode')
BEGIN
    ALTER TABLE LearnerRegistry ADD LearnershipCode VARCHAR(20) NULL;
    PRINT 'Column LearnershipCode added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'ProvinceCode')
BEGIN
    ALTER TABLE LearnerRegistry ADD ProvinceCode VARCHAR(3) NULL;
    PRINT 'Column ProvinceCode added to LearnerRegistry.';
END
GO

-- =============================================
-- STORED PROCEDURE: Check for Enrollment Duplicate
-- Business Rules:
-- 1. Same learnership + Same SETA + Same province + Same year = BLOCKED
-- 2. Same learnership + Different SETA + Same year = BLOCKED
-- 3. Same learnership + Same SETA + Different province + Same year = ALLOWED
-- 4. Different learnership = ALLOWED
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CheckEnrollmentDuplicate')
    DROP PROCEDURE sp_CheckEnrollmentDuplicate;
GO

CREATE PROCEDURE sp_CheckEnrollmentDuplicate
    @IDNumber           VARCHAR(13),
    @LearnershipCode    VARCHAR(20),
    @RequestingSETA     INT,
    @EnrollmentYear     INT,
    @Province           VARCHAR(3)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IDHash VARBINARY(32) = HASHBYTES('SHA2_256', @IDNumber);
    DECLARE @Decision VARCHAR(20) = 'ALLOWED';
    DECLARE @DuplicateType VARCHAR(50) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;

    -- Check 1: Same learnership, same SETA, same province, same year = BLOCKED
    IF EXISTS (
        SELECT 1 FROM LearnerEnrollmentIndex
        WHERE IDNumberHash = @IDHash
          AND LearnershipCode = @LearnershipCode
          AND RegisteredSETAID = @RequestingSETA
          AND EnrollmentYear = @EnrollmentYear
          AND ProvinceCode = @Province
          AND IsActive = 1
    )
    BEGIN
        SET @Decision = 'BLOCKED';
        SET @DuplicateType = 'SAME_SETA_SAME_PROVINCE';
        SET @Message = 'Learner already enrolled in this learnership at this SETA in this province';

        SELECT
            @Decision AS Decision,
            @DuplicateType AS DuplicateType,
            @Message AS Message,
            idx.RegisteredSETAID, s.SETACode, s.SETAName,
            idx.LearnershipCode, idx.EnrollmentYear, idx.ProvinceCode, idx.RegistrationDate
        FROM LearnerEnrollmentIndex idx
        INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
        WHERE idx.IDNumberHash = @IDHash
          AND idx.LearnershipCode = @LearnershipCode
          AND idx.RegisteredSETAID = @RequestingSETA
          AND idx.EnrollmentYear = @EnrollmentYear
          AND idx.ProvinceCode = @Province;
        RETURN;
    END

    -- Check 2: Same learnership at DIFFERENT SETA in same financial year = BLOCKED
    IF EXISTS (
        SELECT 1 FROM LearnerEnrollmentIndex
        WHERE IDNumberHash = @IDHash
          AND LearnershipCode = @LearnershipCode
          AND RegisteredSETAID <> @RequestingSETA  -- Different SETA
          AND EnrollmentYear = @EnrollmentYear
          AND IsActive = 1
    )
    BEGIN
        SET @Decision = 'BLOCKED';
        SET @DuplicateType = 'DIFFERENT_SETA_SAME_YEAR';
        SET @Message = 'Learner already enrolled in this learnership at another SETA this year';

        SELECT
            @Decision AS Decision,
            @DuplicateType AS DuplicateType,
            @Message AS Message,
            idx.RegisteredSETAID, s.SETACode, s.SETAName,
            idx.LearnershipCode, idx.EnrollmentYear, idx.ProvinceCode, idx.RegistrationDate
        FROM LearnerEnrollmentIndex idx
        INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
        WHERE idx.IDNumberHash = @IDHash
          AND idx.LearnershipCode = @LearnershipCode
          AND idx.RegisteredSETAID <> @RequestingSETA
          AND idx.EnrollmentYear = @EnrollmentYear
          AND idx.IsActive = 1;
        RETURN;
    END

    -- Check 3: Same learnership, same SETA, DIFFERENT province = ALLOWED (return info)
    IF EXISTS (
        SELECT 1 FROM LearnerEnrollmentIndex
        WHERE IDNumberHash = @IDHash
          AND LearnershipCode = @LearnershipCode
          AND RegisteredSETAID = @RequestingSETA
          AND EnrollmentYear = @EnrollmentYear
          AND ProvinceCode <> @Province
          AND IsActive = 1
    )
    BEGIN
        SET @Decision = 'ALLOWED';
        SET @DuplicateType = 'DIFFERENT_PROVINCE';
        SET @Message = 'Learner can enroll in different province';

        SELECT
            @Decision AS Decision,
            @DuplicateType AS DuplicateType,
            @Message AS Message,
            idx.RegisteredSETAID, s.SETACode, s.SETAName,
            idx.LearnershipCode, idx.EnrollmentYear,
            idx.ProvinceCode AS ExistingProvince,
            @Province AS NewProvince,
            idx.RegistrationDate
        FROM LearnerEnrollmentIndex idx
        INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
        WHERE idx.IDNumberHash = @IDHash
          AND idx.LearnershipCode = @LearnershipCode
          AND idx.RegisteredSETAID = @RequestingSETA
          AND idx.EnrollmentYear = @EnrollmentYear
          AND idx.ProvinceCode <> @Province
          AND idx.IsActive = 1;
        RETURN;
    END

    -- No duplicates found = GREEN light for new enrollment
    SELECT
        'ALLOWED' AS Decision,
        'NEW_ENROLLMENT' AS DuplicateType,
        'No existing enrollment found - proceed with registration' AS Message;
END
GO

PRINT 'Stored procedure sp_CheckEnrollmentDuplicate created.';
GO

-- =============================================
-- TRIGGER: Auto-populate LearnerEnrollmentIndex when learner registered
-- =============================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_LearnerRegistry_InsertEnrollment')
    DROP TRIGGER TR_LearnerRegistry_InsertEnrollment;
GO

CREATE TRIGGER TR_LearnerRegistry_InsertEnrollment
ON LearnerRegistry
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO LearnerEnrollmentIndex
        (IDNumberHash, LearnershipCode, RegisteredSETAID, EnrollmentYear, ProvinceCode, RegistrationDate)
    SELECT
        HASHBYTES('SHA2_256', i.IDNumber),
        ISNULL(i.LearnershipCode, 'UNKNOWN'),
        i.RegisteredSETAID,
        YEAR(i.RegistrationDate),
        ISNULL(i.ProvinceCode, 'GP'),  -- Default to Gauteng if not specified
        i.RegistrationDate
    FROM inserted i
    WHERE i.LearnershipCode IS NOT NULL;  -- Only insert if learnership specified
END
GO

PRINT 'Trigger TR_LearnerRegistry_InsertEnrollment created.';
GO

-- =============================================
-- SEED DATA: Default API Key for W&RSETA LMS (for testing)
-- API Key: wrseta-lms-key-2025 (hashed)
-- =============================================
DECLARE @WRSETA_ID INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'W&RSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit)
    VALUES (
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'wrseta-lms-key-2025'), 2),
        'W&RSETA LMS Integration',
        @WRSETA_ID,
        5000  -- Higher rate limit for LMS
    );
    PRINT 'Default API key created for W&RSETA LMS.';
END
GO

-- =============================================
-- TABLE: ApiUsers
-- Purpose: API service account users for LMS integrations
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApiUsers')
BEGIN
    CREATE TABLE ApiUsers (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash VARCHAR(64) NOT NULL,           -- SHA-256 hashed password
        SETAID INT NOT NULL,
        IsActive BIT DEFAULT 1,
        LastLogin DATETIME NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ApiUser_SETA FOREIGN KEY (SETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table ApiUsers created successfully.';
END
GO

-- Seed default API user for W&RSETA LMS
DECLARE @WRSETA_ID_User INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');
IF NOT EXISTS (SELECT * FROM ApiUsers WHERE Username = 'lms_wrseta')
BEGIN
    INSERT INTO ApiUsers (Username, PasswordHash, SETAID)
    VALUES (
        'lms_wrseta',
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'LmsPassword2025!'), 2),
        @WRSETA_ID_User
    );
    PRINT 'Default API user created for W&RSETA LMS (username: lms_wrseta, password: LmsPassword2025!).';
END
GO

-- =============================================
-- TABLE: RefreshTokens
-- Purpose: Store JWT refresh tokens for API authentication
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RefreshTokens')
BEGIN
    CREATE TABLE RefreshTokens (
        TokenID INT IDENTITY(1,1) PRIMARY KEY,
        SETAID INT NOT NULL,
        UserID INT NULL,
        Username NVARCHAR(100) NOT NULL,
        RefreshToken VARCHAR(100) NOT NULL UNIQUE,
        ExpiresAt DATETIME NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        IsRevoked BIT DEFAULT 0,
        CONSTRAINT FK_RefreshToken_SETA FOREIGN KEY (SETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table RefreshTokens created successfully.';
END
GO

-- Index for fast refresh token lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RefreshTokens_Token')
BEGIN
    CREATE INDEX IX_RefreshTokens_Token ON RefreshTokens(RefreshToken) WHERE IsRevoked = 0;
    PRINT 'Index IX_RefreshTokens_Token created.';
END
GO

-- =============================================
-- UPDATE LearnerRegistry: Add additional columns
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'EnrollmentID')
BEGIN
    ALTER TABLE LearnerRegistry ADD EnrollmentID VARCHAR(20) NULL;
    PRINT 'Column EnrollmentID added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'LearnershipName')
BEGIN
    ALTER TABLE LearnerRegistry ADD LearnershipName NVARCHAR(200) NULL;
    PRINT 'Column LearnershipName added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'EnrollmentYear')
BEGIN
    ALTER TABLE LearnerRegistry ADD EnrollmentYear INT NULL;
    PRINT 'Column EnrollmentYear added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'CreatedAt')
BEGIN
    ALTER TABLE LearnerRegistry ADD CreatedAt DATETIME NULL DEFAULT GETDATE();
    PRINT 'Column CreatedAt added to LearnerRegistry.';
END
GO

-- Update IDNumberHash column to VARBINARY if it's VARCHAR
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'IDNumberHash' AND system_type_id = 167)
BEGIN
    -- Create a new column with correct type
    ALTER TABLE LearnerRegistry ADD IDNumberHashNew VARBINARY(32) NULL;
    PRINT 'Column IDNumberHashNew (VARBINARY) added to LearnerRegistry for migration.';
END
GO

-- =============================================
-- UPDATE VerificationLog: Add Message column if missing
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VerificationLog') AND name = 'Message')
BEGIN
    ALTER TABLE VerificationLog ADD Message NVARCHAR(500) NULL;
    PRINT 'Column Message added to VerificationLog.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VerificationLog') AND name = 'IDNumberHash')
BEGIN
    ALTER TABLE VerificationLog ADD IDNumberHash VARBINARY(32) NULL;
    PRINT 'Column IDNumberHash added to VerificationLog.';
END
GO

-- Index for VerificationLog hash lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VerificationLog_IDHash')
BEGIN
    CREATE INDEX IX_VerificationLog_IDHash ON VerificationLog(IDNumberHash);
    PRINT 'Index IX_VerificationLog_IDHash created.';
END
GO

-- =============================================
-- TABLE: LearnerIDIndex (Global - for cross-SETA duplicate ID check)
-- Purpose: Fast cross-SETA duplicate detection by ID number only
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerIDIndex')
BEGIN
    CREATE TABLE LearnerIDIndex (
        IDNumberHash        VARBINARY(32)   NOT NULL PRIMARY KEY,
        RegisteredSETAID    INT             NOT NULL,
        RegistrationDate    DATETIME        NOT NULL DEFAULT GETDATE(),
        IsActive            BIT             NOT NULL DEFAULT 1,
        CONSTRAINT FK_LearnerIDIndex_SETA FOREIGN KEY (RegisteredSETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table LearnerIDIndex created successfully.';
END
GO

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================
PRINT '';
PRINT '=============================================';
PRINT 'Multi-SETA ID Verification Schema';
PRINT 'Installation Complete!';
PRINT '=============================================';
PRINT 'Tables created: SETAs, LearnerRegistry, VerificationLog, DuplicateAttempts, AuditTrail, Users';
PRINT 'NEW Tables: LearnerEnrollmentIndex (Global), ApiKeys, ApiRequestLog, Provinces';
PRINT 'API Tables: ApiUsers, RefreshTokens, LearnerIDIndex';
PRINT 'Indexes created: 12+ performance indexes';
PRINT 'Stored procedures: sp_CheckCrossSETADuplicate, sp_GetDashboardStats, sp_CheckEnrollmentDuplicate';
PRINT 'Triggers: TR_LearnerRegistry_InsertEnrollment';
PRINT 'Seed data: 21 SETAs, 1 admin user, 3 sample learners, 1 API key, 1 API user';
PRINT '';
PRINT 'API User Credentials (for testing):';
PRINT '  Username: lms_wrseta';
PRINT '  Password: LmsPassword2025!';
PRINT '  API Key: wrseta-lms-key-2025';
PRINT '=============================================';
GO
