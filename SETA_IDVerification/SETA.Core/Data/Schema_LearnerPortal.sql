-- =============================================
-- LEARNER PORTAL SCHEMA EXTENSION
-- Version: 1.0
-- Date: December 2025
-- Description: Database schema for Learner Self-Service Portal
--              Tracks progress, verifications, and certificates
-- =============================================

SET QUOTED_IDENTIFIER ON;
GO
SET ANSI_NULLS ON;
GO

-- =============================================
-- TABLE: LearnerProgress
-- Purpose: Track learner programme progress (credits, modules)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerProgress')
BEGIN
    CREATE TABLE LearnerProgress (
        ProgressID INT IDENTITY(1,1) PRIMARY KEY,
        LearnerID INT NOT NULL,
        ProgrammeCode VARCHAR(20) NULL,
        ProgrammeName NVARCHAR(200) NOT NULL,
        ProgrammeLevel VARCHAR(20) DEFAULT 'NQF Level 3',
        TotalCredits INT DEFAULT 120,
        CreditsEarned INT DEFAULT 0,
        TotalModules INT DEFAULT 10,
        ModulesCompleted INT DEFAULT 0,
        ProgressPercent INT DEFAULT 0,
        StartDate DATETIME NOT NULL DEFAULT GETDATE(),
        ExpectedCompletionDate DATETIME NULL,
        ActualCompletionDate DATETIME NULL,
        Status VARCHAR(20) DEFAULT 'In Progress', -- In Progress, Completed, Withdrawn
        LastUpdated DATETIME DEFAULT GETDATE(),
        UpdatedBy NVARCHAR(100),
        CONSTRAINT FK_LearnerProgress_Learner FOREIGN KEY (LearnerID) REFERENCES LearnerRegistry(LearnerID)
    );
    PRINT 'Table LearnerProgress created successfully.';
END
GO

-- Index for fast lookups by learner
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearnerProgress_LearnerID')
BEGIN
    CREATE INDEX IX_LearnerProgress_LearnerID ON LearnerProgress(LearnerID);
    PRINT 'Index IX_LearnerProgress_LearnerID created.';
END
GO

-- =============================================
-- TABLE: LearnerModules
-- Purpose: Track individual module completion
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerModules')
BEGIN
    CREATE TABLE LearnerModules (
        ModuleID INT IDENTITY(1,1) PRIMARY KEY,
        ProgressID INT NOT NULL,
        ModuleCode VARCHAR(20) NOT NULL,
        ModuleName NVARCHAR(200) NOT NULL,
        ModuleCredits INT DEFAULT 10,
        Status VARCHAR(20) DEFAULT 'Not Started', -- Not Started, In Progress, Completed, Failed
        StartDate DATETIME NULL,
        CompletionDate DATETIME NULL,
        Score DECIMAL(5,2) NULL,
        AssessorName NVARCHAR(100) NULL,
        CONSTRAINT FK_LearnerModules_Progress FOREIGN KEY (ProgressID) REFERENCES LearnerProgress(ProgressID)
    );
    PRINT 'Table LearnerModules created successfully.';
END
GO

-- =============================================
-- TABLE: LearnerVerificationHistory
-- Purpose: Track DHA verification events per learner
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerVerificationHistory')
BEGIN
    CREATE TABLE LearnerVerificationHistory (
        VerificationHistoryID INT IDENTITY(1,1) PRIMARY KEY,
        LearnerID INT NOT NULL,
        VerificationType VARCHAR(30) NOT NULL, -- Initial, Re-verification, Update
        Status VARCHAR(20) NOT NULL, -- Verified, Pending, Failed
        DHAStatus VARCHAR(50) NULL, -- DHA response status
        DHAReference VARCHAR(50) NULL, -- DHA transaction reference
        VerifiedAt DATETIME NOT NULL DEFAULT GETDATE(),
        VerifiedBy NVARCHAR(100),
        ExpiresAt DATETIME NULL, -- For time-limited verifications
        Notes NVARCHAR(500) NULL,
        CONSTRAINT FK_LearnerVerification_Learner FOREIGN KEY (LearnerID) REFERENCES LearnerRegistry(LearnerID)
    );
    PRINT 'Table LearnerVerificationHistory created successfully.';
END
GO

-- Index for fast lookups by learner
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearnerVerificationHistory_LearnerID')
BEGIN
    CREATE INDEX IX_LearnerVerificationHistory_LearnerID ON LearnerVerificationHistory(LearnerID);
    PRINT 'Index IX_LearnerVerificationHistory_LearnerID created.';
