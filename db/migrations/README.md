# SQL 编码与数据库设计规范

本文档定义了本项目的 SQL 编码风格和数据库表设计规则，所有数据库迁移脚本都应遵循此规范。

## 1. 数据库 (Database)

- **数据库名**: `db_btc_service`
- **字符集**: `utf8mb4`
- **排序规则**: `utf8mb4_bin`

**示例:**
```sql
CREATE DATABASE IF NOT EXISTS db_btc_service
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_bin;
```

## 2. 表 (Tables)

### 2.1. 命名规则

- **表名**: 使用单数形式，并以 `tbl_` 为前缀。
  - **正确**: `tbl_user`, `tbl_transaction`
  - **错误**: `users`, `tbl_transactions`
- **存储引擎**: 统一使用 `InnoDB`。
- **字符集与排序规则**: 每张表都必须明确指定 `CHARSET=utf8mb4` 和 `COLLATE=utf8mb4_bin`。
- **注释**: 每张表都必须有一个清晰的 `COMMENT`，描述该表的功能。

### 2.2. 公共字段

每张表都 **必须** 包含以下五个字段：

1.  `id` (bigint, NOT NULL, AUTO_INCREMENT, COMMENT 'Primary key ID') - **数据库主键**
2.  `create_time` (timestamp, NULL, DEFAULT CURRENT_TIMESTAMP, COMMENT 'Creation time')
3.  `update_time` (timestamp, NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, COMMENT 'Update time')
4.  `is_deleted` (tinyint unsigned, DEFAULT '0', COMMENT 'Deleted flag: 1-deleted, 0-not deleted')

### 2.3. 业务主键

- 对于核心业务表，除了自增的 `id` 主键外，还应定义一个业务主键（Business Key）。
- 业务主键用于在应用程序逻辑中唯一标识一条记录，其数据类型根据业务需求确定（如 `varchar`, `bigint` 等）。
- 业务主键必须有一个 `UNIQUE KEY` 约束。
- **示例**: `tbl_wallet` 中的 `wallet_key`。

## 3. 字段 (Columns)

- **命名**: 使用小写字母和下划线 (`snake_case`)。
- **数据类型**: 选择最合适、最高效的数据类型。
  - **金额**:
    - 链上数量（最小单位，如 satoshis）使用 `bigint`。
    - 真实世界价值（可带小数）使用 `decimal(20, 8)`。
  - **状态/类型**: 使用 `varchar` 或 `tinyint`，并明确注释每个值的含义。
- **默认值**: 关键字段应有合理的 `DEFAULT` 值（例如 `is_deleted` 默认为 `0`）。
- **非空**: 除非业务逻辑明确允许，否则字段应为 `NOT NULL`。
- **注释**: 每个字段都 **必须** 有一个清晰的 `COMMENT`，描述其用途和含义。

## 4. 索引与关联关系 (Indexes & Relations)

### 4.1. 索引

- **主键**: 每张表必须有且仅有一个主键，即 `id` 字段。
- **唯一约束**: 对需要保证唯一性的字段（如业务主键 `wallet_key`, `tx_id`）添加 `UNIQUE KEY`。
- **普通索引**:
  - 对经常用于 `WHERE` 查询、`JOIN` 操作或 `ORDER BY` 排序的字段添加索引 (`KEY`)。
  - 索引名应以 `idx_` 开头，并跟上字段名（例如 `idx_status`）。

### 4.2. 关联关系

- **不使用外键**: 本项目 **不使用** 数据库级别的 `FOREIGN KEY` 约束。
- **应用层维护**: 表之间的关联关系通过字段（如 `tbl_transaction` 中的 `from_key` 和 `to_key`）来体现，数据的一致性和完整性由 **应用层代码** 来保证。
- **原因**: 这种设计可以提高数据库的写入性能，简化分库分表等分布式架构的实现。
