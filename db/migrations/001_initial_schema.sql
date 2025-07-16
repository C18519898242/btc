-- 001_initial_schema.sql

-- Create and use the database with UTF8MB4 character set and binary collation for precise, case-sensitive matching
CREATE DATABASE IF NOT EXISTS db_btc_service
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_bin;

USE db_btc_service;

-- Wallet Table
-- Stores information about each wallet, following the new design rules.
CREATE TABLE IF NOT EXISTS `tbl_wallet` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
  `wallet_key` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'Business key for the wallet',
  `address` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'Bitcoin address',
  `public_key` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'Public key associated with the address',
  `network` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT 'The network (e.g., mainnet, testnet)',
  `external_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'External identifier for the wallet, if any',
  `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
  `is_deleted` tinyint unsigned DEFAULT '0' COMMENT 'Deleted flag: 1-deleted, 0-not deleted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_key` (`wallet_key`),
  KEY `idx_address` (`address`) -- Add a non-unique index for faster lookups on address
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Wallet information table';


-- Transaction Table
-- Stores information about each transaction, following the new design rules.
CREATE TABLE IF NOT EXISTS `tbl_transaction` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'Primary key ID',
  `tx_id` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'The unique transaction hash (txid)',
  `to_address` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'The actual receiving address on the blockchain',
  `to_key` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Business key of the receiving wallet, if it is an internal wallet',
  `from_address` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'The actual sending address on the blockchain',
  `from_key` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Business key of the sending wallet, if it is an internal wallet',
  `amount` decimal(20,8) NOT NULL COMMENT 'The actual transaction amount (e.g., in BTC)',
  `amount_onchain` bigint NOT NULL COMMENT 'The on-chain transaction amount in the smallest unit (e.g., satoshis)',
  
  `status` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT 'Transaction status (e.g., pending, confirmed, failed)',
  `block_height` bigint DEFAULT NULL COMMENT 'Block height at which the transaction was confirmed',
  `note` text COLLATE utf8mb4_bin COMMENT 'A field to store notes, which might contain Chinese characters',
  `create_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
  `update_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
  `is_deleted` tinyint unsigned DEFAULT '0' COMMENT 'Deleted flag: 1-deleted, 0-not deleted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tx_id` (`tx_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Transaction information table';
