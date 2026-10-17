@echo off
setlocal
rem Runs the test suite in this window. No browser is involved.
cd /d "%~dp0"

set NODE=C:\Users\Abdul Mannan\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe

echo.
echo  Bookkeep test results
echo  ---------------------
echo.

if not exist "%NODE%" (
  echo  Could not find Node at:
  echo    %NODE%
  echo  Tell the assistant what you see here.
  echo.
  pause
  exit /b 1
)

"%NODE%" tests\run.js

echo.
echo  ---------------------------------------------------------------
echo  If the line above starts with "All good", everything passed.
echo  Otherwise the lines above list exactly what is broken.
echo.
echo  Please screenshot this whole window and send it to the assistant.
echo.
pause
