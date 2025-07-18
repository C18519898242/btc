export interface Utxo {
    txid: string;
    vout: number;
    status: {
        confirmed: boolean;
        block_height: number;
        block_hash: string;
        block_time: number;
    };
    value: number;
}

export interface Balance {
    confirmed: number;
    unconfirmed: number;
}

export interface Api {
    getUtxos(addresses: string[]): Promise<Utxo[]>;
    getTxHex(txid: string): Promise<string>;
    sendTx(txHex: string): Promise<string>;
    getBlockHeight(): Promise<number>;
    importWallet(address: string): Promise<void>;
}
