@echo off
title Starting PostgreSQL 15 Database...
echo ============================================
echo Starting PostgreSQL 15 Database...
echo ============================================
echo.
echo This script requires Administrator privileges.
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Start PostgreSQL service
echo Starting postgresql-x64-15 service...
net start postgresql-x64-15
if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo PostgreSQL 15 started successfully!
    echo Host: localhost
    echo Port: 5432
    echo Database: issue_tracker_db
    echo User: postgres
    echo Password: postgres
    echo ============================================
    echo.
    echo Connect using: psql -U postgres -d issue_tracker_db -p 5432
) else (
    echo.
    echo WARNING: Could not start PostgreSQL service.
    echo You may need to start Docker Desktop first, or run this script as Administrator.
    echo.
    echo The AI service will use the fallback FAQ (faq.json) automatically.
)
echo.
pause