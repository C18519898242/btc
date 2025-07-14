export interface Balance {
    confirmed: number;
    unconfirmed: number;
}

import * as bitcoin from 'bitcoinjs-lib';
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

export interface Provider {
    getBalance(address: string): Promise<Balance>;
    createTransaction(tx: InputTransaction): Promise<bitcoin.Psbt>;
    sendTx(txHex: string): Promise<string>;
}
