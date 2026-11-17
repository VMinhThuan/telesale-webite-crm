import React, { useMemo, useState, useEffect } from 'react'
import {
  AlertCircle,
  Building2,
  Check,
  Coins,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import dayjs from '../../lib/dayjs'
import { useUserLists } from '../../hooks/useAuth'
import {
  useSaveUserRolesConfigMutation,
  useUserRolesConfig,
} from '../../hooks/useUserRoleConfig'
import {
  SaleRoleType,
  UserRoleOverrideItem,
  UserRolesConfigFile,
} from '../../types/userRoleConfig'
import { useAuthStore } from '../../store/useAuthStore'
import { determinePhanQuyen } from '../../services/auth.service'
import { notify } from '../../utils/notify'

export const UserManagement: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = determinePhanQuyen(currentUser) === 'admin'

  // 1. Tải danh sách nhân viên từ Backend ERP qua API 05
  const {
    data: rawUserLists = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useUserLists()

  // 2. Tải cấu hình phân quyền hiện tại từ Cloudflare R2
  const {
    data: remoteConfig,
    isLoading: isLoadingConfig,
    refetch: refetchConfig,
  } = useUserRolesConfig()

  const saveConfigMutation = useSaveUserRolesConfigMutation()

  // State cục bộ lưu trữ các thay đổi của Admin trước khi bấm Lưu
  const [localRoles, setLocalRoles] = useState<Record<string, SaleRoleType>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'sale_congty' | 'sale_ctv'>('all')

  // Đồng bộ cấu hình từ R2 vào local state khi tải xong
  useEffect(() => {
    if (remoteConfig?.users) {
      const initialMap: Record<string, SaleRoleType> = {}
      Object.entries(remoteConfig.users).forEach(([key, item]) => {
        if (item?.role_type) {
          initialMap[key] = item.role_type
        }
      })
      setLocalRoles(initialMap)
      setHasChanges(false)
    }
  }, [remoteConfig])

  // Chuẩn hóa danh sách nhân sự từ ERP
  const normalizedUsers = useMemo(() => {
    if (!Array.isArray(rawUserLists)) return []
    return rawUserLists.map((u: any) => {
      const username = String(u.username || u.contact_number || u.phone || u.id || '')
      const name = u.full_name || u.name || 'Nhân viên'
      const chucVu = u.chuc_vu || u.role_name || u.role || 'Nhân viên'
      const department = u.department_name || u.department || 'Phòng Telesale'
      const surname = u.surname || ''
      const avatar = u.avatar || u.avatar_url || null
      return {
        id: u.id || username,
        username,
        name,
        chucVu,
        department,
        surname,
        avatar,
        raw: u,
      }
    })
  }, [rawUserLists])

  // Xử lý thay đổi role của 1 nhân viên
  const handleRoleChange = (username: string, newRole: SaleRoleType) => {
    setLocalRoles((prev) => {
      const next = { ...prev, [username]: newRole }
      return next
    })
    setHasChanges(true)
  }

  // Lưu cấu hình phân quyền nhân sự
  const handleSaveConfig = async () => {
    if (!hasChanges) {
      notify('Chưa có thay đổi nào cần lưu.')
      return
    }

    const updatedUsersMap: Record<string, UserRoleOverrideItem> = {
      ...(remoteConfig?.users || {}),
    }

    // Cập nhật lại các role đã chọn
    normalizedUsers.forEach((u) => {
      if (!u.username) return
      const assignedRole = localRoles[u.username] || 'sale_congty'
      updatedUsersMap[u.username] = {
        username: u.username,
        name: u.name,
        role_type: assignedRole,
        department: u.department,
        chuc_vu: u.chucVu,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.username || 'admin',
      }
    })

    const payload: UserRolesConfigFile = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.username || 'admin',
      users: updatedUsersMap,
    }

    try {
      await saveConfigMutation.mutateAsync(payload)
      setHasChanges(false)
    } catch {
      // Error handled in mutation
    }
  }

  // Danh sách nhân sự sau khi lọc & tìm kiếm
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return normalizedUsers.filter((u) => {
      const currentRole = localRoles[u.username] || 'sale_congty'

      if (filterRole !== 'all' && currentRole !== filterRole) {
        return false
      }

      if (!q) return true

      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.surname.toLowerCase().includes(q) ||
        u.chucVu.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      )
    })
  }, [normalizedUsers, localRoles, searchQuery, filterRole])

  // Thống kê nhanh
  const stats = useMemo(() => {
    let congTyCount = 0
    let ctvCount = 0
    normalizedUsers.forEach((u) => {
      const r = localRoles[u.username] || 'sale_congty'
      if (r === 'sale_ctv') ctvCount++
      else congTyCount++
    })
    return {
      total: normalizedUsers.length,
      congTy: congTyCount,
      ctv: ctvCount,
      lastUpdated: remoteConfig?.updatedAt
        ? dayjs(remoteConfig.updatedAt).format('HH:mm DD/MM/YYYY')
        : 'Chưa có',
      updatedBy: remoteConfig?.updatedBy || 'Hệ thống',
    }
  }, [normalizedUsers, localRoles, remoteConfig])

  // Nếu không phải admin, hiển thị cảnh báo phân quyền
  if (!isAdmin) {
    return (
      <div className="content users-content" style={{ textAlign: 'center' }}>
        <div
          style={{
            maxWidth: '460px',
            margin: '60px auto',
            padding: '32px 24px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
          }}
        >
          <ShieldCheck size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Quyền truy cập bị giới hạn
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
            Khu vực này chỉ dành cho tài khoản <b>Quản trị viên (Admin)</b> để thiết lập phân quyền Sale CTV và Sale Công ty.
          </p>
        </div>
      </div>
    )
  }

  const isLoading = isLoadingUsers || isLoadingConfig

  return (
    <div className="content users-content">
      {/* Header trang & Nút Lưu */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Phân quyền nội bộ
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Cập nhật lần cuối: {stats.lastUpdated} ({stats.updatedBy})
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Quản lý Nhân viên & Phân quyền Sale
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
            Điều chỉnh hiển thị chỉ số Hoa hồng cho Sale Cộng tác viên (CTV) và ẩn chỉ số đối với Sale Công ty.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              refetchUsers()
              refetchConfig()
            }}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Làm mới danh sách nhân sự"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={!hasChanges || saveConfigMutation.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: hasChanges ? '#2563eb' : '#94a3b8',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              boxShadow: hasChanges ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {saveConfigMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang lưu thay đổi...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Lưu thay đổi {hasChanges ? '(*)' : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thông báo chưa lưu */}
      {hasChanges && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            color: '#b45309',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <span>
              Bạn đang có thay đổi phân quyền chưa được lưu. Nhớ bấm <b>"Lưu thay đổi"</b> để áp dụng cấu hình mới nhé!
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveConfig}
            style={{
              padding: '4px 12px',
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Lưu ngay
          </button>
        </div>
      )}

      {/* Cụm 3 Thẻ KPI Thống kê */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Thẻ 1: Tổng nhân sự */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, margin: '0 0 6px' }}>
              TỔNG NHÂN SỰ TELESALE
            </p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {stats.total} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>người</span>
            </h3>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <Users size={22} />
          </div>
        </div>

        {/* Thẻ 2: Sale Công ty (Ẩn hoa hồng) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, margin: '0 0 6px' }}>
              SALE CÔNG TY (ẨN HOA HỒNG)
            </p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {stats.congTy} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>nhân sự</span>
            </h3>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            <Building2 size={22} />
          </div>
        </div>

        {/* Thẻ 3: Sale CTV (Hiển thị hoa hồng) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, margin: '0 0 6px' }}>
              SALE CỘNG TÁC VIÊN (HIỆN HOA HỒNG)
            </p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', margin: 0 }}>
              {stats.ctv} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>cộng tác viên</span>
            </h3>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
            }}
          >
            <Coins size={22} />
          </div>
        </div>
      </div>

      {/* Thanh công cụ Tìm kiếm & Bộ lọc vai trò */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px' }}>
          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT đăng nhập, chức vụ..."
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px 0 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Bộ lọc phân loại */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} style={{ color: '#64748b' }} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              style={{
                height: '38px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Tất cả vai trò ({normalizedUsers.length})</option>
              <option value="sale_congty">Sale Công ty (Ẩn hoa hồng)</option>
              <option value="sale_ctv">Sale CTV (Hiện hoa hồng)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bảng danh sách Nhân viên & Phân quyền */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563eb' }} />
            <p style={{ fontSize: '13px', margin: 0 }}>Đang tải danh sách nhân viên và cấu hình phân quyền...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
            <UserCheck size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 0 4px' }}>
              Không tìm thấy nhân viên nào
            </p>
            <p style={{ fontSize: '12.5px', margin: 0 }}>
              Thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc vai trò khác.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>NHÂN VIÊN</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>TÀI KHOẢN (SĐT)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>CHỨC VỤ / PHÒNG BAN</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>HIỂN THỊ HOA HỒNG</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>VAI TRÒ SALE</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const assignedRole = localRoles[user.username] || 'sale_congty'
                const isCTV = assignedRole === 'sale_ctv'

                return (
                  <tr
                    key={user.username || user.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Cột 1: Thông tin nhân viên */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isCTV ? '#dcfce7' : '#eff6ff',
                            color: isCTV ? '#15803d' : '#1d4ed8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0,
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{user.name}</div>
                          {user.surname && (
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Mã: {user.surname}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Username / Số điện thoại đăng nhập */}
                    <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 500 }}>
                      <code
                        style={{
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#0f172a',
                        }}
                      >
                        {user.username}
                      </code>
                    </td>

                    {/* Cột 3: Chức vụ / Phòng ban */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{user.chucVu}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{user.department}</div>
                    </td>

                    {/* Cột 4: Trạng thái hiển thị hoa hồng */}
                    <td style={{ padding: '14px 16px' }}>
                      {isCTV ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Eye size={14} />
                          <span>Hiện hoa hồng</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: '#f1f5f9',
                            color: '#64748b',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <EyeOff size={14} />
                          <span>Ẩn hoa hồng</span>
                        </span>
                      )}
                    </td>

                    {/* Cột 5: Nút chuyển đổi Vai trò Sale */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          padding: '3px',
                          gap: '2px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleRoleChange(user.username, 'sale_congty')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: !isCTV ? '#ffffff' : 'transparent',
                            color: !isCTV ? '#1e293b' : '#64748b',
                            fontWeight: !isCTV ? 700 : 500,
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: !isCTV ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {!isCTV && <Check size={13} style={{ color: '#2563eb' }} />}
                          <span>🏢 Sale Công ty</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRoleChange(user.username, 'sale_ctv')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: isCTV ? '#16a34a' : 'transparent',
                            color: isCTV ? '#ffffff' : '#64748b',
                            fontWeight: isCTV ? 700 : 500,
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: isCTV ? '0 1px 3px rgba(22, 163, 74, 0.2)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isCTV && <Check size={13} />}
                          <span>🤝 Sale CTV</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default UserManagement
