-- =============================================
-- SETA ID VERIFICATION API EXTENSION SCHEMA
-- Version: 1.0
-- Date: December 2025
-- =============================================
-- PURPOSE: This script adds API-related tables and columns
-- to an EXISTING database restored from backup.
--
-- PREREQUISITE: Restore the database backup first:
--   WRSETA_HACKATHON_backup_2025_12_10_010001_5303826.bak
--
-- This script will NOT overwrite existing data.
-- =============================================

USE SETA_IDVerification;
GO

PRINT '=============================================';
PRINT 'SETA API Extension Schema - Starting...';
PRINT '=============================================';
PRINT '';

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
ELSE
    PRINT 'Table Provinces already exists - skipping.';
GO

-- =============================================
-- TABLE: LearnerEnrollmentIndex (GLOBAL - NOT PARTITIONED)
-- Purpose: Cross-SETA enrollment duplicate detection
-- Contains NO PII (only ID hashes) - POPIA compliant
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerEnrollmentIndex')
BEGIN
    CREATE TABLE LearnerEnrollmentIndex (
        IDNumberHash        VARBINARY(32)   NOT NULL,
        LearnershipCode     VARCHAR(20)     NOT NULL,
        RegisteredSETAID    INT             NOT NULL,
        EnrollmentYear      INT             NOT NULL,
        ProvinceCode        VARCHAR(3)      NOT NULL,
        RegistrationDate    DATETIME        NOT NULL DEFAULT GETDATE(),
        IsActive            BIT             NOT NULL DEFAULT 1,

        CONSTRAINT PK_LearnerEnrollment PRIMARY KEY CLUSTERED
            (IDNumberHash, LearnershipCode, RegisteredSETAID, EnrollmentYear, ProvinceCode),

        CONSTRAINT FK_LearnerEnrollment_SETA FOREIGN KEY (RegisteredSETAID)
            REFERENCES SETAs(SETAID)
    );
    PRINT 'Table LearnerEnrollmentIndex created.';

    -- Fast lookup index
    CREATE NONCLUSTERED INDEX IX_LearnerEnrollment_Lookup
        ON LearnerEnrollmentIndex(IDNumberHash, LearnershipCode, EnrollmentYear)
        INCLUDE (RegisteredSETAID, ProvinceCode, IsActive);

    CREATE NONCLUSTERED INDEX IX_LearnerEnrollment_SETA_Year
        ON LearnerEnrollmentIndex(RegisteredSETAID, EnrollmentYear, IsActive);

    PRINT 'Indexes created for LearnerEnrollmentIndex.';
END
ELSE
    PRINT 'Table LearnerEnrollmentIndex already exists - skipping.';
GO

-- =============================================
-- TABLE: LearnerIDIndex (Global duplicate ID detection)
-- Purpose: Fast cross-SETA duplicate detection by ID number
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
    PRINT 'Table LearnerIDIndex created.';
END
ELSE
    PRINT 'Table LearnerIDIndex already exists - skipping.';
GO

-- =============================================
-- TABLE: ApiKeys
-- Purpose: API authentication for LMS integrations
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApiKeys')
BEGIN
    CREATE TABLE ApiKeys (
        ApiKeyID INT IDENTITY(1,1) PRIMARY KEY,
        ApiKeyHash VARCHAR(64) NOT NULL UNIQUE,
        KeyName NVARCHAR(100) NOT NULL,
        SETAID INT NOT NULL,
        IsActive BIT DEFAULT 1,
        RateLimit INT DEFAULT 1000,
        CreatedDate DATETIME DEFAULT GETDATE(),
        ExpiresDate DATETIME NULL,
        LastUsedDate DATETIME NULL,
        CONSTRAINT FK_ApiKey_SETA FOREIGN KEY (SETAID) REFERENCES SETAs(SETAID)
    );

    CREATE INDEX IX_ApiKeys_Hash ON ApiKeys(ApiKeyHash) WHERE IsActive = 1;
    PRINT 'Table ApiKeys created.';
END
ELSE
    PRINT 'Table ApiKeys already exists - skipping.';
GO

-- =============================================
-- TABLE: ApiUsers
-- Purpose: API service account users
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApiUsers')
BEGIN
    CREATE TABLE ApiUsers (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash VARCHAR(64) NOT NULL,
        SETAID INT NOT NULL,
        IsActive BIT DEFAULT 1,
        LastLogin DATETIME NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ApiUser_SETA FOREIGN KEY (SETAID) REFERENCES SETAs(SETAID)
    );
    PRINT 'Table ApiUsers created.';
END
ELSE
    PRINT 'Table ApiUsers already exists - skipping.';
GO