END
GO

-- =============================================
-- TABLE: LearnerCertificates
-- Purpose: Track certificates earned by learners
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LearnerCertificates')
BEGIN
    CREATE TABLE LearnerCertificates (
        CertificateID INT IDENTITY(1,1) PRIMARY KEY,
        LearnerID INT NOT NULL,
        CertificateNumber VARCHAR(50) NOT NULL UNIQUE,
        CertificateName NVARCHAR(200) NOT NULL,
        CertificateType VARCHAR(30) DEFAULT 'Full Qualification', -- Full Qualification, Unit Standard, Statement of Results
        ProgrammeCode VARCHAR(20) NULL,
        ProgrammeName NVARCHAR(200) NULL,
        NQFLevel VARCHAR(20) NULL,
        Credits INT NULL,
        IssueDate DATETIME NOT NULL DEFAULT GETDATE(),
        ExpiryDate DATETIME NULL,
        IssuedBy NVARCHAR(100) NULL,
        SAQARegistered BIT DEFAULT 0,
        DocumentPath NVARCHAR(500) NULL, -- Path to PDF certificate
        Status VARCHAR(20) DEFAULT 'Active', -- Active, Revoked, Expired
        CONSTRAINT FK_LearnerCertificates_Learner FOREIGN KEY (LearnerID) REFERENCES LearnerRegistry(LearnerID)
    );
    PRINT 'Table LearnerCertificates created successfully.';
END
GO

-- Index for fast lookups by learner
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearnerCertificates_LearnerID')
BEGIN
    CREATE INDEX IX_LearnerCertificates_LearnerID ON LearnerCertificates(LearnerID);
    PRINT 'Index IX_LearnerCertificates_LearnerID created.';
END
GO

-- =============================================
-- SEED DATA: Sample progress for existing learners
-- =============================================
DECLARE @WRSETA_ID INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');

-- Get learner IDs for W&RSETA learners
DECLARE @Learner1 INT, @Learner2 INT, @Learner3 INT, @Learner4 INT, @Learner5 INT;

SELECT @Learner1 = LearnerID FROM LearnerRegistry WHERE IDNumber = '8506155012089' AND RegisteredSETAID = @WRSETA_ID;
SELECT @Learner2 = LearnerID FROM LearnerRegistry WHERE IDNumber = '9001015800085' AND RegisteredSETAID = @WRSETA_ID;
SELECT @Learner3 = LearnerID FROM LearnerRegistry WHERE IDNumber = '9205230145087' AND RegisteredSETAID = @WRSETA_ID;
SELECT @Learner4 = LearnerID FROM LearnerRegistry WHERE IDNumber = '8812115023084' AND RegisteredSETAID = @WRSETA_ID;
SELECT @Learner5 = LearnerID FROM LearnerRegistry WHERE IDNumber = '9507185044082' AND RegisteredSETAID = @WRSETA_ID;

-- Insert progress data if not exists
IF NOT EXISTS (SELECT * FROM LearnerProgress)
BEGIN
    -- Thabo Mokoena - 75% complete
    IF @Learner1 IS NOT NULL
    INSERT INTO LearnerProgress (LearnerID, ProgrammeCode, ProgrammeName, ProgrammeLevel, TotalCredits, CreditsEarned, TotalModules, ModulesCompleted, StartDate, ExpectedCompletionDate, Status, UpdatedBy)
    VALUES (@Learner1, 'SAQA-49648', 'National Certificate: Retail Management', 'NQF Level 5', 120, 90, 10, 7, '2025-01-15', '2025-09-30', 'In Progress', 'system');

    -- Sipho Ndlovu - 50% complete
    IF @Learner2 IS NOT NULL
    INSERT INTO LearnerProgress (LearnerID, ProgrammeCode, ProgrammeName, ProgrammeLevel, TotalCredits, CreditsEarned, TotalModules, ModulesCompleted, StartDate, ExpectedCompletionDate, Status, UpdatedBy)
    VALUES (@Learner2, 'SAQA-49649', 'National Certificate: Wholesale Operations', 'NQF Level 4', 120, 60, 8, 4, '2025-01-20', '2025-10-31', 'In Progress', 'system');

    -- Nomsa Dlamini - 45% complete (this is the learner.wrseta user sees)
    IF @Learner3 IS NOT NULL
    INSERT INTO LearnerProgress (LearnerID, ProgrammeCode, ProgrammeName, ProgrammeLevel, TotalCredits, CreditsEarned, TotalModules, ModulesCompleted, StartDate, ExpectedCompletionDate, Status, UpdatedBy)
    VALUES (@Learner3, 'SAQA-49648', 'National Certificate: Wholesale and Retail Operations', 'NQF Level 3', 120, 54, 9, 4, '2025-02-01', '2025-12-15', 'In Progress', 'system');

    -- John van der Merwe - 30% complete
    IF @Learner4 IS NOT NULL
    INSERT INTO LearnerProgress (LearnerID, ProgrammeCode, ProgrammeName, ProgrammeLevel, TotalCredits, CreditsEarned, TotalModules, ModulesCompleted, StartDate, ExpectedCompletionDate, Status, UpdatedBy)
    VALUES (@Learner4, 'SAQA-49650', 'National Certificate: Supply Chain Management', 'NQF Level 5', 150, 45, 12, 4, '2025-02-10', '2026-02-28', 'In Progress', 'system');

    -- Lerato Molefe - 85% complete
    IF @Learner5 IS NOT NULL
    INSERT INTO LearnerProgress (LearnerID, ProgrammeCode, ProgrammeName, ProgrammeLevel, TotalCredits, CreditsEarned, TotalModules, ModulesCompleted, StartDate, ExpectedCompletionDate, Status, UpdatedBy)
    VALUES (@Learner5, 'SAQA-49651', 'National Certificate: Customer Service', 'NQF Level 3', 100, 85, 8, 7, '2025-02-15', '2025-06-30', 'In Progress', 'system');

    PRINT 'Sample learner progress data inserted.';
