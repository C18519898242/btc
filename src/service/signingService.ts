import { Network } from 'bitcoinjs-lib';

/**
 * Defines the interface for a signing service.
 */
export interface SigningService {
    /**
     * Creates a new private key and stores it, returning a unique ID for the key.
     * @returns {string} The unique ID for the newly created key.
     */
    createPrivateKey(): string;

    /**
     * Retrieves the public key associated with the given key ID.
     * @param {string} keyId The unique ID of the key.
     * @returns {string} The public key in hex format.
     */
    getPublicKey(keyId: string): string;

    /**
     * Signs a data hash using the private key associated with the given key ID.
     * @param {string} keyId The unique ID of the key.
     * @param {Buffer} dataToSign The data (hash) to be signed.
     * @returns {string} The signature in hex format.
     */
    sign(keyId: string, dataToSign: Buffer): string;

    /**
     * Gets the P2PKH address for a given key and network.
     * @param keyId The private key in WIF format.
     * @param network The network (mainnet or testnet).
     * @returns The P2PKH address.
     */
    getAddress(keyId: string, network: Network): string;
}
