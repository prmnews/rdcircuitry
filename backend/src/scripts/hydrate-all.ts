/**
 * Master hydration script to run all hydration scripts in sequence
 * TypeScript version
 */
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

// Define the scripts to run in order
const scripts = [
  { name: 'Countries', file: 'src/scripts/hydrate-countries.ts' },
  { name: 'Users', file: 'src/scripts/hydrate-users.ts' },
  { name: 'API Keys', file: 'src/scripts/hydrate-apiKeys.ts' },
  { name: 'State', file: 'src/scripts/hydrate-state.ts' },
  { name: 'Events', file: 'src/scripts/hydrate-events.ts' },
  { name: 'Message Timer', file: 'src/scripts/hydrate-messageTimer.ts' }
];

/**
 * Prompt for confirmation with a question
 */
function promptForConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Run a script using ts-node
 */
function runScript(scriptPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n🚀 Running ${path.basename(scriptPath)}...`);
    
    const tsNode = process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node';
    const child = spawn(tsNode, [scriptPath], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Script ${path.basename(scriptPath)} completed successfully`);
        resolve(true);
      } else {
        console.error(`❌ Script ${path.basename(scriptPath)} failed with code ${code}`);
        resolve(false);
      }
    });
  });
}

/**
 * Main function to run all hydration scripts in sequence
 */
async function hydrateAll(): Promise<void> {
  console.log('🔍 Starting complete database hydration...');
  
  // Validate environment variables
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  if (!process.env.MONGODB_DB) {
    console.error('❌ MONGODB_DB is not defined in .env.local');
    process.exit(1);
  }
  
  // Get confirmation before proceeding
  const confirm = await promptForConfirmation(
    'This will run ALL hydration scripts in sequence. Are you sure you want to continue? (y/n): '
  );
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('ℹ️ Operation cancelled');
    process.exit(0);
  }
  
  // Run each script in sequence
  const results = [];
  
  for (const script of scripts) {
    console.log(`\n📦 Hydrating ${script.name}...`);
    const scriptPath = path.join(__dirname, script.file);
    const success = await runScript(scriptPath);
    
    results.push({
      name: script.name,
      success
    });
    
    // If a script fails, ask whether to continue
    if (!success) {
      const continueAnyway = await promptForConfirmation(
        `The ${script.name} hydration script failed. Continue with the next script? (y/n): `
      );
      
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log('ℹ️ Hydration sequence cancelled');
        break;
      }
    }
  }
  
  // Report overall results
  console.log('\n📋 Hydration Results:');
  
  let allSuccess = true;
  results.forEach(result => {
    const status = result.success ? '✅ Success' : '❌ Failed';
    console.log(`   ${result.name}: ${status}`);
    if (!result.success) allSuccess = false;
  });
  
  if (allSuccess) {
    console.log('\n🎉 All hydration scripts completed successfully!');
  } else {
    console.log('\n⚠️ Some hydration scripts failed. Check the logs above for details.');
  }
}

// Run the script
hydrateAll().catch(error => {
  console.error('💥 Master hydration script failed:', error);
  process.exit(1);
}); 