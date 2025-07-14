import axios from 'axios';
import { Balance, Provider, InputTransaction } from './provider';
import { SigningService } from '../signingService';
import logger from '../logger';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import * as fs from 'fs';
import * as path from 'path';
import config from '../../config.json';

const ECPair = ECPairFactory(ecc);
const walletPath = path.join(__dirname, '..', '..', 'wallet.json');

function getWalletByAddress(address: string) {
    if (!fs.existsSync(walletPath)) {
        throw new Error('wallet.json not found');
    }
    const wallets = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    return wallets.find((w: any) => w.address === address);
}

export class BlockstreamProvider implements Provider {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async getBalance(address: string): Promise<Balance> {
        const url = `${this.apiUrl}/address/${address}/utxo`;
        try {
            const { data: utxos } = await axios.get<any[]>(url);
            const confirmed = utxos
                .filter(utxo => utxo.status.confirmed)
                .reduce((acc, utxo) => acc + utxo.value, 0);
            // Blockstream API does not provide unconfirmed balance in the same way
            const unconfirmed = utxos
                .filter(utxo => !utxo.status.confirmed)
                .reduce((acc, utxo) => acc + utxo.value, 0);
            return { confirmed, unconfirmed };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                logger.warn(`No transactions found for address ${address}.`);
                return { confirmed: 0, unconfirmed: 0 };
            }
            logger.error(`Error fetching balance for address ${address}:`, error);
            throw error;
        }
    }

    async createTransaction(tx: InputTransaction): Promise<bitcoin.Psbt> {
        const networkName = config.network as keyof typeof config.networks;
        const network = networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

        const sourceWallet = getWalletByAddress(tx.sourceAccountKey);
        if (!sourceWallet) {
            throw new Error(`Source wallet not found for address: ${tx.sourceAccountKey}`);
        }

        const { data: utxos } = await axios.get(`${this.apiUrl}/address/${tx.sourceAccountKey}/utxo`);

        const psbt = new bitcoin.Psbt({ network });
        const amountToSend = Math.floor(parseFloat(tx.txAmount) * 100_000_000);
        const fee = 10000;
        let totalInput = 0;

        for (const utxo of utxos) {
            if (utxo.status.confirmed) {
                psbt.addInput({
                    hash: utxo.txid,
                    index: utxo.vout,
                    nonWitnessUtxo: Buffer.from(
                        (await axios.get(`${this.apiUrl}/tx/${utxo.txid}/hex`)).data,
                        'hex'
                    ),
                });
                totalInput += utxo.value;
            }
        }

        psbt.addOutput({
            address: tx.destinationAddress,
            value: amountToSend,
        });

        const change = totalInput - amountToSend - fee;
        if (change < 0) {
            throw new Error('Insufficient funds for transaction');
        }
        if (change > 0) {
            psbt.addOutput({
                address: tx.sourceAccountKey,
                value: change,
            });
        }

        logger.info('PSBT created successfully. Ready for signing.');
        return psbt;
    }

    async sendTx(psbt: bitcoin.Psbt, signingService: SigningService, walletId: string): Promise<string> {
        const pubkeyHex = signingService.getPublicKey(walletId);
        const signer = {
            publicKey: Buffer.from(pubkeyHex, 'hex'),
            sign: (hash: Buffer): Buffer => {
                const signatureHex = signingService.sign(walletId, hash);
                return Buffer.from(signatureHex, 'hex');
            },
        };

        psbt.signAllInputs(signer);
        psbt.finalizeAllInputs();

        const txHex = psbt.extractTransaction().toHex();
        const { data: txid } = await axios.post(`${this.apiUrl}/tx`, txHex);
        return txid;
    }
}
