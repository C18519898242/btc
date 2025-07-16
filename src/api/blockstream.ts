import axios from 'axios';
import { Api, Utxo } from './api';
import logger from '../logger';

export class BlockstreamApi implements Api {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async getUtxos(addresses: string[]): Promise<Utxo[]> {
        const allUtxos: Utxo[] = [];
        for (const address of addresses) {
            try {
                const { data } = await axios.get<Utxo[]>(`${this.apiUrl}/address/${address}/utxo`);
                allUtxos.push(...data);
            } catch (error) {
                if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 400)) {
                    logger.warn(`BlockstreamApi: Could not get UTXOs for address ${address} (status: ${error.response?.status}). This is expected for addresses with no history.`);
                    continue;
                }
                throw error;
            }
        }
        return allUtxos;
    }

    async getTxHex(txid: string): Promise<string> {
        const { data } = await axios.get(`${this.apiUrl}/tx/${txid}/hex`);
        return data;
    }

    async sendTx(txHex: string): Promise<string> {
        const { data: txid } = await axios.post(`${this.apiUrl}/tx`, txHex);
        return txid;
    }

    async getBlockHeight(): Promise<number> {
        const { data } = await axios.get(`${this.apiUrl}/blocks/tip/height`);
        return data;
    }

    async importWallet(address: string): Promise<void> {
        logger.info(`BlockstreamApi: importWallet called for address ${address}. This API does not support wallet import.`);
        return Promise.resolve();
    }
}
