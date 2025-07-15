import axios from 'axios';
import { Api, Utxo } from './api';
import logger from '../logger';

export class BlockstreamApi implements Api {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async getUtxos(address: string): Promise<Utxo[]> {
        const url = `${this.apiUrl}/address/${address}/utxo`;
        try {
            const { data } = await axios.get<any[]>(url);
            return data.map(utxo => ({
                txid: utxo.txid,
                vout: utxo.vout,
                status: utxo.status,
                value: utxo.value,
            }));
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                logger.warn(`No UTXOs found for address ${address}.`);
                return [];
            }
            logger.error(`Error fetching UTXOs for address ${address}:`, error);
            throw error;
        }
    }

    async sendTx(txHex: string): Promise<string> {
        const { data: txid } = await axios.post(`${this.apiUrl}/tx`, txHex);
        return txid;
    }
}
