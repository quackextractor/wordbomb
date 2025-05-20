@echo off

echo Building client...
cd client
npm install
npm run build
cd ..

echo Build complete.
pause
