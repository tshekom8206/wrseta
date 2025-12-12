-- =============================================
-- DHA Mock Database Schema
-- Simulates South African Home Affairs database
-- For testing and development purposes
-- =============================================

USE [DHA_Mock]
GO

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'DHA_Mock')
BEGIN
    CREATE DATABASE [DHA_Mock]
END
GO

USE [DHA_Mock]
GO

-- =============================================
-- Table: People
-- Stores basic identity information
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[People]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[People] (
        [PersonId] INT IDENTITY(1,1) PRIMARY KEY,
        [IdNumber] NVARCHAR(13) NOT NULL UNIQUE,
        [FirstName] NVARCHAR(100) NOT NULL,
        [Surname] NVARCHAR(100) NOT NULL,
        [DateOfBirth] DATE NOT NULL,
        [Gender] NVARCHAR(10) NOT NULL, -- 'Male' or 'Female'
        [Citizenship] NVARCHAR(50) NOT NULL, -- 'SA Citizen' or 'Permanent Resident'
        [IsDeceased] BIT NOT NULL DEFAULT 0,
        [DateOfDeath] DATE NULL,
        [IsSuspended] BIT NOT NULL DEFAULT 0,
        [SuspensionReason] NVARCHAR(500) NULL,
        [NeedsManualReview] BIT NOT NULL DEFAULT 0,
        [ReviewReason] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [IsActive] BIT NOT NULL DEFAULT 1
    )

    -- Indexes for performance
    CREATE UNIQUE INDEX [IX_People_IdNumber] ON [dbo].[People]([IdNumber])
    CREATE INDEX [IX_People_IsActive] ON [dbo].[People]([IsActive])
    CREATE INDEX [IX_People_IsDeceased] ON [dbo].[People]([IsDeceased])
END
GO

-- =============================================
-- Table: VerificationLog
-- Logs all verification requests
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VerificationLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[VerificationLog] (
        [LogId] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [IdNumber] NVARCHAR(13) NOT NULL,
        [VerificationStatus] NVARCHAR(50) NOT NULL, -- 'VERIFIED', 'NOT_FOUND', 'SERVICE_ERROR', etc.
        [VerificationReference] NVARCHAR(50) NULL,
        [RequestId] NVARCHAR(50) NULL,
        [ProcessingTimeMs] INT NULL,
        [ErrorMessage] NVARCHAR(1000) NULL,
        [VerifiedAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [ClientIp] NVARCHAR(50) NULL
    )

    -- Indexes
    CREATE INDEX [IX_VerificationLog_IdNumber] ON [dbo].[VerificationLog]([IdNumber])
    CREATE INDEX [IX_VerificationLog_VerifiedAt] ON [dbo].[VerificationLog]([VerifiedAt])
    CREATE INDEX [IX_VerificationLog_Status] ON [dbo].[VerificationLog]([VerificationStatus])
END
GO

-- =============================================
-- Stored Procedure: sp_GetPersonByIdNumber
-- Retrieves person information by ID number
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetPersonByIdNumber]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetPersonByIdNumber]
GO

CREATE PROCEDURE [dbo].[sp_GetPersonByIdNumber]
    @IdNumber NVARCHAR(13)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        [PersonId],
        [IdNumber],
        [FirstName],
        [Surname],
        [DateOfBirth],
        [Gender],
        [Citizenship],
        [IsDeceased],
        [DateOfDeath],
        [IsSuspended],
        [SuspensionReason],
        [NeedsManualReview],
        [ReviewReason],
        [CreatedAt],
        [UpdatedAt]
    FROM [dbo].[People]
    WHERE [IdNumber] = @IdNumber
      AND [IsActive] = 1
END
GO

-- =============================================
-- Stored Procedure: sp_AddPerson
-- Adds a new person to the database
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_AddPerson]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_AddPerson]
GO

CREATE PROCEDURE [dbo].[sp_AddPerson]
    @IdNumber NVARCHAR(13),
    @FirstName NVARCHAR(100),
    @Surname NVARCHAR(100),
    @DateOfBirth DATE,
    @Gender NVARCHAR(10),
    @Citizenship NVARCHAR(50),
    @IsDeceased BIT = 0,
    @DateOfDeath DATE = NULL,
    @IsSuspended BIT = 0,
    @SuspensionReason NVARCHAR(500) = NULL,
    @NeedsManualReview BIT = 0,
    @ReviewReason NVARCHAR(500) = NULL,
    @PersonId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if person already exists
    IF EXISTS (SELECT 1 FROM [dbo].[People] WHERE [IdNumber] = @IdNumber AND [IsActive] = 1)
    BEGIN
        RAISERROR('Person with this ID number already exists', 16, 1)
        RETURN
    END

    INSERT INTO [dbo].[People] (
        [IdNumber],
        [FirstName],
        [Surname],
        [DateOfBirth],
        [Gender],
        [Citizenship],
        [IsDeceased],
        [DateOfDeath],
        [IsSuspended],
        [SuspensionReason],
        [NeedsManualReview],
        [ReviewReason]
    )
    VALUES (
        @IdNumber,
        @FirstName,
        @Surname,
        @DateOfBirth,
        @Gender,
        @Citizenship,
        @IsDeceased,
        @DateOfDeath,
        @IsSuspended,
        @SuspensionReason,
        @NeedsManualReview,
        @ReviewReason
    )

    SET @PersonId = SCOPE_IDENTITY()
END
GO

-- =============================================
-- Stored Procedure: sp_LogVerification
-- Logs a verification request
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_LogVerification]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_LogVerification]
GO

CREATE PROCEDURE [dbo].[sp_LogVerification]
    @IdNumber NVARCHAR(13),
    @VerificationStatus NVARCHAR(50),
    @VerificationReference NVARCHAR(50) = NULL,
    @RequestId NVARCHAR(50) = NULL,
    @ProcessingTimeMs INT = NULL,
    @ErrorMessage NVARCHAR(1000) = NULL,
    @ClientIp NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO [dbo].[VerificationLog] (
        [IdNumber],
        [VerificationStatus],
        [VerificationReference],
        [RequestId],
        [ProcessingTimeMs],
        [ErrorMessage],
        [ClientIp]
    )
    VALUES (
        @IdNumber,
        @VerificationStatus,
        @VerificationReference,
        @RequestId,
        @ProcessingTimeMs,
        @ErrorMessage,
        @ClientIp
    )
END
GO

PRINT 'DHA Mock Database schema created successfully!'
GO
