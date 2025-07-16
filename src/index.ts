import * as path from 'path';
import { monitorWallets } from './monitor';
import { Wallet } from './wallet';
import { WalletManager } from './walletManager';
import logger from './logger';
import { getApi } from './api';
import config from '../config.json';

const walletPath = path.join(__dirname, '..', 'wallet.json');

async function main() {
    const args = process.argv.slice(2);
    const walletManager = new WalletManager();

    if (args[0] === 'generate') {
        const count = args[1] ? parseInt(args[1], 10) : 1;
        if (isNaN(count)) {
            logger.error('Invalid number of wallets to generate.');
            return;
        }

        logger.info(`Generating ${count} testnet wallets...`);

        const wallet = new Wallet();

        for (let i = 0; i < count; i++) {
            const newWallet = await wallet.createWallet();
            walletManager.saveWallet(newWallet);
        }

    } else if (args[0] === 'monitor') {
        await monitorWallets();
    } else if (args[0] === 'import-wallets') {
        if (config.api_provider !== 'btc-node') {
            logger.error("Wallet import is only supported for 'btc-node' api_provider.");
            return;
        }

        const allWallets = walletManager.loadWallets();
        if (allWallets.length === 0) {
            logger.error('wallet.json file not found or is empty.');
            return;
        }
        const testnetWallets = allWallets.filter((w: any) => w.network === 'testnet');

        if (testnetWallets.length === 0) {
            logger.info('No testnet wallets found in wallet.json to import.');
            return;
        }

        logger.info(`Found ${testnetWallets.length} testnet wallets. Importing...`);

        const api = getApi();

        for (const wallet of testnetWallets) {
            try {
                logger.info(`Importing address: ${wallet.address}`);
                await api.importWallet(wallet.address);
                logger.info(`Successfully imported and rescanned for address: ${wallet.address}`);
            } catch (error) {
                logger.error(`Failed to import address ${wallet.address}:`, error);
            }
        }

        logger.info('Finished importing all testnet wallets.');

    } else {
        logger.info('No command specified. Starting monitor by default.');
        await monitorWallets();
    }
}

main().catch(error => {
    logger.error('An unexpected error occurred:', error);
});
