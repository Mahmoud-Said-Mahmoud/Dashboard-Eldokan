import { useEffect, useMemo, useState } from 'react'
import {
  getOwnerTeam,
  getActivityLog,
  createOwnerAccount,
  getRolePermissions,
  updateRolePermissions,
  deleteOwnerChildAccount,
  changeUserStatus,
  changeAccountRole,
} from '../../lib/authApi'
import {
  getHolidayMode,
  updateHolidayMode,
} from '../../lib/productApi'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import Breadcrumb from '../../components/Common/Breadcrumb'

const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    en: 'Dashboard',
    ar: 'لوحة التحكم',
    items: [
      ['viewDashboard', 'Open Dashboard', 'فتح لوحة التحكم'],
      ['viewSalesKpis', 'Sales KPIs', 'عرض أرقام المبيعات'],
      ['viewOrderBreakdown', 'Order Breakdown', 'تفاصيل حالات الطلبات'],
      ['viewLostOpportunities', 'Lost Opportunities', 'الفرص الضائعة'],
      ['viewProductPerformance', 'Product Performance', 'أداء المنتجات'],
      ['viewInventoryAlerts', 'Inventory Alerts', 'تنبيهات المخزون'],
    ],
  },
  {
    key: 'orders',
    en: 'Orders',
    ar: 'الطلبات',
    items: [
      ['viewOrders', 'View Orders', 'عرض الطلبات'],
      ['viewOrderDetails', 'View Order Details', 'عرض تفاصيل الطلب'],
      ['manageOrders', 'Manage Orders', 'إدارة الطلبات'],
      ['acceptOrders', 'Accept Orders', 'قبول الطلبات'],
      ['rejectOrders', 'Reject Orders', 'رفض الطلبات'],
      ['updateOrderStatus', 'Update Order Status', 'تغيير حالة الطلب'],
      ['replyOrders', 'Reply to Order Messages', 'الرد على رسائل الطلب'],
      ['viewOrderNotes', 'View Seller Notes', 'عرض ملاحظات الطلب'],
    ],
  },
  {
    key: 'products',
    en: 'Products',
    ar: 'المنتجات',
    items: [
      ['viewProducts', 'View Products', 'عرض المنتجات'],
      ['viewPrices', 'View Prices', 'عرض الأسعار'],
      ['addProducts', 'Add Products', 'إضافة منتج'],
      ['editProducts', 'Edit Product Details', 'تعديل بيانات المنتج'],
      ['editPrices', 'Edit Prices', 'تعديل الأسعار'],
      ['editStock', 'Edit Stock', 'تعديل المخزون'],
      ['manageSales', 'Manage Sale Price / Dates', 'إدارة الخصومات ومدتها'],
      ['manageProductImages', 'Manage Product Images', 'إدارة صور المنتج'],
      ['manageProductTaxonomy', 'Categories / Brands / Attributes', 'الفئات والعلامات والخصائص'],
      ['deleteProducts', 'Delete Products', 'حذف المنتجات'],
      ['importProducts', 'Import Products', 'استيراد المنتجات'],
    ],
  },
  {
    key: 'reports',
    en: 'Reports & Finance',
    ar: 'التقارير والمالية',
    items: [
      ['viewReports', 'View Reports', 'عرض التقارير'],
      ['exportReports', 'Export Reports', 'تصدير التقارير'],
      ['viewFinance', 'View Finance', 'عرض المالية'],
      ['viewCommission', 'View Platform Commission', 'عرض عمولة المنصة'],
      ['viewPerformance', 'Seller Performance', 'أداء البائع'],
    ],
  },
  {
    key: 'notifications',
    en: 'Notifications',
    ar: 'الإشعارات',
    items: [
      ['viewNotifications', 'View Notifications', 'عرض الإشعارات'],
      ['openNotifications', 'Open Notification Source', 'فتح مصدر الإشعار'],
      ['deleteNotifications', 'Delete Notifications', 'حذف الإشعارات'],
      ['clearNotifications', 'Delete All Notifications', 'حذف كل الإشعارات'],
    ],
  },
  {
    key: 'settings',
    en: 'Settings',
    ar: 'الإعدادات',
    items: [
      ['accessSettings', 'Open Settings', 'فتح الإعدادات'],
      ['manageHolidayMode', 'Holiday Mode', 'إدارة وضع الإجازة'],
    ],
  },
  {
    key: 'accounts',
    en: 'Team & Accounts',
    ar: 'الفريق والحسابات',
    items: [
      ['viewAccounts', 'View Team', 'عرض الفريق'],
      ['createAccounts', 'Create Accounts', 'إنشاء حسابات'],
      ['disableAccounts', 'Enable / Disable Accounts', 'تفعيل وإيقاف الحسابات'],
      ['assignRoles', 'Assign Roles', 'تغيير الأدوار'],
      ['deleteAccounts', 'Delete Accounts', 'حذف الحسابات'],
      ['activityLog', 'Activity Log', 'سجل العمليات'],
    ],
  },
]

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.items.map(([key]) => key)
)