END
GO

-- =============================================
-- SEED DATA: Verification history
-- =============================================
IF NOT EXISTS (SELECT * FROM LearnerVerificationHistory)
BEGIN
    DECLARE @WRSETA_ID2 INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');
    DECLARE @L1 INT, @L2 INT, @L3 INT, @L4 INT, @L5 INT;

    SELECT @L1 = LearnerID FROM LearnerRegistry WHERE IDNumber = '8506155012089' AND RegisteredSETAID = @WRSETA_ID2;
    SELECT @L2 = LearnerID FROM LearnerRegistry WHERE IDNumber = '9001015800085' AND RegisteredSETAID = @WRSETA_ID2;
    SELECT @L3 = LearnerID FROM LearnerRegistry WHERE IDNumber = '9205230145087' AND RegisteredSETAID = @WRSETA_ID2;
    SELECT @L4 = LearnerID FROM LearnerRegistry WHERE IDNumber = '8812115023084' AND RegisteredSETAID = @WRSETA_ID2;
    SELECT @L5 = LearnerID FROM LearnerRegistry WHERE IDNumber = '9507185044082' AND RegisteredSETAID = @WRSETA_ID2;

    -- Thabo Mokoena - Verified on enrollment
    IF @L1 IS NOT NULL
    INSERT INTO LearnerVerificationHistory (LearnerID, VerificationType, Status, DHAStatus, DHAReference, VerifiedAt, VerifiedBy)
    VALUES (@L1, 'Initial', 'Verified', 'ID_VALID', 'DHA-2025-001234', '2025-01-15 09:30:00', 'admin');

    -- Sipho Ndlovu - Verified on enrollment
    IF @L2 IS NOT NULL
    INSERT INTO LearnerVerificationHistory (LearnerID, VerificationType, Status, DHAStatus, DHAReference, VerifiedAt, VerifiedBy)
    VALUES (@L2, 'Initial', 'Verified', 'ID_VALID', 'DHA-2025-001456', '2025-01-20 10:15:00', 'admin');

    -- Nomsa Dlamini - Verified on enrollment (this is what learner.wrseta sees)
    IF @L3 IS NOT NULL
    INSERT INTO LearnerVerificationHistory (LearnerID, VerificationType, Status, DHAStatus, DHAReference, VerifiedAt, VerifiedBy)
    VALUES (@L3, 'Initial', 'Verified', 'ID_VALID', 'DHA-2025-001789', '2025-02-01 11:00:00', 'admin');

    -- John van der Merwe - Verified
    IF @L4 IS NOT NULL
    INSERT INTO LearnerVerificationHistory (LearnerID, VerificationType, Status, DHAStatus, DHAReference, VerifiedAt, VerifiedBy)
    VALUES (@L4, 'Initial', 'Verified', 'ID_VALID', 'DHA-2025-002345', '2025-02-10 14:00:00', 'admin');

    -- Lerato Molefe - Verified
    IF @L5 IS NOT NULL
    INSERT INTO LearnerVerificationHistory (LearnerID, VerificationType, Status, DHAStatus, DHAReference, VerifiedAt, VerifiedBy)
    VALUES (@L5, 'Initial', 'Verified', 'ID_VALID', 'DHA-2025-002567', '2025-02-15 09:00:00', 'admin');

    PRINT 'Sample learner verification history inserted.';
