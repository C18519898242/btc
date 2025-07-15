import * as fs from 'fs';
import * as path from 'path';
import { monitorWallets } from './monitor';
import { Wallet } from './wallet';
import logger from './logger';

const walletPath = path.join(__dirname, '..', 'wallet.json');

async function main() {
    const args = process.argv.slice(2);

    if (args[0] === 'generate') {
        const count = args[1] ? parseInt(args[1], 10) : 1;
        if (isNaN(count)) {
            logger.error('Invalid number of wallets to generate.');
            return;
        }

        logger.info(`Generating ${count} testnet wallets...`);

        let existingWallets: any[] = [];
        if (fs.existsSync(walletPath)) {
            const fileContent = fs.readFileSync(walletPath, 'utf-8');
            existingWallets = JSON.parse(fileContent);
        }

        for (let i = 0; i < count; i++) {
            const newWallet = Wallet.createWallet('testnet');
            existingWallets.push(newWallet);
        }

        fs.writeFileSync(walletPath, JSON.stringify(existingWallets, null, 2));
        logger.info(`Successfully generated and saved ${count} new wallets to wallet.json.`);

    } else if (args[0] === 'monitor') {
        await monitorWallets();
    } else {
        logger.info('No command specified. Starting monitor by default.');
        await monitorWallets();
    }
}

main().catch(error => {
    logger.error('An unexpected error occurred:', error);
});
