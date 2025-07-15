import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { payments, Network } from 'bitcoinjs-lib';
import { SigningService } from './signingService';

const ECPair = ECPairFactory(ecc);

export class MockSigningService implements SigningService {
    private keys: Map<string, string> = new Map();

    createPrivateKey(): string {
        const keyPair = ECPair.makeRandom();
        const keyId = keyPair.publicKey.toString('hex');
        this.keys.set(keyId, keyPair.toWIF());
        return keyId;
    }

    getPublicKey(keyId: string): string {
        const wif = this.keys.get(keyId);
        if (!wif) {
            throw new Error('Key not found');
        }
        const keyPair = ECPair.fromWIF(wif);
        return keyPair.publicKey.toString('hex');
    }

    sign(keyId: string, dataToSign: Buffer): string {
        const wif = this.keys.get(keyId);
        if (!wif) {
            throw new Error('Key not found');
        }
        const keyPair = ECPair.fromWIF(wif);
        return keyPair.sign(dataToSign).toString('hex');
    }

    getAddress(keyId: string, network: Network): string {
        const wif = this.keys.get(keyId);
        if (!wif) {
            throw new Error('Key not found');
        }
        const keyPair = ECPair.fromWIF(wif);
        const { address } = payments.p2pkh({ pubkey: Buffer.from(keyPair.publicKey), network });
        if (!address) {
            throw new Error('Could not generate address');
        }
        return address;
    }
}
