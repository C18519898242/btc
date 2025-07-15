import * as bitcoin from 'bitcoinjs-lib';
import { Api } from './api/api';
import logger from './logger';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config.json';

const walletPath = path.join(__dirname, '..', 'wallet.json');

export interface InputTransaction {
    customerRefId: string;
    customerExt1: string;
    customerExt2: string;
    note: string;
    coinKey: string;
    txAmount: string;
    txFeeLevel: string;
    sourceAccountKey: string;
    destinationAccountKey: string;
    destinationAccountType: string;
    destinationAddress: string;
}

function getWalletById(id: string) {
    if (!fs.existsSync(walletPath)) {
        throw new Error('wallet.json not found');
    }
    const wallets = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    return wallets.find((w: any) => w.id === id);
}

export class Transaction {
    private api: Api;

    constructor(api: Api) {
        this.api = api;
    }

    async create(tx: InputTransaction): Promise<bitcoin.Psbt> {
        const networkName = config.network as keyof typeof config.networks;
        const network = networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

        // Find source wallet by ID
        const sourceWallet = getWalletById(tx.sourceAccountKey);
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
            const destWallet = getWalletById(tx.destinationAccountKey);
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
}
