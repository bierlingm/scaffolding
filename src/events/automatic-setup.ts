import { execSync } from 'child_process';
import { chdir } from 'process';
import macosRelease from 'macos-release';
import os from 'os';

const installNixCommands = ['sh <(curl -L -k https://nixos.org/nix/install)', '. ~/.nix-profile/etc/profile.d/nix.sh'];

const localCommands = ['nix-shell . --run "npm install"'];

const globalCommands = ['nix-env -iA cachix -f https://cachix.org/api/v1/install', 'cachix use holochain-ci'];

export async function automaticSetup(happName: string) {
  console.log('> Automatic Setup: we are about to execute these commands:');
  console.log('');

  for (const command of [...installNixCommands, ...globalCommands, `cd ${happName}`, ...localCommands]) {
    console.log(command);
  }

  console.log('');

  try {
    if (isNixInstalled()) {
      console.log(`> Automatic setup: nix is already installed, skipping`);
    } else {
      await installNix(happName);
    }

    globalCommands.forEach(execute);

    console.log(`> Automatic setup: cd ${happName}`);

    chdir(happName);
    console.log('');

    localCommands.forEach(execute);

    console.log('> Automatic setup: setup completed!');
    console.log('');
  } catch (e) {
    console.error('> Automatic setup: there was an error executing the automatic setup, exiting...');
    process.exit();
  }
  console.log(`To get started, execute these commands: 
  
    cd ${happName}
    nix-shell
    npm run build:happ
    npm start
`);

  process.exit();
}

function execute(command: string) {
  console.log('> Automatic Setup: ', command);
  console.log('');
  execSync(command, {
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  console.log('');
}

async function installNix(happName: string) {
  try {
    if (isMacCatalinaOrMore()) {
      try {
        execute('sh <(curl -L https://nixos.org/nix/install) --darwin-use-unencrypted-nix-store-volume');
      } catch (e) {
        console.log('> Automatic setup: Could not install NixOs.');
        console.log('');
        console.log(
          'It seems you are running MacOs 10.15 or greater, where there is a problem with nix and its read-only file-system. You can fix it by following these instructions:',
        );
        console.log('');
        console.log('1. Run this command:');
        console.log('');
        console.log('    csrutil disable');
        console.log('');
        console.log('2. Restart your MacOs.');
        console.log('3. After the restart, run this commands:');
        console.log('');
        console.log('    sudo mount -uw /');
        console.log('    sh <(curl -L https://nixos.org/nix/install) --darwin-use-unencrypted-nix-store-volume');
        console.log('');
        console.log(
          '4. At this point, nix-shell should be installed in your system. You should be ready to setup your hApp as normal with:',
        );
        console.log('');
        console.log(`    cd ${happName}`);
        console.log('    nix-shell');
        console.log('    npm run build:happ');
        console.log('    npm start');
        console.log('');

        process.exit();
      }
    } else {
      execute('sh <(curl -L -k https://nixos.org/nix/install)');
    }

    execute('. ~/.nix-profile/etc/profile.d/nix.sh');

    if (!isNixInstalled()) {
      throw new Error(
        'Could not install Nix, try to install it manually at https://nixos.org/download.html#nix-quick-install',
      );
    }
  } catch (e) {
    console.error('There was an error installing Nix:', JSON.stringify(e));
  }
}

function isNixInstalled(): boolean {
  try {
    execSync('nix-shell --version', {
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    return true;
  } catch (e) {
    return false;
  }
}

export function isMacCatalinaOrMore() {
  if (os.platform() !== 'darwin') return false;
  let [majorStr, minorStr] = macosRelease().version.split('.'); //'10.8.0'
  const major = parseInt(majorStr);
  const minor = parseInt(minorStr);
  if (major === 10) return minor >= 15;
  else return major > 10;
}
