-- ============================================================================
-- Elite Convention Hall + Complete Make My Event Office Management System
-- FINAL CONSOLIDATED DATABASE RESET
-- ============================================================================
-- Source of truth:
--   * Dump20260906.sql       : current Elite Convention Hall Booking database
--   * Dump20260906 (1).sql   : current Make My Event Office Management database
--
-- Merge policy:
--   1. Every Elite table keeps its source columns, types, indexes and FKs.
--   2. Every MME table keeps its source columns, types, indexes and FKs.
--   3. The only duplicate physical table name, activity_logs, is merged as a
--      compatibility superset so both existing codebases can use the same DB.
--   4. Elite vw_calendar_slots is preserved.
--   5. No old operational bookings, customers, calls, meetings, expenses,
--      attendance, sheet rows/cells, etc. are copied into this clean reset.
--   6. Safe master/auth seeds are included so both existing admin systems and
--      core configuration can boot immediately.
--
-- WARNING: THIS FILE DROPS datapulseglobal_elite_convention_hall COMPLETELY.
-- Back up any database whose records you need before running it.
-- ============================================================================

SET NAMES utf8mb4;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

DROP DATABASE IF EXISTS `datapulseglobal_elite_convention_hall`;
CREATE DATABASE `datapulseglobal_elite_convention_hall`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `datapulseglobal_elite_convention_hall`;


-- ============================================================================
-- SECTION 1: ELITE CONVENTION HALL BOOKING MANAGEMENT - SOURCE-EXACT TABLES
-- ============================================================================

