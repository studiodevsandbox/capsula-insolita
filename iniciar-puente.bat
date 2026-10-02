@echo off
title LCI - Puente Stream Deck
cd /d "%~dp0"
echo Iniciando el puente de La Capsula Insolita...
echo (deja esta ventana abierta mientras uses el Stream Deck)
echo.
node bridge.js
echo.
echo El puente se detuvo. Revisa el error arriba si no era intencional.
pause