END
GO

-- =============================================
-- SEED DATA: Sample certificates (for completed learner)
-- =============================================
IF NOT EXISTS (SELECT * FROM LearnerCertificates)
BEGIN
    DECLARE @WRSETA_ID3 INT = (SELECT SETAID FROM SETAs WHERE SETACode = 'WRSETA');

    -- Get Peter Nkosi who completed in 2024
    DECLARE @CompletedLearner INT;
    SELECT @CompletedLearner = LearnerID FROM LearnerRegistry WHERE IDNumber = '8709105028083' AND RegisteredSETAID = @WRSETA_ID3;

    IF @CompletedLearner IS NOT NULL
    BEGIN
        -- Full qualification certificate
        INSERT INTO LearnerCertificates (LearnerID, CertificateNumber, CertificateName, CertificateType, ProgrammeCode, ProgrammeName, NQFLevel, Credits, IssueDate, IssuedBy, SAQARegistered, Status)
        VALUES (@CompletedLearner, 'WRSETA-2024-0001', 'National Certificate: Retail Management', 'Full Qualification', 'SAQA-49648', 'National Certificate: Retail Management', 'NQF Level 5', 120, '2024-11-15', 'WRSETA', 1, 'Active');

        PRINT 'Sample certificate data inserted.';
    END
END
GO

-- =============================================
-- STORED PROCEDURE: Get Learner Portal Data
-- Purpose: Returns all data needed for learner self-service portal
-- =============================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetLearnerPortalData')
    DROP PROCEDURE sp_GetLearnerPortalData;
GO

CREATE PROCEDURE sp_GetLearnerPortalData
    @LearnerID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Basic learner info
    SELECT
        l.LearnerID,
        l.IDNumber,
        l.FirstName,
        l.Surname,
        l.FirstName + ' ' + l.Surname AS FullName,
        l.DateOfBirth,
        l.Gender,
        l.ProgrammeName,
        l.Status,
        l.RegistrationDate AS EnrollmentDate,
        s.SETAName,
        s.SETACode
    FROM LearnerRegistry l
    INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID
    WHERE l.LearnerID = @LearnerID;

    -- 2. Progress data
    SELECT
        p.ProgressID,
        p.ProgrammeCode,
        p.ProgrammeName,
        p.ProgrammeLevel,
        p.TotalCredits,
        p.CreditsEarned,
        p.TotalModules,
        p.ModulesCompleted,
        p.ProgressPercent,
        p.StartDate,
        p.ExpectedCompletionDate,
        p.Status
    FROM LearnerProgress p
    WHERE p.LearnerID = @LearnerID
    ORDER BY p.StartDate DESC;

    -- 3. Verification history (most recent first)
    SELECT TOP 1
        v.VerificationHistoryID,
        v.VerificationType,
        v.Status,
        v.DHAStatus,
        v.DHAReference,
        v.VerifiedAt,
        v.VerifiedBy
    FROM LearnerVerificationHistory v
    WHERE v.LearnerID = @LearnerID
      AND v.Status = 'Verified'
    ORDER BY v.VerifiedAt DESC;

    -- 4. Certificates count
    SELECT COUNT(*) AS CertificateCount
    FROM LearnerCertificates c
    WHERE c.LearnerID = @LearnerID
      AND c.Status = 'Active';

    -- 5. Certificate list
    SELECT
        c.CertificateID,
        c.CertificateNumber,
        c.CertificateName,
        c.CertificateType,
        c.NQFLevel,
        c.Credits,
        c.IssueDate,
        c.ExpiryDate,
        c.Status
    FROM LearnerCertificates c
    WHERE c.LearnerID = @LearnerID
    ORDER BY c.IssueDate DESC;
END
GO

PRINT 'Stored procedure sp_GetLearnerPortalData created.';
GO

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================
PRINT '';
PRINT '=============================================';
PRINT 'Learner Portal Schema Extension';
PRINT 'Installation Complete!';
PRINT '=============================================';
PRINT 'Tables created: LearnerProgress, LearnerModules, LearnerVerificationHistory, LearnerCertificates';
PRINT 'Stored procedures: sp_GetLearnerPortalData';
PRINT 'Sample data: Progress for 5 learners, verification history, 1 certificate';
PRINT '=============================================';
GO
