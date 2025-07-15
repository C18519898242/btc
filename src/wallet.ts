import * as fs from 'fs';
import * as path from 'path';
import * as bitcoin from 'bitcoinjs-lib';
import { v4 as uuidv4 } from 'uuid';
import { Api } from './api/api';
import { SigningService } from './service/signingService';
import { MockSigningService } from './service/mockSigningService';

const walletPath = path.join(__dirname, '..', 'wallet.json');

type WalletInfo = {
    id: string;
    address: string;
    publicKey: string;
    network: string;
};

type WalletCreatedCallback = (wallet: WalletInfo) => void;

export class Wallet {
    private api: Api;
    private signingService: SigningService;
    private onWalletCreatedCallbacks: WalletCreatedCallback[] = [];

    constructor(api: Api) {
        this.api = api;
        this.signingService = new MockSigningService();
    }

    addWalletCreatedListener(callback: WalletCreatedCallback) {
        this.onWalletCreatedCallbacks.push(callback);
    }

    createWallet(networkName: string) {
        const network = (bitcoin.networks as any)[networkName];
        if (!network) {
            throw new Error(`Invalid network: ${networkName}`);
        }

        const keyId = this.signingService.createPrivateKey();
        const publicKeyHex = this.signingService.getPublicKey(keyId);
        const publicKey = Buffer.from(publicKeyHex, 'hex');

        const { address } = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });

        if (!address) {
            throw new Error('Failed to generate address');
        }

        const newWallet: WalletInfo = {
            id: keyId,
            address,
            publicKey: publicKeyHex,
            network: networkName,
        };

        this.onWalletCreatedCallbacks.forEach(callback => callback(newWallet));

        return newWallet;
    }

    getWalletByAddress(address: string) {
        if (!fs.existsSync(walletPath)) {
            throw new Error('wallet.json not found');
        }
        const fileContent = fs.readFileSync(walletPath, 'utf-8');
        const wallets = JSON.parse(fileContent);
        return wallets.find((w: any) => w.address === address);
    }

    getWalletById(id: string) {
        if (!fs.existsSync(walletPath)) {
            throw new Error('wallet.json not found');
        }
        const fileContent = fs.readFileSync(walletPath, 'utf-8');
        const wallets = JSON.parse(fileContent);
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