CREATE TABLE `booking_extra_charges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `extra_charge_category_id` bigint unsigned DEFAULT NULL,
  `title` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('due','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'due',
  `payment_method` enum('cash','bank','mobile_banking','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_booking_extra_charges_booking_id` (`booking_id`),
  KEY `idx_booking_extra_charges_category_id` (`extra_charge_category_id`),
  KEY `idx_booking_extra_charges_payment_status` (`payment_status`),
  CONSTRAINT `fk_booking_extra_charges_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_extra_charges_category` FOREIGN KEY (`extra_charge_category_id`) REFERENCES `extra_charge_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_slots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hall_id` bigint unsigned NOT NULL,
  `shift_id` bigint unsigned NOT NULL,
  `slot_date` date NOT NULL,
  `slot_status` enum('available','booked','payment_in_progress','pending_approval','blocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `hold_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hold_expires_at` timestamp NULL DEFAULT NULL,
  `hold_booking_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_booking_slots_hall_shift_date` (`hall_id`,`shift_id`,`slot_date`),
  KEY `idx_booking_slots_date_status` (`slot_date`,`slot_status`),
  KEY `idx_booking_slots_hall_date` (`hall_id`,`slot_date`),
  KEY `idx_booking_slots_shift` (`shift_id`),
  KEY `idx_booking_slots_hold` (`hold_booking_id`,`hold_token`),
  KEY `idx_booking_slots_hold_expiry` (`slot_status`,`hold_expires_at`),
  CONSTRAINT `fk_booking_slots_hall` FOREIGN KEY (`hall_id`) REFERENCES `halls` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_slots_hold_booking` FOREIGN KEY (`hold_booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_slots_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bookings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `booking_slot_id` bigint unsigned NOT NULL,
  `booking_status` enum('pending','payment_in_progress','payment_failed','confirmed','rejected','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `booking_source` enum('online','offline') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'online',
  `created_by_admin_id` bigint unsigned DEFAULT NULL,
  `event_title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_details` text COLLATE utf8mb4_unicode_ci,
  `guest_count` int unsigned NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `booked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bookings_booking_no` (`booking_no`),
  KEY `idx_bookings_booking_slot_id` (`booking_slot_id`),
  KEY `idx_bookings_customer_status` (`customer_id`,`booking_status`),
  KEY `idx_bookings_status` (`booking_status`),
  KEY `idx_bookings_booked_at` (`booked_at`),
  CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_slot` FOREIGN KEY (`booking_slot_id`) REFERENCES `booking_slots` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `customer_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `nid_or_passport` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_user_id` (`user_id`),
  UNIQUE KEY `uq_customers_customer_code` (`customer_code`),
  CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `extra_charge_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_extra_charge_categories_slug` (`slug`),
  KEY `idx_extra_charge_categories_active_sort` (`is_active`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `halls` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `capacity` int unsigned DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_halls_slug` (`slug`),
  KEY `idx_halls_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `cardholder_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `card_last_four` char(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` enum('dummy','sslcommerz','bank_transfer','cash','bkash','nagad','card_pos','due') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `gateway_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_validation_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_bank_tran_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_card_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_card_issuer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failed_reason` text COLLATE utf8mb4_unicode_ci,
  `gateway_response_json` longtext COLLATE utf8mb4_unicode_ci,
  `payment_status` enum('pending','success','failed','partial') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `transaction_reference` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_booking_id` (`booking_id`),
  UNIQUE KEY `uq_payments_transaction_reference` (`transaction_reference`),
  KEY `idx_payments_booking_status` (`booking_id`,`payment_status`),
  KEY `idx_payments_paid_at` (`paid_at`),
  KEY `idx_payments_card_last_four` (`card_last_four`),
  CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shifts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `price` decimal(12,2) NOT NULL DEFAULT '125000.00',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shifts_name` (`name`),
  KEY `idx_shifts_status_sort` (`status`,`sort_order`),
  KEY `idx_shifts_price` (`price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `api_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_type` enum('customer','Super Admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `status` enum('active','inactive','blocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_phone` (`phone`),
  KEY `idx_users_type_status` (`user_type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SECTION 2: COMPLETE MAKE MY EVENT OFFICE MANAGEMENT - SOURCE-EXACT TABLES
-- Includes Office Management, Accounts, Attendance and all admin-support data.
-- ============================================================================

CREATE TABLE `account_expense_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `expense_id` bigint unsigned NOT NULL,
  `purpose` varchar(190) COLLATE utf8mb4_general_ci NOT NULL,
  `cost_date` date NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `per_qty_amount` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `receipt_stored_file_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `receipt_original_file_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `receipt_file_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `receipt_file_size_bytes` int unsigned DEFAULT NULL,
  `vendor_id` bigint unsigned DEFAULT NULL,
  `payment_status` enum('to_pay','paid') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `settles_item_id` bigint unsigned DEFAULT NULL,
  `settles_all_owed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_account_expense_items_expense` (`expense_id`),
  KEY `fk_account_expense_items_vendor` (`vendor_id`),
  KEY `fk_account_expense_items_settles` (`settles_item_id`),
  CONSTRAINT `fk_account_expense_items_expense` FOREIGN KEY (`expense_id`) REFERENCES `account_expenses` (`id`),
  CONSTRAINT `fk_account_expense_items_settles` FOREIGN KEY (`settles_item_id`) REFERENCES `account_expense_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_account_expense_items_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `account_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned DEFAULT NULL,
  `cost_type` enum('event','regular') COLLATE utf8mb4_general_ci NOT NULL,
  `linked_row_key` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `event_client_name_snapshot` varchar(190) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `event_date_snapshot` date DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `wallet_deduction_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_source` enum('employee_wallet','company') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'employee_wallet',
  `created_by_admin_id` bigint unsigned DEFAULT NULL,
  `status` enum('active','void') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `void_reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `voided_by_admin_id` bigint unsigned DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `approved` tinyint(1) NOT NULL DEFAULT '0',
  `approved_by_admin_id` bigint unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_account_expenses_employee` (`employee_id`),
  KEY `idx_account_expenses_row` (`linked_row_key`),
  KEY `fk_account_expenses_created_admin` (`created_by_admin_id`),
  KEY `fk_account_expenses_voided_admin` (`voided_by_admin_id`),
  KEY `idx_account_expenses_created` (`created_at`),
  KEY `fk_account_expenses_approved_admin` (`approved_by_admin_id`),
  CONSTRAINT `fk_account_expenses_approved_admin` FOREIGN KEY (`approved_by_admin_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_account_expenses_created_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_account_expenses_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_account_expenses_voided_admin` FOREIGN KEY (`voided_by_admin_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `account_money_received` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `received_date` date NOT NULL,
  `note` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `source` enum('employee','admin') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'employee',
  `created_by_admin_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_account_money_received_employee` (`employee_id`),
  KEY `fk_account_money_received_created_admin` (`created_by_admin_id`),
  KEY `idx_account_money_received_date` (`received_date`),
  CONSTRAINT `fk_account_money_received_created_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_account_money_received_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `account_wallets` (
  `employee_id` bigint unsigned NOT NULL,
  `current_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  CONSTRAINT `fk_account_wallets_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `attendances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `sign_in_at` datetime NOT NULL,
  `sign_in_latitude` decimal(10,7) NOT NULL,
  `sign_in_longitude` decimal(10,7) NOT NULL,
  `sign_in_accuracy` decimal(8,2) DEFAULT NULL,
  `sign_in_distance_from_office` decimal(8,2) DEFAULT NULL,
  `sign_in_inside_office` tinyint(1) DEFAULT NULL,
  `sign_out_at` datetime DEFAULT NULL,
  `sign_out_latitude` decimal(10,7) DEFAULT NULL,
  `sign_out_longitude` decimal(10,7) DEFAULT NULL,
  `sign_out_accuracy` decimal(8,2) DEFAULT NULL,
  `sign_out_distance_from_office` decimal(8,2) DEFAULT NULL,
  `sign_out_inside_office` tinyint(1) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_employee_date` (`employee_id`,`attendance_date`),
  KEY `fk_attendance_employee` (`employee_id`),
  CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calendar_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `event_date` date NOT NULL,
  `event_time` time DEFAULT NULL,
  `event_type` enum('meeting','followup','deadline','task','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'task',
  `client_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linked_row_key` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_employee_id` bigint unsigned DEFAULT NULL,
  `priority` enum('Low','Medium','High','Urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'Medium',
  `status` enum('Pending','Completed','Cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_calendar_event_date` (`event_date`),
  KEY `idx_calendar_linked_row` (`linked_row_key`),
  KEY `calendar_events_ibfk_1` (`assigned_employee_id`),
  KEY `calendar_events_ibfk_2` (`created_by`),
  KEY `calendar_events_ibfk_3` (`updated_by`),
  CONSTRAINT `calendar_events_ibfk_1` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `calendar_events_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `calendar_events_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_calls` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `linked_row_key` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `call_datetime` datetime DEFAULT NULL,
  `call_discussion` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `assigned_by_employee_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_calls_row` (`linked_row_key`),
  KEY `client_calls_ibfk_1` (`created_by`),
  KEY `client_calls_ibfk_2` (`updated_by`),
  KEY `client_calls_ibfk_3` (`assigned_by_employee_id`),
  CONSTRAINT `client_calls_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_calls_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_calls_ibfk_3` FOREIGN KEY (`assigned_by_employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_finalization_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `finalization_item_id` bigint unsigned NOT NULL,
  `stored_file_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `original_file_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `file_size_bytes` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_finalization_images_item` (`finalization_item_id`),
  CONSTRAINT `fk_finalization_images_item` FOREIGN KEY (`finalization_item_id`) REFERENCES `client_finalization_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `client_finalization_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `finalization_id` bigint unsigned NOT NULL,
  `item_key` varchar(80) COLLATE utf8mb4_general_ci NOT NULL,
  `custom_label` varchar(160) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `quantity` int unsigned DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_finalization_items_finalization` (`finalization_id`),
  CONSTRAINT `fk_finalization_items_finalization` FOREIGN KEY (`finalization_id`) REFERENCES `client_finalizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `client_finalizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `linked_row_key` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finalized_by` bigint unsigned DEFAULT NULL,
  `finalized_at` datetime NOT NULL,
  `finalized_budget` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_client_finalizations_row` (`linked_row_key`),
  KEY `fk_client_finalizations_employee` (`finalized_by`),
  CONSTRAINT `fk_client_finalizations_employee` FOREIGN KEY (`finalized_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_meeting_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `meeting_id` bigint unsigned NOT NULL,
  `item_id` bigint unsigned DEFAULT NULL,
  `stored_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tag_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size_bytes` int unsigned DEFAULT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_final_selected` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_meeting_images_meeting` (`meeting_id`),
  KEY `client_meeting_images_ibfk_2` (`uploaded_by`),
  KEY `client_meeting_images_ibfk_3` (`item_id`),
  CONSTRAINT `client_meeting_images_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `client_meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_meeting_images_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_meeting_images_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `meeting_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_meetings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `linked_row_key` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meeting_datetime` datetime DEFAULT NULL,
  `discussion_notes` text COLLATE utf8mb4_unicode_ci,
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `assigned_by_employee_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_completed` tinyint(1) NOT NULL DEFAULT '0',
  `completed_by` bigint unsigned DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_client_meetings_row` (`linked_row_key`),
  KEY `idx_client_meetings_datetime` (`meeting_datetime`),
  KEY `client_meetings_ibfk_1` (`created_by`),
  KEY `client_meetings_ibfk_2` (`updated_by`),
  KEY `fk_client_meetings_completed_by` (`completed_by`),
  KEY `fk_client_meetings_assigned_by` (`assigned_by_employee_id`),
  CONSTRAINT `client_meetings_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_meetings_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_client_meetings_assigned_by` FOREIGN KEY (`assigned_by_employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_client_meetings_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_meetings_chk_1` CHECK (json_valid(`requirements`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_next_calls` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `linked_row_key` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `call_id` bigint unsigned NOT NULL,
  `next_call_datetime` datetime NOT NULL,
  `assigned_employee_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `call_id` (`call_id`),
  KEY `idx_client_next_calls_row` (`linked_row_key`),
  KEY `client_next_calls_ibfk_2` (`created_by`),
  KEY `client_next_calls_ibfk_3` (`updated_by`),
  KEY `client_next_calls_ibfk_4` (`assigned_employee_id`),
  CONSTRAINT `client_next_calls_ibfk_1` FOREIGN KEY (`call_id`) REFERENCES `client_calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_next_calls_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_next_calls_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_next_calls_ibfk_4` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `client_next_meetings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `linked_row_key` char(36) NOT NULL,
  `meeting_id` bigint unsigned NOT NULL,
  `next_meeting_datetime` datetime NOT NULL,
  `assigned_employee_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meeting_id` (`meeting_id`),
  KEY `idx_client_next_meetings_row` (`linked_row_key`),
  KEY `client_next_meetings_ibfk_2` (`created_by`),
  KEY `client_next_meetings_ibfk_3` (`updated_by`),
  KEY `client_next_meetings_ibfk_4` (`assigned_employee_id`),
  CONSTRAINT `client_next_meetings_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `client_meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_next_meetings_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `client_next_meetings_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `client_next_meetings_ibfk_4` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` tinyint unsigned DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  -- Bearer-token auth (SHA-256 hash), same convention as users.api_token_hash.
  `api_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `color_hex` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_emp_role` (`role_id`),
  KEY `fk_emp_created_by` (`created_by`),
  KEY `employees_api_token_hash_index` (`api_token_hash`),
  CONSTRAINT `fk_emp_created_by` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_emp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `excel_import_errors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `import_id` bigint unsigned NOT NULL,
  `excel_row_number` int DEFAULT NULL,
  `excel_column_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `row_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `import_id` (`import_id`),
  CONSTRAINT `excel_import_errors_ibfk_1` FOREIGN KEY (`import_id`) REFERENCES `excel_imports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `excel_import_errors_chk_1` CHECK (json_valid(`row_data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `excel_imports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sheet_id` bigint unsigned DEFAULT NULL,
  `imported_by` bigint unsigned DEFAULT NULL,
  `original_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `import_mode` enum('create_new_sheet','append','replace','merge') COLLATE utf8mb4_unicode_ci DEFAULT 'append',
  `status` enum('pending','processing','completed','partial','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `total_columns` int DEFAULT '0',
  `total_rows` int DEFAULT '0',
  `imported_rows` int DEFAULT '0',
  `failed_rows` int DEFAULT '0',
  `detected_headers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `column_mapping` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sheet_id` (`sheet_id`),
  KEY `imported_by` (`imported_by`),
  CONSTRAINT `excel_imports_ibfk_1` FOREIGN KEY (`sheet_id`) REFERENCES `management_sheets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `excel_imports_ibfk_2` FOREIGN KEY (`imported_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `excel_imports_chk_1` CHECK (json_valid(`detected_headers`)),
  CONSTRAINT `excel_imports_chk_2` CHECK (json_valid(`column_mapping`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `management_sheets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sheet_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sheet_name` (`sheet_name`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `management_sheets_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `management_sheets_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meeting_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `meeting_id` bigint unsigned NOT NULL,
  `item_key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `custom_label` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `quantity` int unsigned DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `meeting_items_ibfk_2` (`created_by`),
  KEY `meeting_items_ibfk_3` (`updated_by`),
  KEY `idx_meeting_items_meeting` (`meeting_id`),
  CONSTRAINT `meeting_items_ibfk_1` FOREIGN KEY (`meeting_id`) REFERENCES `client_meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meeting_items_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `meeting_items_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `name` enum('Admin','Employee') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sheet_cells` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `row_id` bigint unsigned NOT NULL,
  `column_id` bigint unsigned NOT NULL,
  `value_text` longtext COLLATE utf8mb4_unicode_ci,
  `value_integer` bigint DEFAULT NULL,
  `value_decimal` decimal(20,4) DEFAULT NULL,
  `value_date` date DEFAULT NULL,
  `value_time` time DEFAULT NULL,
  `value_datetime` datetime DEFAULT NULL,
  `value_boolean` tinyint(1) DEFAULT NULL,
  `value_employee_id` bigint unsigned DEFAULT NULL,
  `value_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `display_value` text COLLATE utf8mb4_unicode_ci,
  `already_booked` tinyint(1) NOT NULL DEFAULT '0',
  `booked_from_mme` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `row_id` (`row_id`,`column_id`),
  KEY `column_id` (`column_id`),
  KEY `value_employee_id` (`value_employee_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `sheet_cells_ibfk_1` FOREIGN KEY (`row_id`) REFERENCES `sheet_rows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sheet_cells_ibfk_2` FOREIGN KEY (`column_id`) REFERENCES `sheet_columns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sheet_cells_ibfk_3` FOREIGN KEY (`value_employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sheet_cells_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sheet_cells_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sheet_cells_chk_1` CHECK (json_valid(`value_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sheet_columns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sheet_id` bigint unsigned NOT NULL,
  `column_key` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `column_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_type` enum('text','long_text','email','phone','number','decimal','currency','integer','date','time','datetime','boolean','employee','status','priority','venue','shift','meeting_manager','last_meeting_time','next_meeting_time') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `calendar_role` enum('none','event_title','start_datetime','end_datetime','description','assignee','status','priority') COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `dropdown_options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `display_order` int DEFAULT '0',
  `width_px` int DEFAULT '180',
  `is_required` tinyint(1) DEFAULT '0',
  `is_visible` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sheet_id` (`sheet_id`,`column_key`),
  UNIQUE KEY `sheet_id_2` (`sheet_id`,`column_name`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `sheet_columns_ibfk_1` FOREIGN KEY (`sheet_id`) REFERENCES `management_sheets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sheet_columns_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sheet_columns_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sheet_columns_chk_1` CHECK (json_valid(`dropdown_options`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sheet_rows` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `row_key` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sheet_id` bigint unsigned NOT NULL,
  `row_position` int unsigned NOT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `is_archived` tinyint(1) DEFAULT '0',
  `archived_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sheet_id` (`sheet_id`,`row_key`),
  UNIQUE KEY `sheet_id_2` (`sheet_id`,`row_position`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `sheet_rows_ibfk_1` FOREIGN KEY (`sheet_id`) REFERENCES `management_sheets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sheet_rows_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sheet_rows_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vendor_balances` (
  `vendor_id` bigint unsigned NOT NULL,
  `current_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_id`),
  CONSTRAINT `fk_vendor_balances_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `vendors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(190) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_name` varchar(190) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_email` varchar(190) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================================
-- SECTION 3: SHARED ACTIVITY LOG COMPATIBILITY TABLE
-- ============================================================================

CREATE TABLE `activity_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `module_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_logs_user` (`user_id`),
  KEY `idx_activity_logs_employee` (`employee_id`),
  KEY `idx_activity_logs_module_action` (`module_name`,`action`),
  KEY `idx_activity_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_activity_logs_created_at` (`created_at`),
  CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_logs_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activity_logs_chk_1` CHECK (json_valid(`old_values`)),
  CONSTRAINT `activity_logs_chk_2` CHECK (json_valid(`new_values`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SECTION 4: ELITE BOOKING CALENDAR VIEW
-- ============================================================================

DROP VIEW IF EXISTS `vw_calendar_slots`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW `vw_calendar_slots` AS
SELECT
  `bs`.`id` AS `slot_id`,
  `bs`.`slot_date` AS `slot_date`,
  `bs`.`slot_status` AS `slot_status`,
  `bs`.`hold_expires_at` AS `hold_expires_at`,
  `bs`.`hold_booking_id` AS `hold_booking_id`,
  `h`.`id` AS `hall_id`,
  `h`.`name` AS `hall_name`,
  `h`.`slug` AS `hall_slug`,
  `h`.`capacity` AS `hall_capacity`,
  `s`.`id` AS `shift_id`,
  `s`.`name` AS `shift_name`,
  `s`.`start_time` AS `start_time`,
  `s`.`end_time` AS `end_time`,
  `s`.`sort_order` AS `sort_order`,
  `s`.`price` AS `shift_price`,
  `s`.`price` AS `price`,
  `b`.`id` AS `booking_id`,
  `b`.`booking_no` AS `booking_no`,
  `b`.`booking_status` AS `booking_status`,
  `b`.`booking_source` AS `booking_source`,
  `b`.`event_title` AS `event_title`,
  `b`.`event_type` AS `event_type`,
  `b`.`event_details` AS `event_details`,
  `b`.`guest_count` AS `guest_count`,
  `b`.`total_amount` AS `booking_total_amount`,
  `b`.`booked_at` AS `booked_at`,
  `p`.`id` AS `payment_id`,
  `p`.`payment_method` AS `payment_method`,
  `p`.`payment_status` AS `payment_status`,
  `p`.`amount` AS `paid_amount`,
  `p`.`transaction_reference` AS `transaction_reference`,
  `p`.`paid_at` AS `paid_at`
FROM `booking_slots` `bs`
JOIN `halls` `h` ON (`h`.`id` = `bs`.`hall_id`)
JOIN `shifts` `s` ON (`s`.`id` = `bs`.`shift_id`)
LEFT JOIN `bookings` `b`
  ON (`b`.`id` = `bs`.`hold_booking_id`)
  OR (`b`.`booking_slot_id` = `bs`.`id` AND `b`.`booking_status` = 'confirmed')
LEFT JOIN `payments` `p` ON (`p`.`booking_id` = `b`.`id`);


-- ============================================================================
-- SECTION 5: REQUIRED MASTER / AUTH / CONFIGURATION SEEDS
-- Operational historical data is intentionally excluded.
-- ============================================================================

-- Elite existing Super Admin (preserved from current source dump)
INSERT INTO `users` VALUES (1,'Rafi','rafi@gmail.com','01834861666','$2y$12$DNiSgve8jNseVYQ3No5PVuX0t4P5zIsJ4r74RnZ/gwJu1TxIQe4YK',0,NULL,'Super Admin','active',NULL,NULL,'2026-06-09 04:44:14','2026-08-19 06:45:19');

-- Elite venue / shifts / extra-charge master configuration
INSERT INTO `halls` VALUES (1,'Elite Convention Hall','elite-convention-hall','Primary booking hall for Elite Convention Hall.',500,'active','2026-06-09 09:58:14','2026-06-09 09:58:14');
INSERT INTO `shifts` VALUES (1,'Day Shift','13:00:00','17:00:00',1,250000.00,'active','2026-06-09 09:58:14','2026-08-19 10:28:04'),(2,'Night Shift','18:00:00','23:59:59',2,250000.00,'active','2026-06-09 09:58:14','2026-08-19 10:28:04');
INSERT INTO `extra_charge_categories` VALUES (1,'Food VAT','food-vat',1,1,'2026-06-29 11:05:20','2026-06-29 11:05:20'),(2,'Hall Extra Hour Charge','hall-extra-hour-charge',1,2,'2026-06-29 11:05:20','2026-06-29 11:05:20'),(3,'Decoration Extra Charge','decoration-extra-charge',1,3,'2026-06-29 11:05:20','2026-06-29 11:05:20'),(4,'Cleaning Charge','cleaning-charge',1,4,'2026-06-29 11:05:20','2026-06-29 11:05:20'),(5,'Security Charge','security-charge',1,5,'2026-06-29 11:05:20','2026-06-29 11:05:20'),(6,'Miscellaneous Charge','miscellaneous-charge',1,6,'2026-06-29 11:05:20','2026-06-29 11:05:20');

-- Keep Laravel migration state aligned with the existing Elite application
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_06_01_000003_create_payments_table',1),(5,'2026_06_01_000004_add_payment_detail_columns_to_payments_table',1),(6,'2026_06_02_000005_add_hold_columns_to_booking_slots_table',1);

-- MME fixed roles and one existing Admin employee for MME admin authentication
INSERT INTO `roles` VALUES (1,'Admin','2026-07-24 16:34:34'),(2,'Employee','2026-07-24 16:34:34');
INSERT INTO `employees` VALUES (1,'Shajedul Kabir Rafi','rafi@gmail.com',1,'$2b$10$OTfQ6gcwB.NXq6XLpQQD6ephq49E0vtq37duQof6Uv5aVKWhHvhRK',0,NULL,1,NULL,'2026-08-06 09:14:27','2026-07-21 15:46:44','2026-08-06 09:14:27');

-- Restore session settings
SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;

-- ============================================================================
-- END OF FINAL CONSOLIDATED DATABASE
-- ============================================================================
