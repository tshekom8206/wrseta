-- =============================================
-- STEP 1: RESTORE DATABASE FROM BACKUP
-- =============================================
-- Run this script FIRST to restore the hackathon database
-- Then run Schema_API_Extension.sql to add API tables
-- =============================================

-- IMPORTANT: Update the file paths below to match your environment!

USE master;
GO

-- Close any existing connections to the database
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'SETA_IDVerification')
BEGIN
    ALTER DATABASE SETA_IDVerification SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
END
GO

-- Restore the database from backup
-- UPDATE THESE PATHS TO MATCH YOUR ENVIRONMENT:
RESTORE DATABASE SETA_IDVerification
FROM DISK = N'C:\Users\Administrator\Downloads\WRSETA\SQLDatabase\WRSETA_HACKATHON_backup_2025_12_10_010001_5303826.bak'
WITH
    MOVE N'WRSETA_HACKATHON' TO N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\SETA_IDVerification.mdf',
    MOVE N'WRSETA_HACKATHON_log' TO N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\SETA_IDVerification_log.ldf',
    REPLACE,
    STATS = 10;
GO

-- Set database back to multi-user mode
ALTER DATABASE SETA_IDVerification SET MULTI_USER;
GO

PRINT '';
PRINT '=============================================';
PRINT 'Database restored successfully!';
PRINT '=============================================';
PRINT '';
PRINT 'NEXT STEP: Run Schema_API_Extension.sql to add API tables';
PRINT '=============================================';
GO

-- Verify the restore by checking existing tables
USE SETA_IDVerification;
GO

SELECT 'Existing Tables:' AS Info;
SELECT name AS TableName, create_date AS CreatedDate
FROM sys.tables
ORDER BY name;
GO

SELECT 'Existing SETAs:' AS Info;
SELECT SETAID, SETACode, SETAName FROM SETAs ORDER BY SETAID;
GO

SELECT 'Learner Count:' AS Info;
SELECT COUNT(*) AS TotalLearners FROM LearnerRegistry;
GO
