-- =============================================
-- Fix IdNumber Column Size and Add New Columns
-- Ensures IdNumber column is NVARCHAR(13) to store full SA ID numbers
-- Adds Race, IssueDate, and MaritalStatus columns
-- =============================================

USE [DHA]
GO

-- Check current column size and alter if needed
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[People]') AND name = 'IdNumber')
BEGIN
    -- Get current column definition
    DECLARE @CurrentType NVARCHAR(100)
    SELECT @CurrentType = TYPE_NAME(system_type_id) + '(' + CAST(max_length/2 AS VARCHAR) + ')'
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[People]') AND name = 'IdNumber'

    PRINT 'Current IdNumber column type: ' + @CurrentType

    -- Alter column to ensure it's NVARCHAR(13)
    ALTER TABLE [dbo].[People]
    ALTER COLUMN [IdNumber] NVARCHAR(13) NOT NULL

    PRINT 'IdNumber column updated to NVARCHAR(13)'
END
ELSE
BEGIN
    PRINT 'People table or IdNumber column does not exist'
END
GO

-- Add Race column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[People]') AND name = 'Race')
BEGIN
    ALTER TABLE [dbo].[People]
    ADD [Race] NVARCHAR(50) NULL

    PRINT 'Race column added'
END
ELSE
BEGIN
    PRINT 'Race column already exists'
END
GO

-- Add IssueDate column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[People]') AND name = 'IssueDate')
BEGIN
    ALTER TABLE [dbo].[People]
    ADD [IssueDate] DATE NULL

    PRINT 'IssueDate column added'
END
ELSE
BEGIN
    PRINT 'IssueDate column already exists'
END
GO

-- Add MaritalStatus column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[People]') AND name = 'MaritalStatus')
BEGIN
    ALTER TABLE [dbo].[People]
    ADD [MaritalStatus] NVARCHAR(20) NULL -- 'Single', 'Married', 'Divorced', 'Widowed', etc.

    PRINT 'MaritalStatus column added'
END
ELSE
BEGIN
    PRINT 'MaritalStatus column already exists'
END
GO

-- Update sp_GetPersonByIdNumber to include new columns
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetPersonByIdNumber]') AND type in (N'P', N'PC'))
BEGIN
    DROP PROCEDURE [dbo].[sp_GetPersonByIdNumber]
END
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
        [Race],
        [IssueDate],
        [MaritalStatus],
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

-- Also update the stored procedure parameter if needed
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_AddPerson]') AND type in (N'P', N'PC'))
BEGIN
    DROP PROCEDURE [dbo].[sp_AddPerson]
END
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
    @Race NVARCHAR(50) = NULL,
    @IssueDate DATE = NULL,
    @MaritalStatus NVARCHAR(20) = NULL,
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
        [ReviewReason],
        [Race],
        [IssueDate],
        [MaritalStatus]
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
        @ReviewReason,
        @Race,
        @IssueDate,
        @MaritalStatus
    )

    SET @PersonId = SCOPE_IDENTITY()
END
GO

PRINT 'Fix script completed successfully!'
GO
