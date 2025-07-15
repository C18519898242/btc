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

export interface Api {
    getUtxos(address: string): Promise<Utxo[]>;
    getTxHex(txid: string): Promise<string>;
    sendTx(txHex: string): Promise<string>;
}
