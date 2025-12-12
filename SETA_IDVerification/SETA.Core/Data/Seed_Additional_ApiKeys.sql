-- =============================================
-- SEED ADDITIONAL SETA API KEYS
-- Version: 1.1.0
-- Date: December 2025
-- =============================================
-- PURPOSE: This script adds API keys for all 21 SETAs
-- Run AFTER Schema.sql or Schema_API_Extension.sql
-- =============================================

USE SETA_IDVerification;
GO

PRINT '=============================================';
PRINT 'Seeding Additional SETA API Keys...';
PRINT '=============================================';
PRINT '';

-- =============================================
-- API KEYS FOR ALL 21 SETAs
-- Format: {setacode}-lms-key-2025
-- =============================================

-- WRSETA (Already exists, but ensure it's there)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'W&RSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'wrseta-lms-key-2025'), 2),
        'W&RSETA LMS Integration',
        SETAID,
        5000,
        1
    FROM SETAs WHERE SETACode = 'WRSETA';
    PRINT 'API Key created: wrseta-lms-key-2025 (WRSETA)';
END
GO

-- MICT SETA
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'MICT SETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'mict-lms-key-2025'), 2),
        'MICT SETA LMS Integration',
        SETAID,
        3000,
        1
    FROM SETAs WHERE SETACode = 'MICT';
    PRINT 'API Key created: mict-lms-key-2025 (MICT)';
END
GO

-- MERSETA
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'MERSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'merseta-lms-key-2025'), 2),
        'MERSETA LMS Integration',
        SETAID,
        3000,
        1
    FROM SETAs WHERE SETACode = 'MERSETA';
    PRINT 'API Key created: merseta-lms-key-2025 (MERSETA)';
END
GO

-- SERVICES SETA
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'SERVICES SETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'services-lms-key-2025'), 2),
        'SERVICES SETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'SERVICES';
    PRINT 'API Key created: services-lms-key-2025 (SERVICES)';
END
GO

-- CETA (Construction)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'CETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'ceta-lms-key-2025'), 2),
        'CETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'CETA';
    PRINT 'API Key created: ceta-lms-key-2025 (CETA)';
END
GO

-- CHIETA (Chemical)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'CHIETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'chieta-lms-key-2025'), 2),
        'CHIETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'CHIETA';
    PRINT 'API Key created: chieta-lms-key-2025 (CHIETA)';
END
GO

-- ETDP (Education)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'ETDP SETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'etdp-lms-key-2025'), 2),
        'ETDP SETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'ETDP';
    PRINT 'API Key created: etdp-lms-key-2025 (ETDP)';
END
GO

-- EWSETA (Energy and Water)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'EWSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'ewseta-lms-key-2025'), 2),
        'EWSETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'EWSETA';
    PRINT 'API Key created: ewseta-lms-key-2025 (EWSETA)';
END
GO

-- FASSET (Finance)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'FASSET LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'fasset-lms-key-2025'), 2),
        'FASSET LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'FASSET';
    PRINT 'API Key created: fasset-lms-key-2025 (FASSET)';
END
GO

-- FOODBEV (Food and Beverages)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'FOODBEV SETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'foodbev-lms-key-2025'), 2),
        'FOODBEV SETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'FOODBEV';
    PRINT 'API Key created: foodbev-lms-key-2025 (FOODBEV)';
END
GO

-- FPM (Fibre Processing)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'FPM SETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'fpm-lms-key-2025'), 2),
        'FPM SETA LMS Integration',
        SETAID,
        1500,
        1
    FROM SETAs WHERE SETACode = 'FPM';
    PRINT 'API Key created: fpm-lms-key-2025 (FPM)';
END
GO

-- HWSETA (Health and Welfare)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'HWSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'hwseta-lms-key-2025'), 2),
        'HWSETA LMS Integration',
        SETAID,
        3000,
        1
    FROM SETAs WHERE SETACode = 'HWSETA';
    PRINT 'API Key created: hwseta-lms-key-2025 (HWSETA)';
END
GO

-- INSETA (Insurance)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'INSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'inseta-lms-key-2025'), 2),
        'INSETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'INSETA';
    PRINT 'API Key created: inseta-lms-key-2025 (INSETA)';
END
GO

-- LGSETA (Local Government)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'LGSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'lgseta-lms-key-2025'), 2),
        'LGSETA LMS Integration',
        SETAID,
        2500,
        1
    FROM SETAs WHERE SETACode = 'LGSETA';
    PRINT 'API Key created: lgseta-lms-key-2025 (LGSETA)';
END
GO

-- MQA (Mining)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'MQA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'mqa-lms-key-2025'), 2),
        'MQA LMS Integration',
        SETAID,
        3000,
        1
    FROM SETAs WHERE SETACode = 'MQA';
    PRINT 'API Key created: mqa-lms-key-2025 (MQA)';
END
GO

-- PSETA (Public Service)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'PSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'pseta-lms-key-2025'), 2),
        'PSETA LMS Integration',
        SETAID,
        2500,
        1
    FROM SETAs WHERE SETACode = 'PSETA';
    PRINT 'API Key created: pseta-lms-key-2025 (PSETA)';
END
GO

-- SASSETA (Safety and Security)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'SASSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'sasseta-lms-key-2025'), 2),
        'SASSETA LMS Integration',
        SETAID,
        2500,
        1
    FROM SETAs WHERE SETACode = 'SASSETA';
    PRINT 'API Key created: sasseta-lms-key-2025 (SASSETA)';
END
GO

