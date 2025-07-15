import * as fs from 'fs';
import * as path from 'path';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { v4 as uuidv4 } from 'uuid';
import { Api } from './api/api';
import config from '../config.json';

const ECPair = ECPairFactory(ecc);
const walletPath = path.join(__dirname, '..', 'wallet.json');

export class Wallet {
    private api: Api;

    constructor(api: Api) {
        this.api = api;
    }

    static createWallet(networkName: string) {
        const network = (bitcoin.networks as any)[networkName];
        if (!network) {
            throw new Error(`Invalid network: ${networkName}`);
        }
        const keyPair = ECPair.makeRandom({ network });
        const { address } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network });

        if (!address) {
            throw new Error('Failed to generate address');
        }

        return {
            id: uuidv4(),
            address,
            privateKey: keyPair.toWIF(),
            publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
            network: networkName,
        };
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
