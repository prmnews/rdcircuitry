/**
 * Cross-platform script to start both frontend and backend services
 * Compatible with both Windows and Replit
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

console.log('🚀 Starting RDCircuitry application...');

// Set up the frontend and backend processes
const frontendPath = path.join(__dirname, 'frontend');
const backendPath = path.join(__dirname, 'backend');

// For Replit compatibility, run the frontend process with log prefixing
console.log('📱 Starting frontend service...');
const frontendProcess = spawn(npmCmd, ['start'], {
  cwd: frontendPath,
  shell: true,
  stdio: 'pipe' // Capture output so we can prefix it
});

// Prefix frontend logs with [FRONTEND]
frontendProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.log(`[FRONTEND] ${line}`);
  });
});

frontendProcess.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.error(`[FRONTEND] ${line}`);
  });
});

// Add a short delay before starting backend
console.log('⌛ Waiting for frontend initialization (2s)...');
setTimeout(() => {
  // Start backend with log prefixing
  console.log('⚙️ Starting backend service...');
  const backendProcess = spawn(npmCmd, ['start'], {
    cwd: backendPath,
    shell: true,
    stdio: 'pipe' // Capture output so we can prefix it
  });

  // Prefix backend logs with [BACKEND]
  backendProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) console.log(`[BACKEND] ${line}`);
    });
  });

  backendProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) console.error(`[BACKEND] ${line}`);
    });
  });

  // Handle process exits
  frontendProcess.on('exit', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    if (backendProcess.exitCode === null) {
      console.log('Shutting down backend process...');
      backendProcess.kill();
    }
    process.exit(code || 0);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (frontendProcess.exitCode === null) {
      console.log('Shutting down frontend process...');
      frontendProcess.kill();
    }
    process.exit(code || 0);
  });
}, 2000);

// Handle script termination
process.on('SIGINT', () => {
  console.log('Stopping all services...');
  try {
    if (frontendProcess) frontendProcess.kill();
    if (backendProcess) backendProcess.kill();
  } catch (err) {
    console.error('Error while shutting down:', err);
  }
  process.exit(0);
}); 