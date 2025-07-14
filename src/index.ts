import logger from './logger';
import { monitorWallets } from './monitor';
import { generateWallet } from './wallet';
import { createBtcTransaction, InputTransaction } from './transaction';
import * as fs from 'fs';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'generate':
            generateWallet();
            break;
        case 'monitor':
            monitorWallets();
            break;
        case 'create-tx':
            try {
                const txInput: InputTransaction = JSON.parse(fs.readFileSync(0, 'utf-8'));
                const psbt = await createBtcTransaction(txInput);
                console.log(psbt.toBase64());
            } catch (error) {
                logger.error('Error creating transaction:', error);
            }
            break;
        default:
            logger.info('Invalid command. Available commands: generate, monitor, create-tx');
            logger.info('Usage: npm start <command>');
            logger.info('Examples:');
            logger.info('  npm start generate   # Generate a new wallet');
            logger.info('  npm start monitor    # Monitor balances of all wallets');
            logger.info('  cat tx.json | npm start create-tx # Create a new transaction from a json file');
    }
}

main();
