import * as ecc from 'tiny-secp256k1';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import { v4 as uuidv4 } from 'uuid';
import * as bitcoin from 'bitcoinjs-lib';
import * as fs from 'fs';
import logger from './logger';

const ECPair = ECPairFactory(ecc);

/**
 * Manages cryptographic keys and signing operations, with persistence.
 */
export class SigningService {
    private keyPairs: Map<string, ECPairInterface>;
    private readonly filePath: string;

    constructor() {
        this.filePath = 'keys.json';
        this.keyPairs = new Map<string, ECPairInterface>();
        this.loadKeyPairs();
    }

    /**
     * Loads key pairs from the JSON file.
     */
    private loadKeyPairs(): void {
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
                    logger.info(`Loaded ${this.keyPairs.size} keys from ${this.filePath}`);
                }
            }
        } catch (error) {
            logger.error(`Error loading key pairs from ${this.filePath}:`, error);
        }
    }

    /**
     * Saves the current key pairs to the JSON file.
     */
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

    /**
     * Creates a new private key, stores it, and saves it to the file.
     * @returns {string} The unique ID for the newly created key.
     */
    public createPrivateKey(): string {
        const keyPair = ECPair.makeRandom();
        const keyId = uuidv4();
        this.keyPairs.set(keyId, keyPair);
        logger.info(`Private key created with ID: ${keyId}`);
        this.saveKeyPairs();
        return keyId;
    }

    /**
     * Retrieves the public key associated with the given key ID.
     * @param {string} keyId The unique ID of the key.
     * @returns {string} The public key in hex format.
     * @throws {Error} If the key ID is not found.
     */
    public getPublicKey(keyId: string): string {
        const keyPair = this.keyPairs.get(keyId);
        if (!keyPair) {
            throw new Error('Key ID not found');
        }
        // Manual buffer to hex conversion to bypass potential toString override issues
        return keyPair.publicKey.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    }

    /**
     * Signs a data hash using the private key associated with the given key ID.
     * @param {string} keyId The unique ID of the key.
     * @param {Buffer} dataToSign The data (hash) to be signed.
     * @returns {string} The signature in hex format.
     * @throws {Error} If the key ID is not found.
     */
    public sign(keyId: string, dataToSign: Buffer): string {
        const keyPair = this.keyPairs.get(keyId);
        if (!keyPair) {
            throw new Error('Key ID not found');
        }
        const signature = keyPair.sign(dataToSign);
        return bitcoin.script.signature.encode(Buffer.from(signature), bitcoin.Transaction.SIGHASH_ALL).toString('hex');
    }
}