-- =============================================
-- TABLE: ApiRequestLog
-- Purpose: Log API requests for monitoring/rate limiting
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ApiRequestLog')
BEGIN
    CREATE TABLE ApiRequestLog (
        LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
        ApiKeyID INT NOT NULL,
        Endpoint VARCHAR(200),
        Method VARCHAR(10),
        RequestBody NVARCHAR(MAX),
        ResponseStatus INT,
        ResponseTime INT,
        IPAddress VARCHAR(45),
        RequestedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ApiLog_Key FOREIGN KEY (ApiKeyID) REFERENCES ApiKeys(ApiKeyID)
    );

    CREATE INDEX IX_ApiRequestLog_KeyDate ON ApiRequestLog(ApiKeyID, RequestedAt);
    PRINT 'Table ApiRequestLog created.';
END
ELSE
    PRINT 'Table ApiRequestLog already exists - skipping.';
GO

-- =============================================
-- TABLE: RefreshTokens
-- Purpose: JWT refresh tokens for API authentication
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

    CREATE INDEX IX_RefreshTokens_Token ON RefreshTokens(RefreshToken) WHERE IsRevoked = 0;
    PRINT 'Table RefreshTokens created.';
END
ELSE
    PRINT 'Table RefreshTokens already exists - skipping.';
GO

-- =============================================
-- ADD COLUMNS TO LearnerRegistry (if missing)
-- These columns support the enrollment tracking features
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'LearnershipCode')
BEGIN
    ALTER TABLE LearnerRegistry ADD LearnershipCode VARCHAR(20) NULL;
    PRINT 'Column LearnershipCode added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'LearnershipName')
BEGIN
    ALTER TABLE LearnerRegistry ADD LearnershipName NVARCHAR(200) NULL;
    PRINT 'Column LearnershipName added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'ProvinceCode')
BEGIN
    ALTER TABLE LearnerRegistry ADD ProvinceCode VARCHAR(3) NULL;
    PRINT 'Column ProvinceCode added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'EnrollmentYear')
BEGIN
    ALTER TABLE LearnerRegistry ADD EnrollmentYear INT NULL;
    PRINT 'Column EnrollmentYear added to LearnerRegistry.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LearnerRegistry') AND name = 'EnrollmentID')
BEGIN
    ALTER TABLE LearnerRegistry ADD EnrollmentID VARCHAR(20) NULL;
    PRINT 'Column EnrollmentID added to LearnerRegistry.';
END
GO

-- =============================================
-- ADD COLUMNS TO VerificationLog (if missing)
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

    CREATE INDEX IX_VerificationLog_IDHash ON VerificationLog(IDNumberHash);
    PRINT 'Index IX_VerificationLog_IDHash created.';
END
GO

-- =============================================
-- STORED PROCEDURE: Check for Enrollment Duplicate
-- Business Rules:
-- 1. Same learnership + Same SETA + Same province + Same year = BLOCKED
-- 2. Same learnership + Different SETA + Same year = BLOCKED
-- 3. Same learnership + Same SETA + Different province = ALLOWED
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
        SELECT
            'BLOCKED' AS Decision,
            'SAME_SETA_SAME_PROVINCE' AS DuplicateType,
            'Learner already enrolled in this learnership at this SETA in this province' AS Message,
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

    -- Check 2: Same learnership at DIFFERENT SETA in same year = BLOCKED
    IF EXISTS (
        SELECT 1 FROM LearnerEnrollmentIndex
        WHERE IDNumberHash = @IDHash
          AND LearnershipCode = @LearnershipCode
          AND RegisteredSETAID <> @RequestingSETA
          AND EnrollmentYear = @EnrollmentYear
          AND IsActive = 1
    )
    BEGIN
        SELECT
            'BLOCKED' AS Decision,
            'DIFFERENT_SETA_SAME_YEAR' AS DuplicateType,
            'Learner already enrolled in this learnership at another SETA this year' AS Message,
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
        SELECT
            'ALLOWED' AS Decision,
            'DIFFERENT_PROVINCE' AS DuplicateType,
            'Learner can enroll in different province' AS Message,
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

    -- No duplicates = NEW_ENROLLMENT
    SELECT
        'ALLOWED' AS Decision,
        'NEW_ENROLLMENT' AS DuplicateType,
        'No existing enrollment found - proceed with registration' AS Message;
END
GO

PRINT 'Stored procedure sp_CheckEnrollmentDuplicate created.';
GO

-- =============================================
-- SEED DATA: API Key for W&RSETA (Tenant 1)
-- API Key: wrseta-lms-key-2025
-- =============================================
DECLARE @WRSETA_ID INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');

IF @WRSETA_ID IS NOT NULL
BEGIN
    -- Insert API Key if not exists
    IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'W&RSETA LMS Integration')
    BEGIN
        INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit)
        VALUES (
            CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'wrseta-lms-key-2025'), 2),
            'W&RSETA LMS Integration',
            @WRSETA_ID,
            5000
        );
        PRINT 'API Key created for W&RSETA (Key: wrseta-lms-key-2025).';
    END

    -- Insert API User if not exists
    IF NOT EXISTS (SELECT * FROM ApiUsers WHERE Username = 'lms_wrseta')
    BEGIN
        INSERT INTO ApiUsers (Username, PasswordHash, SETAID)
        VALUES (
            'lms_wrseta',
            CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'LmsPassword2025!'), 2),
            @WRSETA_ID
        );
        PRINT 'API User created for W&RSETA (Username: lms_wrseta, Password: LmsPassword2025!).';
    END
