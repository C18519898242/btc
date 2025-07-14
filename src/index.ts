import logger from './logger';
import { monitorWallets } from './monitor';
import { generateWallet } from './wallet';

function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'generate':
            generateWallet();
            break;
        case 'monitor':
            monitorWallets();
            break;
        default:
            logger.info('Invalid command. Available commands: generate, monitor');
            console.log('Usage: npm start <command>');
            console.log('Examples:');
            console.log('  npm start generate   # Generate a new wallet');
            console.log('  npm start monitor    # Monitor balances of all wallets');
    }
}

main();
