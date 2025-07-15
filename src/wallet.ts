import * as fs from 'fs';
import * as path from 'path';
import { Api } from './api/api';

const walletPath = path.join(__dirname, '..', 'wallet.json');

export class Wallet {
    private api: Api;

    constructor(api: Api) {
        this.api = api;
    }

    getWalletByAddress(address: string) {
        if (!fs.existsSync(walletPath)) {
            throw new Error('wallet.json not found');
        }
        const wallets = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
        return wallets.find((w: any) => w.address === address);
    }

    getWalletById(id: string) {
        if (!fs.existsSync(walletPath)) {
            throw new Error('wallet.json not found');
        }
        const wallets = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
        return wallets.find((w: any) => w.id === id);
    }

    async getBalance(address: string): Promise<{ confirmed: number; unconfirmed: number }> {
        const utxos = await this.api.getUtxos(address);
        const confirmed = utxos
            .filter(utxo => utxo.status.confirmed)
            .reduce((acc, utxo) => acc + utxo.value, 0);
        const unconfirmed = utxos
            .filter(utxo => !utxo.status.confirmed)
            .reduce((acc, utxo) => acc + utxo.value, 0);
        return { confirmed, unconfirmed };
    }
}
