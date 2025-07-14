import axios from 'axios';
import { Balance, Provider } from './provider';
import logger from '../logger';

interface Utxo {
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

export class MempoolProvider implements Provider {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async getBalance(address: string): Promise<Balance> {
        const url = `${this.apiUrl}/address/${address}/utxo`;
        try {
            const { data: utxos } = await axios.get<Utxo[]>(url);
            const confirmed = utxos
                .filter(utxo => utxo.status.confirmed)
                .reduce((acc, utxo) => acc + utxo.value, 0);
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
}
