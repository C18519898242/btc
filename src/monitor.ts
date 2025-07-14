import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import config from '../config.json';

interface Wallet {
    address: string;
    privateKey: string;
    publicKey: string;
    network: string;
}

interface Utxo {
    txid: string;
    vout: number;
    status: {
        confirmed: boolean;
        block_height: number;
        block_hash: string;
        block_time: number;
    };
    value: number;
}

const walletPath = path.join(__dirname, '..', 'wallet.json');

interface Balance {
    confirmed: number;
    unconfirmed: number;
}

async function getBalance(address: string): Promise<Balance> {
    const networkConfig = config.networks[config.network as keyof typeof config.networks];
    const url = `${networkConfig.api_url}/address/${address}/utxo`;
    try {
        const { data: utxos } = await axios.get<Utxo[]>(url);
        const confirmed = utxos
            .filter(utxo => utxo.status.confirmed)
            .reduce((acc, utxo) => acc + utxo.value, 0);
        const unconfirmed = utxos
            .filter(utxo => !utxo.status.confirmed)
            .reduce((acc, utxo) => acc + utxo.value, 0);
        return { confirmed, unconfirmed };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            logger.warn(`No transactions found for address ${address}.`);
            return { confirmed: 0, unconfirmed: 0 };
        }
        logger.error(`Error fetching balance for address ${address}:`, error);
        throw error;
    }
}

export async function monitorWallets() {
    logger.info(`Starting to monitor wallets on ${config.network}...`);

    const monitor = async () => {
        if (!fs.existsSync(walletPath)) {
            logger.warn('wallet.json file not found. Please generate a wallet first.');
            return;
        }

        const allWallets: Wallet[] = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
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

        for (const wallet of walletsToMonitor) {
            try {
                const balance = await getBalance(wallet.address);
                const btcBalance = balance.confirmed / 100_000_000;
                logger.info(`Address: ${wallet.address} | Current Balance: ${btcBalance.toFixed(8)} BTC`);
            } catch (error) {
                // Error is already logged in getBalance
            }
        }
    };

    // Run immediately and then every minute
    monitor();
    setInterval(monitor, 60 * 1000);
}