function RolePermissions({ ar }) {
  const [roles, setRoles] = useState({})
  const [selectedRole, setSelectedRole] = useState('eldokan_admin')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getRolePermissions()
      .then(setRoles)
      .catch((e) => setError(e?.message || 'Could not load permissions'))
      .finally(() => setLoading(false))
  }, [])

  const permissions = roles[selectedRole] || {}

  function setPermission(key, enabled) {
    setRoles((current) => ({
      ...current,
      [selectedRole]: {
        ...(current[selectedRole] || {}),
        [key]: Boolean(enabled),
      },
    }))
  }

  function toggle(key) {
    setPermission(key, !permissions[key])
  }

  function setGroup(group, enabled) {
    setRoles((current) => {
      const currentRole = current[selectedRole] || {}
      const next = { ...currentRole }

      group.items.forEach(([key]) => {
        next[key] = Boolean(enabled)
      })

      return {
        ...current,
        [selectedRole]: next,
      }
    })
  }

  function setAll(enabled) {
    setRoles((current) => {
      const currentRole = current[selectedRole] || {}
      const next = { ...currentRole }

      ALL_PERMISSION_KEYS.forEach((key) => {
        next[key] = Boolean(enabled)
      })

      return {
        ...current,
        [selectedRole]: next,
      }
    })
  }

  async function save() {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const data = await updateRolePermissions(
        selectedRole,
        roles[selectedRole] || {}
      )

      setRoles((current) => ({
        ...current,
        [selectedRole]:
          data.permissions || current[selectedRole],
      }))

      setMessage(
        ar
          ? 'تم حفظ كل صلاحيات الـ Role. تتطبق بعد Refresh أو Login جديد.'
          : 'All role permissions saved. They apply after refresh or next login.'
      )
    } catch (e) {
      setError(e?.message || 'Could not save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        {ar ? 'جاري تحميل الصلاحيات...' : 'Loading permissions...'}
      </div>
    )
  }

  const enabledCount = ALL_PERMISSION_KEYS.filter(
    (key) => Boolean(permissions[key])
  ).length

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black text-black">
            {ar ? 'التحكم الكامل في صلاحيات الـ Roles' : 'Full Role Permission Control'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {ar
              ? 'تحكم في كل صفحة وكل إجراء تقريبًا. الـ Owner يظل Full Access دائمًا ولا يمكن تقييده من هنا.'
              : 'Control almost every page and action. Owner always keeps Full Access and cannot be restricted here.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value)
              setMessage('')
              setError('')
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-black outline-none focus:border-black"
          >
            <option value="eldokan_admin">Admin</option>
            <option value="eldokan_operator">Operator</option>
            <option value="eldokan_finance">Finance</option>
            <option value="eldokan_viewer">Viewer</option>
          </select>

          <span className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
            {enabledCount}/{ALL_PERMISSION_KEYS.length} {ar ? 'مفتوح' : 'enabled'}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="rounded-xl bg-black px-4 py-2.5 text-sm font-black text-white"
        >
          {ar ? 'فتح الكل' : 'Enable All'}
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
        >
          {ar ? 'قفل الكل' : 'Disable All'}
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {PERMISSION_GROUPS.map((group) => {
          const groupEnabled = group.items.filter(
            ([key]) => Boolean(permissions[key])
          ).length

          return (
            <section
              key={group.key}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    {ar ? group.ar : group.en}
                  </h3>
                  <div className="mt-1 text-xs font-bold text-slate-400">
                    {groupEnabled}/{group.items.length}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGroup(group, true)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                  >
                    {ar ? 'فتح القسم' : 'Enable section'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroup(group, false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
                  >
                    {ar ? 'قفل القسم' : 'Disable section'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map(([key, en, arLabel]) => {
                  const enabled = Boolean(permissions[key])

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(key)}
                      className={`flex min-h-[72px] items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-start transition ${
                        enabled
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      <span className="font-bold">
                        {ar ? arLabel : en}
                      </span>

                      <span
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                          enabled ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                            enabled
                              ? ar
                                ? 'left-1'
                                : 'left-6'
                              : ar
                              ? 'left-6'
                              : 'left-1'
                          }`}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      <div className="sticky bottom-3 mt-6 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-xl bg-black px-8 py-3.5 font-black text-white disabled:opacity-50"
        >
          {saving
            ? ar
              ? 'جاري الحفظ...'
              : 'Saving...'
            : ar
            ? 'حفظ كل الصلاحيات'
            : 'Save All Permissions'}
        </button>
      </div>
    </div>
  )
}

function HolidayModeSettings({ ar }) {
  const [enabled, setEnabled] = useState(false)
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('off')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function applyState(data) {
    setEnabled(Boolean(data?.enabled))
    setActive(Boolean(data?.active))
    setStatus(data?.status || (data?.active ? 'active' : 'off'))
    setStartAt(data?.startAt || '')
    setEndAt(data?.endAt || '')
    setUpdatedAt(data?.updatedAt || null)
  }

  useEffect(() => {
    getHolidayMode()
      .then(applyState)
      .catch((e) => setError(e?.message || 'Could not load Holiday Mode'))
      .finally(() => setLoading(false))
  }, [])

  async function saveSchedule() {
    setMessage('')
    setError('')

    if (!startAt || !endAt) {
      setError(
        ar
          ? 'من فضلك حدد تاريخ ووقت البداية والنهاية.'
          : 'Please select both start and end date/time.'
      )
      return
    }

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError(
        ar
          ? 'وقت نهاية الإجازة يجب أن يكون بعد وقت البداية.'
          : 'Holiday end time must be after the start time.'
      )
      return
    }

    setSaving(true)
    try {
      const data = await updateHolidayMode({
        enabled: true,
        startAt,
        endAt,
      })
      applyState(data)
      setMessage(
        ar
          ? 'تم حفظ مدة وضع الإجازة وسيتم تشغيله وإيقافه تلقائيًا.'
          : 'Holiday period saved. It will start and stop automatically.'
      )
    } catch (e) {
      setError(e?.message || 'Could not save Holiday Mode')
    } finally {
      setSaving(false)
    }
  }

  async function disableHolidayMode() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const data = await updateHolidayMode({
        enabled: false,
        startAt,
        endAt,
      })
      applyState(data)
      setMessage(ar ? 'تم إيقاف وضع الإجازة.' : 'Holiday Mode disabled.')
    } catch (e) {
      setError(e?.message || 'Could not disable Holiday Mode')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  const statusText = {
    active: ar ? 'مفعل الآن' : 'Active now',
    scheduled: ar ? 'مجدول' : 'Scheduled',
    ended: ar ? 'انتهت المدة' : 'Period ended',
    off: ar ? 'غير مفعل' : 'Off',
  }[status] || (active ? (ar ? 'مفعل الآن' : 'Active now') : (ar ? 'غير مفعل' : 'Off'))

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-black">
            {ar ? 'وضع الإجازة' : 'Holiday Mode'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {ar
              ? 'حدد بداية ونهاية الإجازة. سيتم تشغيل الوضع وإيقافه تلقائيًا حسب المدة المحددة.'
              : 'Choose the holiday start and end time. Holiday Mode will turn on and off automatically.'}
          </p>
          {updatedAt && (
            <p className="mt-1 text-xs font-bold text-slate-400">
              {ar ? 'آخر تحديث: ' : 'Last updated: '}
              {updatedAt}
            </p>
          )}
        </div>

        <div
          className={`rounded-full px-4 py-2 text-sm font-black ${
            active
              ? 'bg-amber-100 text-amber-800'
              : status === 'scheduled'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {statusText}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-700">
            {ar ? 'بداية الإجازة' : 'Holiday starts'}
          </span>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-700">
            {ar ? 'نهاية الإجازة' : 'Holiday ends'}
          </span>
          <input
            type="datetime-local"
            value={endAt}
            min={startAt || undefined}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={saveSchedule}
          className="rounded-xl bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {saving
            ? (ar ? 'جاري الحفظ...' : 'Saving...')
            : (ar ? 'حفظ مدة الإجازة' : 'Save Holiday Period')}
        </button>

        {enabled && (
          <button
            type="button"
            disabled={saving}
            onClick={disableHolidayMode}
            className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-600 disabled:opacity-50"
          >
            {ar ? 'إيقاف وضع الإجازة' : 'Disable Holiday Mode'}
          </button>
        )}
      </div>

      {enabled && startAt && endAt && (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-black text-slate-800">
            {ar ? 'المدة المحددة: ' : 'Selected period: '}
          </span>
          {startAt.replace('T', ' ')} → {endAt.replace('T', ' ')}
        </div>
      )}

      {message && <div className="mt-3 text-sm font-bold text-emerald-700">{message}</div>}
      {error && <div className="mt-3 text-sm font-bold text-red-700">{error}</div>}
    </div>
  )
}

export default function Settings({
  language,
  currentUser,
  onToggleLanguage,
  onHome,
  onSettings,
  onOrders,
  onProducts,
  onAddProduct,
  onLogout,
}) {
  const ar = language === 'ar'
  const role = currentUser?.role || ''
  const permissions = currentUser?.permissions || {}
  const isOwner = role === 'eldokan_owner'
  const canViewAccounts = isOwner || Boolean(permissions.viewAccounts)
  const canCreateAccounts = isOwner || Boolean(permissions.createAccounts)
  const canDisableAccounts = isOwner || Boolean(permissions.disableAccounts)
  const canAssignRoles = isOwner || Boolean(permissions.assignRoles)
  const canManageAccounts = canDisableAccounts || canAssignRoles || isOwner
  const canDeleteAccounts = isOwner
  const canViewActivity = isOwner || permissions.activityLog
  const canManageHolidayMode = isOwner || Boolean(permissions.manageHolidayMode)

  const availableTabs = useMemo(() => {
    const tabs = []
    if (canViewAccounts) tabs.push('accounts')
    if (canCreateAccounts) tabs.push('add')
    if (canViewActivity) tabs.push('activity')
    if (isOwner) tabs.push('permissions')
    return tabs
  }, [canViewAccounts, canCreateAccounts, canViewActivity, isOwner])

  const [tab, setTab] = useState(availableTabs[0] || 'accounts')
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'eldokan_admin',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!availableTabs.includes(tab)) {
      setTab(availableTabs[0] || 'accounts')
    }
  }, [availableTabs, tab])

  async function loadUsers() {
    if (!canViewAccounts) return
    setLoadingUsers(true)
    setError('')

    try {
      const data = await getOwnerTeam()
      const list =
        data?.users ||
        data?.children ||
        data?.team ||
        data?.accounts ||
        (Array.isArray(data) ? data : [])
      setUsers(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e?.message || (ar ? 'تعذر تحميل الحسابات' : 'Could not load accounts'))
    } finally {
      setLoadingUsers(false)
    }
  }

  async function loadLogs() {
    if (!canViewActivity) return
    setLoadingLogs(true)
    setError('')

    try {
      setLogs(await getActivityLog(300))
    } catch (e) {
      setError(e?.message || (ar ? 'تعذر تحميل سجل العمليات' : 'Could not load activity log'))
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (tab === 'accounts') loadUsers()
  }, [tab])

  useEffect(() => {
    if (tab === 'activity') loadLogs()
  }, [tab])

  async function createAccount(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password.length < 8) {
      setError(ar ? 'الباسورد 8 أحرف على الأقل' : 'Password must be at least 8 characters')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError(ar ? 'الباسورد غير متطابق' : 'Passwords do not match')
      return
    }

    try {
      await createOwnerAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
      })

      setSuccess(ar ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully')
      setForm({
        name: '',
        email: '',
        role: isOwner ? 'eldokan_admin' : 'eldokan_operator',
        password: '',
        confirmPassword: '',
      })

      if (canViewAccounts) {
        await loadUsers()
        setTab('accounts')
      }
    } catch (e) {
      setError(e?.message || (ar ? 'تعذر إنشاء الحساب' : 'Could not create account'))
    }
  }

  async function confirmDeleteAccount() {
    if (!deleteTarget || !deletePassword) {
      setError(
        ar
          ? 'اكتب باسورد حساب الـ Owner لتأكيد الحذف'
          : 'Enter the Owner password to confirm deletion'
      )
      return
    }

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      await deleteOwnerChildAccount(
        deleteTarget.id || deleteTarget.ID,
        deletePassword
      )

      setSuccess(
        ar
          ? 'تم حذف الحساب بنجاح'
          : 'Account deleted successfully'
      )

      setDeleteTarget(null)
      setDeletePassword('')
      await loadUsers()
    } catch (e) {
      setError(
        e?.response?.data?.message ||
        e?.message ||
        (ar ? 'تعذر حذف الحساب' : 'Could not delete account')
      )
    } finally {
      setDeleting(false)
    }
  }

  const tabClass = (name) =>
    `rounded-xl px-5 py-3 text-sm font-black ${
      tab === name ? 'bg-black text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-black focus:ring-4 focus:ring-slate-200'

  return (
    <AccountLayout
      language={language}
      role={role}
      permissions={permissions}
      active="settings"
      onHome={onHome}
      onSettings={onSettings}
      onOrders={onOrders}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onLogout={onLogout}
    >
      <div dir={ar ? 'rtl' : 'ltr'} className="eldokan-page min-h-screen bg-white p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">

          <Breadcrumb
            ar={ar}
            items={[
              {
                label: ar ? 'الإعدادات' : 'Settings',
              },
            ]}
          />
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black text-black">
                {ar ? 'الإعدادات' : 'Settings'}
              </h1>
              <p className="mt-2 text-slate-500">
                {ar ? 'إدارة الحسابات والصلاحيات وسجل العمليات.' : 'Manage accounts, permissions and activity.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
              >
                {ar ? 'English' : 'العربية'}
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
              >
                <span className="text-lg">↻</span>
                <span>{ar ? 'تحديث الصفحة' : 'Refresh Page'}</span>
              </button>
            </div>
          </div>

          {canManageHolidayMode && <HolidayModeSettings ar={ar} />}

          <div className="mb-7 inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {canViewAccounts && (
              <button type="button" onClick={() => setTab('accounts')} className={tabClass('accounts')}>
                {ar ? 'كل الحسابات' : 'All Accounts'}
              </button>
            )}

            {canCreateAccounts && (
              <button type="button" onClick={() => setTab('add')} className={tabClass('add')}>
                {ar ? 'إضافة حساب' : 'Add Account'}
              </button>
            )}

            {canViewActivity && (
              <button type="button" onClick={() => setTab('activity')} className={tabClass('activity')}>
                {ar ? 'سجل العمليات' : 'Activity Log'}
              </button>
            )}

            {isOwner && (
              <button type="button" onClick={() => setTab('permissions')} className={tabClass('permissions')}>
                {ar ? 'صلاحيات الـ Roles' : 'Role Permissions'}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {tab === 'accounts' && canViewAccounts && (
            loadingUsers ? (
              <div className="p-10 text-center text-slate-500">
                {ar ? 'جاري تحميل الحسابات...' : 'Loading accounts...'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'الاسم' : 'Name'}</th>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'البريد' : 'Email'}</th>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'الصلاحية' : 'Role'}</th>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'الحالة' : 'Status'}</th>
                      {canManageAccounts && (
                        <th className="px-4 py-3 text-start text-sm font-black">
                          {ar ? 'الإجراءات' : 'Actions'}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id || user.ID || user.email}>
                        <td className="px-4 py-4 font-bold">{user.name || user.displayName || user.display_name || user.username || '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{user.email || '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{String(
                          user.role === 'eldokan_editor'
                            ? 'operator'
                            : user.role || ''
                        ).replace('eldokan_', '') || '—'}</td>
                        <td className="px-4 py-4 text-slate-600">{user.status || 'approved'}</td>
                        {canManageAccounts && (
                          <td className="px-4 py-4">
                            {(user.id || user.ID) === currentUser?.id ? (
                              <span className="text-xs text-slate-400">
                                {ar ? 'حسابك' : 'Your account'}
                              </span>
                            ) : String(user.role || '') === 'eldokan_owner' ? (
                              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
                                {ar ? 'Owner محمي' : 'Protected Owner'}
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {canDisableAccounts && <button
                                  type="button"
                                  onClick={async () => {
                                    setError('')
                                    setSuccess('')
                                    try {
                                      await changeUserStatus(
                                        user.id || user.ID,
                                        user.status === 'disabled'
                                          ? 'approved'
                                          : 'disabled'
                                      )
                                      setSuccess(
                                        ar
                                          ? user.status === 'disabled'
                                            ? 'تم تفعيل الحساب.'
                                            : 'تم إيقاف الحساب.'
                                          : user.status === 'disabled'
                                          ? 'Account enabled.'
                                          : 'Account disabled.'
                                      )
                                      await loadUsers()
                                    } catch (e) {
                                      setError(
                                        e?.message ||
                                          (ar
                                            ? 'تعذر تغيير حالة الحساب'
                                            : 'Could not change account status')
                                      )
                                    }
                                  }}
                                  className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                                    user.status === 'disabled'
                                      ? 'border-green-300 text-emerald-700 hover:bg-emerald-50'
                                      : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                  }`}
                                >
                                  {user.status === 'disabled'
                                    ? ar
                                      ? 'تفعيل'
                                      : 'Enable'
                                    : ar
                                    ? 'إيقاف'
                                    : 'Disable'}
                                </button>}

                                {canAssignRoles && <select
                                  value={
                                    user.role === 'eldokan_editor'
                                      ? 'eldokan_operator'
                                      : user.role || 'eldokan_viewer'
                                  }
                                  onChange={async (event) => {
                                    setError('')
                                    setSuccess('')
                                    try {
                                      await changeAccountRole(
                                        user.id || user.ID,
                                        event.target.value
                                      )
                                      setSuccess(
                                        ar
                                          ? 'تم تغيير الـ Role.'
                                          : 'Role updated.'
                                      )
                                      await loadUsers()
                                    } catch (e) {
                                      setError(
                                        e?.message ||
                                          (ar
                                            ? 'تعذر تغيير الـ Role'
                                            : 'Could not change role')
                                      )
                                    }
                                  }}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
                                >
                                  <option value="eldokan_admin">Admin</option>
                                  <option value="eldokan_operator">Operator</option>
                                  <option value="eldokan_finance">Finance</option>
                                  <option value="eldokan_viewer">Viewer</option>
                                </select>}

                                {canDeleteAccounts && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteTarget(user)
                                      setDeletePassword('')
                                      setError('')
                                    }}
                                    className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                  >
                                    {ar ? 'حذف' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}

                    {!users.length && (
                      <tr>
                        <td colSpan={canManageAccounts ? 5 : 4} className="px-4 py-10 text-center text-slate-400">
                          {ar ? 'لا توجد حسابات' : 'No accounts found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'add' && canCreateAccounts && (
            <form onSubmit={createAccount} className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-200 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold">{ar ? 'الاسم' : 'Name'}</label>
                <input required value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} className={inputClass} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({...form, email:e.target.value})} className={inputClass} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">{ar ? 'الصلاحية' : 'Role'}</label>
                <select value={form.role} onChange={(e) => setForm({...form, role:e.target.value})} className={inputClass}>
                  {isOwner && <option value="eldokan_admin">Admin</option>}
                  <option value="eldokan_operator">Operator</option>
                  {isOwner && <option value="eldokan_finance">Finance</option>}
                  <option value="eldokan_viewer">Viewer</option>
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <input required type="password" placeholder={ar ? 'الباسورد' : 'Password'} value={form.password} onChange={(e) => setForm({...form, password:e.target.value})} className={inputClass} />
                <input required type="password" placeholder={ar ? 'تأكيد الباسورد' : 'Confirm Password'} value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword:e.target.value})} className={inputClass} />
              </div>

              <div className="flex justify-end">
                <button className="rounded-xl bg-black px-7 py-3.5 font-black text-white">
                  {ar ? 'إنشاء الحساب' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {tab === 'activity' && canViewActivity && (
            loadingLogs ? (
              <div className="p-10 text-center text-slate-500">
                {ar ? 'جاري تحميل سجل العمليات...' : 'Loading activity log...'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'التاريخ والوقت' : 'Date & Time'}</th>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'المستخدم' : 'User'}</th>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'العملية' : 'Action'}</th>
                      <th className="px-4 py-3 text-start text-sm font-black">{ar ? 'التفاصيل' : 'Details'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">{log.timestamp || '—'}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold">{log.actor?.name || '—'}</div>
                          <div className="text-xs text-slate-400">{log.actor?.email || ''}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black">
                            {String(log.action || '').replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{log.description || '—'}</td>
                      </tr>
                    ))}

                    {!logs.length && (
                      <tr>
                        <td colSpan="4" className="px-4 py-10 text-center text-slate-400">
                          {ar ? 'لا توجد عمليات مسجلة' : 'No activity recorded'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'permissions' && isOwner && <RolePermissions ar={ar} />}

          {canDeleteAccounts && deleteTarget && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-xl font-black text-black">
                  {ar ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {ar
                    ? `سيتم حذف حساب ${deleteTarget.name || deleteTarget.email}. اكتب باسورد الـ Owner للتأكيد.`
                    : `You are deleting ${deleteTarget.name || deleteTarget.email}. Enter the Owner password to confirm.`}
                </p>

                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder={ar ? 'باسورد الـ Owner' : 'Owner password'}
                  className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3.5 outline-none focus:border-black focus:ring-4 focus:ring-slate-200"
                />

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={confirmDeleteAccount}
                    className="flex-1 rounded-xl bg-red-600 px-5 py-3 font-black text-white disabled:opacity-50"
                  >
                    {deleting
                      ? ar
                        ? 'جاري الحذف...'
                        : 'Deleting...'
                      : ar
                      ? 'حذف الحساب'
                      : 'Delete Account'}
                  </button>

                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setDeleteTarget(null)
                      setDeletePassword('')
                    }}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-bold"
                  >
                    {ar ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  )
}
