@echo off

echo Building client...
cd server
npm install
npm run build
cd ..

echo Build complete.
pause
