## Table `orders`

Daily operational logs for water refilling business

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `container_type` | `text` |  Nullable |
| `water_type` | `text` |  Nullable |
| `customer_id` | `uuid` |  Nullable |
| `customer_name` | `text` |  Nullable |
| `customer_address` | `text` |  Nullable |
| `fulfillment_type` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `session_id` | `text` |  Nullable |
| `quantity` | `int4` |  Nullable |
| `total_price` | `numeric` |  Nullable |
| `total_gallons` | `numeric` |  Nullable |
| `price_per_gallon` | `numeric` |  Nullable |

## Table `customers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `address` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `landmark` | `text` |  Nullable |
| `notes` | `text` |  Nullable |

## Table `water_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `log_date` | `date` |  |
| `water_type` | `text` |  |
| `end_reading` | `numeric` |  |
| `notes` | `text` |  Nullable |
| `start_reading` | `numeric` |  |

## Table `order_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `status` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `text` |  Nullable |
| `amount` | `numeric` |  |
| `method` | `text` |  |
| `reference_number` | `text` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |
| `recorded_by` | `uuid` |  Nullable |

## Table `station_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `name` | `text` |  |
| `hotline` | `text` |  |
| `address` | `text` |  |
| `hours` | `text` |  |
| `license` | `text` |  |
| `alkaline_round` | `numeric` |  |
| `alkaline_flat` | `numeric` |  |
| `mineral_round` | `numeric` |  |
| `mineral_flat` | `numeric` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `phone` | `text` |  Nullable |
| `sms_summary` | `bool` |  |
| `email_alerts` | `bool` |  |
| `updated_at` | `timestamptz` |  Nullable |

