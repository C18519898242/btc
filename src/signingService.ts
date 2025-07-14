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
     * Signs all inputs of a PSBT for which the service holds the key.
     * @param {bitcoin.Psbt} psbt The PSBT to sign.
     * @param {string} keyId The ID of the key to use for signing.
     * @returns {bitcoin.Psbt} The signed PSBT.
     */
    signPsbt(psbt: import('bitcoinjs-lib').Psbt, keyId: string): import('bitcoinjs-lib').Psbt;
}
