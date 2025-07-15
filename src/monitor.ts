import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import config from '../config.json';
import { Wallet } from './wallet';
import { getApi } from './api';
import { Api } from './api/api';

interface WalletConfig {
    id: string;
    address: string;
    keyId: string;
    publicKey: string;
    network: string;
}

const walletPath = path.join(__dirname, '..', 'wallet.json');

export async function monitorWallets() {
    logger.info(`Starting to monitor on ${config.network}...`);

    const api = getApi();
    let lastBlockHeight = 0;

    const monitor = async () => {
        try {
            const currentBlockHeight = await api.getBlockHeight();
            logger.info(`Current block height: ${currentBlockHeight}, last recorded height: ${lastBlockHeight}`);

            if (currentBlockHeight > lastBlockHeight) {
                logger.info(`New block detected! Height: ${currentBlockHeight}. Checking wallet balances.`);
                lastBlockHeight = currentBlockHeight;

                if (!fs.existsSync(walletPath)) {
                    logger.warn('wallet.json file not found. Please generate a wallet first.');
                    return;
                }

                const allWallets: WalletConfig[] = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
                if (!Array.isArray(allWallets) || allWallets.length === 0) {
                    logger.warn('No wallets found in wallet.json.');
                    return;
                }

                const walletsToMonitor = allWallets.filter(w => w.network === config.network);

                if (walletsToMonitor.length === 0) {
                    logger.warn(`No wallets found for the ${config.network} network in wallet.json.`);
                    return;
                }

                logger.info(`Found ${walletsToMonitor.length} ${config.network} wallet(s) to monitor.`);

                const wallet = new Wallet();
                for (const walletConfig of walletsToMonitor) {
                    try {
                        const balance = await wallet.getBalance(walletConfig.address);
                        const btcBalance = balance.confirmed / 100_000_000;
                        const pendingBtc = balance.unconfirmed / 100_000_000;
                        logger.info(`Address: ${walletConfig.address} | Current Balance: ${btcBalance.toFixed(8)} BTC | Pending: ${pendingBtc.toFixed(8)} BTC`);
                    } catch (error) {
                        logger.error(`Error fetching balance for wallet ${walletConfig.address}:`, error);
                    }
                }
            }
        } catch (error) {
            logger.error('Error during monitoring cycle:', error);
        }
    };

    // Run once immediately and then set interval
    monitor();
    setInterval(monitor, 60 * 1000);
}
