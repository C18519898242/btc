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

async function getBalance(address: string): Promise<number> {
    const networkConfig = config.networks[config.network as keyof typeof config.networks];
    const url = `${networkConfig.api_url}/address/${address}/utxo`;
    try {
        const { data: utxos } = await axios.get<Utxo[]>(url);
        const balance = utxos
            .filter(utxo => utxo.status.confirmed)
            .reduce((acc, utxo) => acc + utxo.value, 0);
        return balance;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            logger.warn(`地址 ${address} 没有交易记录。`);
            return 0;
        }
        logger.error(`获取地址 ${address} 余额时出错:`, error);
        throw error;
    }
}

export async function monitorWallets() {
    logger.info(`开始监控 ${config.network} 上的钱包...`);
    if (!fs.existsSync(walletPath)) {
        logger.warn('wallet.json 文件不存在。请先生成钱包。');
        return;
    }

    const allWallets: Wallet[] = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    if (!Array.isArray(allWallets) || allWallets.length === 0) {
        logger.warn('wallet.json 中没有找到钱包。');
        return;
    }

    // 根据当前网络过滤钱包
    const walletsToMonitor = allWallets.filter(w => w.network === config.network);

    if (walletsToMonitor.length === 0) {
        logger.warn(`在 wallet.json 中没有找到 ${config.network} 的钱包。`);
        return;
    }

    logger.info(`找到 ${walletsToMonitor.length} 个 ${config.network} 钱包进行监控。`);

    for (const wallet of walletsToMonitor) {
        try {
            const balance = await getBalance(wallet.address);
            logger.info(`地址: ${wallet.address} | 余额: ${balance} satoshis`);
        } catch (error) {
            // 错误已在 getBalance 中记录
        }
    }
}
