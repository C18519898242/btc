import * as fs from 'fs';
import * as path from 'path';
import { WalletInfo } from '../wallet';
import { IWalletRepository } from './wallet.repository';
import logger from '../../logger';

export class JsonWalletRepository implements IWalletRepository {
    private readonly walletPath: string;

    constructor(walletPath: string) {
        this.walletPath = walletPath;
    }

    loadWallets(): WalletInfo[] {
        if (!fs.existsSync(this.walletPath)) {
            return [];
        }
        const fileContent = fs.readFileSync(this.walletPath, 'utf-8');
        return JSON.parse(fileContent);
    }

    saveWallet(wallet: WalletInfo): void {
        const wallets = this.loadWallets();
        wallets.push(wallet);
        fs.writeFileSync(this.walletPath, JSON.stringify(wallets, null, 2));
        logger.info(`Successfully saved new wallet to ${this.walletPath}. Total wallets: ${wallets.length}`);
    }
}
