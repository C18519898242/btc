import * as bitcoin from 'bitcoinjs-lib';
import config from '../../config.json';
import { Api } from '../api/api';
import { getApi, getAllApis } from '../api';
import { SigningService } from '../service/signingService';
import { MockSigningService } from '../service/mockSigningService';

export type WalletInfo = {
    id: string;
    address: string;
    publicKey: string;
    network: string;
};

export class Wallet {
    private api: Api;
    private signingService: SigningService;

    constructor() {
        this.api = getApi();
        this.signingService = new MockSigningService();
    }

    async createWallet() {
        const networkName = config.network;
        const network = (bitcoin.networks as any)[networkName];
        if (!network) {
            throw new Error(`Invalid network from config: ${networkName}`);
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

        const apis = getAllApis();
        for (const api of apis) {
            await api.importWallet(newWallet.address);
        }

        return newWallet;
    }

    async getBalance(address: string): Promise<{ confirmed: number; unconfirmed: number }> {
        const utxos = await this.api.getUtxos([address]);
        const confirmed = utxos
            .filter(utxo => utxo.status.confirmed)
            .reduce((acc, utxo) => acc + utxo.value, 0);
        const unconfirmed = utxos
            .filter(utxo => !utxo.status.confirmed)
            .reduce((acc, utxo) => acc + utxo.value, 0);
        return { confirmed, unconfirmed };
    }
}
