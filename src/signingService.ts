import * as ecc from 'tiny-secp256k1';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import { v4 as uuidv4 } from 'uuid';
import * as bitcoin from 'bitcoinjs-lib';

const ECPair = ECPairFactory(ecc);

/**
 * Manages cryptographic keys and signing operations.
 */
export class SigningService {
    private keyPairs: Map<string, ECPairInterface>;

    constructor() {
        this.keyPairs = new Map<string, ECPairInterface>();
    }

    /**
     * Creates a new private key and stores it, returning a unique ID for the key.
     * @returns {string} The unique ID for the newly created key.
     */
    public createPrivateKey(): string {
        const keyPair = ECPair.makeRandom();
        const keyId = uuidv4();
        this.keyPairs.set(keyId, keyPair);
        console.log(`Private key created with ID: ${keyId}`);
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
        return keyPair.publicKey.toString();
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
