import * as bitcoin from 'bitcoinjs-lib';
import { Api } from './api/api';
import { getApi } from './api';
import { Wallet } from './wallet';
import logger from './logger';
import { SigningService } from './service/signingService';
import { MockSigningService } from './service/mockSigningService';

export enum CoinKey {
    BTC = 'BTC',
    BTC_TESTNET = 'BTC_TEST_BITCOIN_TESTNET',
}

export interface InputTransaction {
    customerRefId: string;
    customerExt1: string;
    customerExt2: string;
    note: string;
    coinKey: CoinKey;
    txAmount: string;
    txFeeLevel: string;
    sourceAccountKey: string;
    destinationAccountKey: string;
    destinationAccountType: string;
    destinationAddress: string;
}

export class Transaction {
    private api: Api;
    private wallet: Wallet;
    private signingService: SigningService;

    constructor() {
        this.api = getApi();
        this.wallet = new Wallet();
        this.signingService = new MockSigningService();
    }

    async create(tx: InputTransaction): Promise<bitcoin.Psbt> {
        let network: bitcoin.Network;
        switch (tx.coinKey) {
            case CoinKey.BTC:
                network = bitcoin.networks.bitcoin;
                break;
            case CoinKey.BTC_TESTNET:
                network = bitcoin.networks.testnet;
                break;
            default:
                throw new Error(`Unsupported coinKey: ${tx.coinKey}`);
        }

        // Find source wallet by ID
        const sourceWallet = this.wallet.getWalletById(tx.sourceAccountKey);
        if (!sourceWallet) {
            throw new Error(`Source wallet not found for ID: ${tx.sourceAccountKey}`);
        }
        const sourceAddress = sourceWallet.address;

        // Get and log balance
        const utxos = await this.api.getUtxos(sourceAddress);
        const totalBalance = utxos.reduce((acc, utxo) => acc + utxo.value, 0);
        const amountToSend = Math.floor(parseFloat(tx.txAmount) * 100_000_000);
        logger.info(`Source wallet ${sourceAddress} balance: ${totalBalance} satoshis.`);
        logger.info(`Attempting to send: ${amountToSend} satoshis.`);

        // Determine destination address
        let destinationAddress: string;
        if (tx.destinationAccountType === 'VAULT_ACCOUNT') {
            const destWallet = this.wallet.getWalletById(tx.destinationAccountKey);
            if (!destWallet) {
                throw new Error(`Destination wallet not found for ID: ${tx.destinationAccountKey}`);
            }
            destinationAddress = destWallet.address;
        } else if (tx.destinationAccountType === 'ONE_TIME_ADDRESS') {
            destinationAddress = tx.destinationAddress;
        } else {
            throw new Error(`Invalid destinationAccountType: ${tx.destinationAccountType}`);
        }

        // Determine fee
        const feeRates = { LOW: 5000, MEDIUM: 10000, HIGH: 15000 };
        const fee = feeRates[tx.txFeeLevel as keyof typeof feeRates] || feeRates.MEDIUM;

        const psbt = new bitcoin.Psbt({ network });
        let totalInput = 0;

        // Use both confirmed and unconfirmed UTXOs
        for (const utxo of utxos) {
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                nonWitnessUtxo: Buffer.from(
                    await this.api.getTxHex(utxo.txid),
                    'hex'
                ),
            });
            totalInput += utxo.value;
        }

        psbt.addOutput({
            address: destinationAddress,
            value: amountToSend,
        });

        const change = totalInput - amountToSend - fee;
        if (change < 0) {
            throw new Error('Insufficient funds for transaction');
        }
        if (change > 0) {
            psbt.addOutput({
                address: sourceAddress,
                value: change,
            });
        }

        logger.info('PSBT created successfully. Ready for signing.');
        return psbt;
    }

    async sendTx(psbt: bitcoin.Psbt, walletId: string): Promise<string> {
        const pubkeyHex = this.signingService.getPublicKey(walletId);
        const signer = {
            publicKey: Buffer.from(pubkeyHex, 'hex'),
            sign: (hash: Buffer): Buffer => {
                const signatureHex = this.signingService.sign(walletId, hash);
                return Buffer.from(signatureHex, 'hex');
            },
        };

        psbt.signAllInputs(signer);
        psbt.finalizeAllInputs();

        const txHex = psbt.extractTransaction().toHex();
        return this.api.sendTx(txHex);
    }
}
