export interface Balance {
    confirmed: number;
    unconfirmed: number;
}

export interface Provider {
    getBalance(address: string): Promise<Balance>;
}
