import * as ecc from 'tiny-secp256k1';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import { v4 as uuidv4 } from 'uuid';
import * as bitcoin from 'bitcoinjs-lib';
import * as fs from 'fs';
import logger from './logger';
import { SigningService } from './signingService';

const ECPair = ECPairFactory(ecc);

/**
 * A mock implementation of the SigningService that persists keys to a local JSON file.
 */
export class MockSigningService implements SigningService {
    private keyPairs: Map<string, ECPairInterface>;
    private readonly filePath: string;

    constructor() {
        this.filePath = 'keys.json';
        this.keyPairs = new Map<string, ECPairInterface>();
        this.loadKeyPairs();
    }

    private loadKeyPairs(): void {
        // Load from keys.json (its own managed keys)
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                if (data) {
                    const keyPairsWIF = JSON.parse(data);
                    for (const keyId in keyPairsWIF) {
                        if (Object.prototype.hasOwnProperty.call(keyPairsWIF, keyId)) {
                            const wif = keyPairsWIF[keyId];
                            const keyPair = ECPair.fromWIF(wif);
                            this.keyPairs.set(keyId, keyPair);
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`Error loading key pairs from ${this.filePath}:`, error);
        }

        // Also load from wallet.json to be aware of test wallets
        try {
            const walletPath = 'wallet.json';
            if (fs.existsSync(walletPath)) {
                const wallets = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
                const networkMap = {
                    'testnet': bitcoin.networks.testnet,
                    'testnet4': bitcoin.networks.testnet,
                    'mainnet': bitcoin.networks.bitcoin,
                };
                for (const wallet of wallets) {
                    if (wallet.id && wallet.privateKey && !this.keyPairs.has(wallet.id)) {
                        const network = networkMap[wallet.network as keyof typeof networkMap] || bitcoin.networks.testnet;
                        const keyPair = ECPair.fromWIF(wallet.privateKey, network);
                        this.keyPairs.set(wallet.id, keyPair);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error loading key pairs from wallet.json:`, error);
        }
        logger.info(`Loaded a total of ${this.keyPairs.size} keys`);
    }

    private saveKeyPairs(): void {
        try {
            const keyPairsWIF: { [keyId: string]: string } = {};
            this.keyPairs.forEach((keyPair, keyId) => {
                keyPairsWIF[keyId] = keyPair.toWIF();
            });
            fs.writeFileSync(this.filePath, JSON.stringify(keyPairsWIF, null, 4));
            logger.info(`Saved ${this.keyPairs.size} keys to ${this.filePath}`);
        } catch (error) {
            logger.error(`Error saving key pairs to ${this.filePath}:`, error);
        }
    }

    public createPrivateKey(): string {
        const keyPair = ECPair.makeRandom();
        const keyId = uuidv4();
        this.keyPairs.set(keyId, keyPair);
        logger.info(`Private key created with ID: ${keyId}`);
        this.saveKeyPairs();
        return keyId;
    }

    public getPublicKey(keyId: string): string {
        const keyPair = this.keyPairs.get(keyId);
        if (!keyPair) {
            throw new Error('Key ID not found');
        }
        return keyPair.publicKey.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    }

    public sign(keyId: string, dataToSign: Buffer): string {
        const keyPair = this.keyPairs.get(keyId);
        if (!keyPair) {
            throw new Error('Key ID not found');
        }
        const signature = keyPair.sign(dataToSign);
        // The raw signature is returned, the caller is responsible for encoding it correctly
        return Buffer.from(signature).toString('hex');
    }
}