-- AgriSETA (Agriculture)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'AgriSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'agriseta-lms-key-2025'), 2),
        'AgriSETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'AgriSETA';
    PRINT 'API Key created: agriseta-lms-key-2025 (AgriSETA)';
END
GO

-- CATHSSETA (Tourism)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'CATHSSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'cathsseta-lms-key-2025'), 2),
        'CATHSSETA LMS Integration',
        SETAID,
        2000,
        1
    FROM SETAs WHERE SETACode = 'CATHSSETA';
    PRINT 'API Key created: cathsseta-lms-key-2025 (CATHSSETA)';
END
GO

-- TETA (Transport)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'TETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'teta-lms-key-2025'), 2),
        'TETA LMS Integration',
        SETAID,
        2500,
        1
    FROM SETAs WHERE SETACode = 'TETA';
    PRINT 'API Key created: teta-lms-key-2025 (TETA)';
END
GO

-- BANKSETA (Banking)
IF NOT EXISTS (SELECT * FROM ApiKeys WHERE KeyName = 'BANKSETA LMS Integration')
BEGIN
    INSERT INTO ApiKeys (ApiKeyHash, KeyName, SETAID, RateLimit, IsActive)
    SELECT
        CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'bankseta-lms-key-2025'), 2),
        'BANKSETA LMS Integration',
        SETAID,
        3000,
        1
    FROM SETAs WHERE SETACode = 'BANKSETA';
    PRINT 'API Key created: bankseta-lms-key-2025 (BANKSETA)';
END
GO

-- =============================================
-- API USERS FOR ALL SETAs (Service Accounts)
-- Format: lms_{setacode}
-- Password: LmsPassword2025!
-- =============================================

PRINT '';
PRINT 'Creating API Users for all SETAs...';
PRINT '';

-- Create users for each SETA
DECLARE @SETAs TABLE (SETACode VARCHAR(10), SETAID INT);
INSERT INTO @SETAs SELECT SETACode, SETAID FROM SETAs WHERE IsActive = 1;

DECLARE @Code VARCHAR(10), @ID INT, @Username NVARCHAR(100);
DECLARE seta_cursor CURSOR FOR SELECT SETACode, SETAID FROM @SETAs;

OPEN seta_cursor;
FETCH NEXT FROM seta_cursor INTO @Code, @ID;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @Username = 'lms_' + LOWER(@Code);

    IF NOT EXISTS (SELECT * FROM ApiUsers WHERE Username = @Username)
    BEGIN
        INSERT INTO ApiUsers (Username, PasswordHash, SETAID, IsActive)
        VALUES (
            @Username,
            CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'LmsPassword2025!'), 2),
            @ID,
            1
        );
        PRINT 'API User created: ' + @Username;
    END

    FETCH NEXT FROM seta_cursor INTO @Code, @ID;
END

CLOSE seta_cursor;
DEALLOCATE seta_cursor;
GO

-- =============================================
-- SUMMARY
-- =============================================
PRINT '';
PRINT '=============================================';
PRINT 'API Keys Seeding Complete!';
PRINT '=============================================';
PRINT '';
PRINT 'API Keys created for all 21 SETAs:';
PRINT '';

SELECT
    ak.ApiKeyID,
    s.SETACode,
    ak.KeyName,
    ak.RateLimit AS [Rate Limit (req/hr)],
    CASE WHEN ak.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status
FROM ApiKeys ak
INNER JOIN SETAs s ON ak.SETAID = s.SETAID
ORDER BY s.SETACode;

PRINT '';
PRINT 'API Key Format: {setacode}-lms-key-2025';
PRINT 'API User Format: lms_{setacode}';
PRINT 'Default Password: LmsPassword2025!';
PRINT '';
PRINT '=============================================';
PRINT 'SETA API Key Reference:';
PRINT '=============================================';
PRINT 'WRSETA:    wrseta-lms-key-2025     (5000 req/hr)';
PRINT 'MICT:      mict-lms-key-2025       (3000 req/hr)';
PRINT 'MERSETA:   merseta-lms-key-2025    (3000 req/hr)';
PRINT 'SERVICES:  services-lms-key-2025   (2000 req/hr)';
PRINT 'CETA:      ceta-lms-key-2025       (2000 req/hr)';
PRINT 'CHIETA:    chieta-lms-key-2025     (2000 req/hr)';
PRINT 'ETDP:      etdp-lms-key-2025       (2000 req/hr)';
PRINT 'EWSETA:    ewseta-lms-key-2025     (2000 req/hr)';
PRINT 'FASSET:    fasset-lms-key-2025     (2000 req/hr)';
PRINT 'FOODBEV:   foodbev-lms-key-2025    (2000 req/hr)';
PRINT 'FPM:       fpm-lms-key-2025        (1500 req/hr)';
PRINT 'HWSETA:    hwseta-lms-key-2025     (3000 req/hr)';
PRINT 'INSETA:    inseta-lms-key-2025     (2000 req/hr)';
PRINT 'LGSETA:    lgseta-lms-key-2025     (2500 req/hr)';
PRINT 'MQA:       mqa-lms-key-2025        (3000 req/hr)';
PRINT 'PSETA:     pseta-lms-key-2025      (2500 req/hr)';
PRINT 'SASSETA:   sasseta-lms-key-2025    (2500 req/hr)';
PRINT 'AgriSETA:  agriseta-lms-key-2025   (2000 req/hr)';
PRINT 'CATHSSETA: cathsseta-lms-key-2025  (2000 req/hr)';
PRINT 'TETA:      teta-lms-key-2025       (2500 req/hr)';
PRINT 'BANKSETA:  bankseta-lms-key-2025   (3000 req/hr)';
PRINT '=============================================';
GO
