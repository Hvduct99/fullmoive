-- ============================================
-- MIGRATION: Thêm hệ thống VIP cho users
-- Chạy trong phpMyAdmin (tab SQL)
-- ============================================

-- 1. Thêm cột vip_expire_at nếu chưa có
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_expire_at TIMESTAMP NULL DEFAULT NULL;

-- 2. Thêm cột full_name nếu chưa có
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) DEFAULT NULL;

-- 3. Thêm cột phone nếu chưa có  
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;

-- ============================================
-- DONE! Sau khi chạy xong, hệ thống VIP sẽ hoạt động.
-- Role 'vip' sẽ được quản lý qua admin panel.
-- ============================================
