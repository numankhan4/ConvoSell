const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const isWindows = os.platform() === 'win32';
const projectRoot = __dirname;

console.log('============================================');
console.log('WhatsApp CRM - Starting All Services');
console.log('============================================\n');

// Start Docker containers
console.log('[1/4] Starting Docker containers...');
const dockerCompose = spawn(isWindows ? 'docker-compose.exe' : 'docker-compose', ['up', '-d'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

dockerCompose.on('close', (code) => {
  if (code !== 0) {
    console.error('Failed to start Docker containers');
    process.exit(1);
  }

  console.log('\n[2/4] Starting Backend API...');
  setTimeout(() => {
    const backend = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'start:dev'], {
      cwd: path.join(projectRoot, 'backend'),
      stdio: 'inherit',
      shell: true,
    });

    console.log('[3/4] Starting Worker...');
    setTimeout(() => {
      const worker = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'start:dev'], {
        cwd: path.join(projectRoot, 'worker'),
        stdio: 'inherit',
        shell: true,
      });

      console.log('[4/4] Starting Frontend...');
      setTimeout(() => {
        const frontend = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
          cwd: path.join(projectRoot, 'frontend'),
          stdio: 'inherit',
          shell: true,
        });

        console.log('\n============================================');
        console.log('All services started!');
        console.log('============================================\n');
        console.log('Frontend:     http://localhost:3004');
        console.log('Backend API:  http://localhost:3000/api');
        console.log('Database:     PostgreSQL on localhost:5432');
        console.log('Cache:        Redis on localhost:6379\n');
        console.log('Press Ctrl+C to stop all services');
        console.log('============================================\n');

        // Handle Ctrl+C
        process.on('SIGINT', () => {
          console.log('\nShutting down services...');
          backend.kill();
          worker.kill();
          frontend.kill();
          process.exit(0);
        });
      }, 3000);
    }, 3000);
  }, 5000);
});