END
ELSE
    PRINT 'WARNING: WRSETA not found in SETAs table. API credentials not created.';
GO

-- =============================================
-- POPULATE LearnerEnrollmentIndex FROM EXISTING DATA
-- This migrates existing learners into the enrollment index
-- =============================================
IF EXISTS (SELECT * FROM LearnerRegistry) AND NOT EXISTS (SELECT * FROM LearnerEnrollmentIndex)
BEGIN
    PRINT 'Populating LearnerEnrollmentIndex from existing LearnerRegistry data...';

    INSERT INTO LearnerEnrollmentIndex
        (IDNumberHash, LearnershipCode, RegisteredSETAID, EnrollmentYear, ProvinceCode, RegistrationDate, IsActive)
    SELECT
        HASHBYTES('SHA2_256', IDNumber),
        ISNULL(LearnershipCode, 'LEGACY-' + CAST(LearnerID AS VARCHAR(10))),
        RegisteredSETAID,
        ISNULL(EnrollmentYear, YEAR(ISNULL(RegistrationDate, GETDATE()))),
        ISNULL(ProvinceCode, 'GP'),
        ISNULL(RegistrationDate, GETDATE()),
        CASE WHEN Status = 'Active' THEN 1 ELSE 0 END
    FROM LearnerRegistry;

    PRINT 'LearnerEnrollmentIndex populated: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' records.';
END
GO

-- =============================================
-- POPULATE LearnerIDIndex FROM EXISTING DATA
-- This creates the cross-SETA duplicate detection index
-- =============================================
IF EXISTS (SELECT * FROM LearnerRegistry) AND NOT EXISTS (SELECT * FROM LearnerIDIndex)
BEGIN
    PRINT 'Populating LearnerIDIndex from existing LearnerRegistry data...';

    -- Insert unique ID numbers (first registration wins)
    INSERT INTO LearnerIDIndex (IDNumberHash, RegisteredSETAID, RegistrationDate, IsActive)
    SELECT
        HASHBYTES('SHA2_256', lr.IDNumber),
        lr.RegisteredSETAID,
        lr.RegistrationDate,
        1
    FROM LearnerRegistry lr
    INNER JOIN (
        SELECT IDNumber, MIN(ISNULL(RegistrationDate, GETDATE())) AS FirstRegistration
        FROM LearnerRegistry
        GROUP BY IDNumber
    ) first ON lr.IDNumber = first.IDNumber
           AND ISNULL(lr.RegistrationDate, GETDATE()) = first.FirstRegistration;

    PRINT 'LearnerIDIndex populated: ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' unique IDs.';
END
GO

-- =============================================
-- UPDATE EXISTING LEARNERS: Set default values for new columns
-- =============================================
UPDATE LearnerRegistry
SET ProvinceCode = 'GP'
WHERE ProvinceCode IS NULL;

UPDATE LearnerRegistry
SET EnrollmentYear = YEAR(ISNULL(RegistrationDate, GETDATE()))
WHERE EnrollmentYear IS NULL;

PRINT 'Default values set for existing learners (ProvinceCode=GP, EnrollmentYear from RegistrationDate).';
GO

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================
PRINT '';
PRINT '=============================================';
PRINT 'SETA API Extension Schema - Complete!';
PRINT '=============================================';
PRINT '';
PRINT 'NEW TABLES CREATED:';
PRINT '  - Provinces (9 SA provinces)';
PRINT '  - LearnerEnrollmentIndex (enrollment duplicate detection)';
PRINT '  - LearnerIDIndex (cross-SETA ID duplicate detection)';
PRINT '  - ApiKeys (API authentication)';
PRINT '  - ApiUsers (API service accounts)';
PRINT '  - ApiRequestLog (API request logging)';
PRINT '  - RefreshTokens (JWT refresh tokens)';
PRINT '';
PRINT 'COLUMNS ADDED TO EXISTING TABLES:';
PRINT '  - LearnerRegistry: LearnershipCode, LearnershipName, ProvinceCode, EnrollmentYear, EnrollmentID';
PRINT '  - VerificationLog: Message, IDNumberHash';
PRINT '';
PRINT 'STORED PROCEDURES:';
PRINT '  - sp_CheckEnrollmentDuplicate';
PRINT '';
PRINT 'API CREDENTIALS (W&RSETA - Tenant 1):';
PRINT '  API Key: wrseta-lms-key-2025';
PRINT '  Username: lms_wrseta';
PRINT '  Password: LmsPassword2025!';
PRINT '=============================================';
GO
