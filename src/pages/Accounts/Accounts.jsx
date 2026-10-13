import { useEffect, useState, useMemo } from 'react'
import {
  getOwnerTeam,
  deleteOwnerChildAccount,
  changeAccountRole,
} from '../../lib/authApi'
import AccountLayout from '../../components/AccountLayout/AccountLayout'
import Pagination from '../../components/Common/Pagination'
export default function Accounts({
  language,
  currentUser,
  onToggleLanguage,
  onAddAccount,
  onProducts,
  onAddProduct,
  onImportProducts,
  onLogout,
}) {
  const ar = language === 'ar'
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const role = currentUser?.role || ''
  const isOwner = role === 'eldokan_owner'
  const isAdmin = role === 'eldokan_admin'

  const [owner, setOwner] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [deleteUser, setDeleteUser] = useState(null)
  const [password, setPassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [roleBusyId, setRoleBusyId] = useState(null)

  async function loadAccounts() {
    setLoading(true)
    setError('')

    try {
      const response = await getOwnerTeam()
      setOwner(response?.owner || null)
      setAccounts(response?.children || [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر تحميل الحسابات'
          : 'Could not load accounts'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOwner || isAdmin) {
      loadAccounts()
    }
  }, [role])

  function roleName(value) {
    const map = {
      eldokan_owner: 'Owner',
      eldokan_admin: 'Admin',
      eldokan_editor: 'Editor',
      eldokan_viewer: 'Viewer',
    }

    return map[value] || value || '-'
  }

  function openDelete(user) {
    if (!isOwner || user.role === 'eldokan_owner') return
    setDeleteUser(user)
    setPassword('')
    setDeleteError('')
  }

  function closeDelete() {
    if (deleting) return
    setDeleteUser(null)
    setPassword('')
    setDeleteError('')
  }

  async function confirmDelete() {
    if (!isOwner || !deleteUser) return

    if (!password) {
      setDeleteError(
        ar
          ? 'اكتب باسورد حساب الـ Owner الحالي.'
          : 'Enter the current Owner password.'
      )
      return
    }

    setDeleting(true)
    setDeleteError('')

    try {
      await deleteOwnerChildAccount(deleteUser.id, password)
      setDeleteUser(null)
      setPassword('')
      await loadAccounts()
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : ar
          ? 'الباسورد غير صحيح أو تعذر حذف الحساب.'
          : 'Incorrect password or account deletion failed.'
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleRoleChange(userId, nextRole) {
    if (!isOwner) return

    setRoleBusyId(userId)
    setError('')

    try {
      await changeAccountRole(userId, nextRole)
      await loadAccounts()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر تغيير الصلاحية'
          : 'Could not change role'
      )
    } finally {
      setRoleBusyId(null)
    }
  }

  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize
    return (accounts || []).slice(start, start + pageSize)
  }, [accounts, page, pageSize])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(((accounts || []).length) / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [accounts, page, pageSize])

  if (!isOwner && !isAdmin) {
    return (
      <div dir={ar ? 'rtl' : 'ltr'} className="eldokan-page min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {ar ? 'غير مسموح' : 'Access Denied'}
          </h1>
          <p className="mt-3 text-slate-500">
            {ar
              ? 'إدارة الحسابات متاحة للـ Owner وAdmin فقط.'
              : 'Account management is available to Owner and Admin only.'}
          </p>
        </div>
      </div>
    )
  }


  return (
    <AccountLayout
      language={language}
      role={role}
      active="accounts"
      onAccounts={() => {}}
      onAddAccount={onAddAccount}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onImportProducts={onImportProducts}
      onLogout={onLogout}
    >
      <div dir={ar ? 'rtl' : 'ltr'} className="p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950">
                {ar ? 'إدارة الحسابات' : 'Account Management'}
              </h1>

              <p className="mt-2 text-slate-500">
                {isOwner
                  ? ar
                    ? 'يمكنك إضافة الحسابات وتغيير الصلاحيات وحذف الحسابات التابعة لك.'
                    : 'You can create accounts, change roles and delete your child accounts.'
                  : ar
                  ? 'يمكنك إضافة الحسابات، لكن لا يمكنك حذف أي حساب.'
                  : 'You can create accounts, but you cannot delete any account.'}
              </p>

              {owner && (
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Owner: {owner.name || owner.email}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleLanguage}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
              >
                {ar ? 'English' : 'العربية'}
              </button>

              <button
                type="button"
                onClick={onAddAccount}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                {ar ? 'إضافة حساب' : 'Add Account'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center text-slate-500">
              {ar ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-bold">{ar ? 'الاسم' : 'Name'}</th>
                    <th className="px-4 py-3 text-start text-sm font-bold">{ar ? 'الإيميل' : 'Email'}</th>
                    <th className="px-4 py-3 text-start text-sm font-bold">{ar ? 'الصلاحية' : 'Role'}</th>
                    <th className="px-4 py-3 text-start text-sm font-bold">{ar ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-start text-sm font-bold">{ar ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedAccounts.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {user.name || '-'}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {user.email || '-'}
                      </td>

                      <td className="px-4 py-4">
                        {isOwner ? (
                          <select
                            value={user.role || 'eldokan_viewer'}
                            disabled={roleBusyId === user.id}
                            onChange={(event) =>
                              handleRoleChange(user.id, event.target.value)
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                          >
                            <option value="eldokan_admin">Admin</option>
                            <option value="eldokan_editor">Editor</option>
                            <option value="eldokan_viewer">Viewer</option>
                          </select>
                        ) : (
                          roleName(user.role)
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {user.status || '-'}
                      </td>

                      <td className="px-4 py-4">
                        {isOwner && user.role !== 'eldokan_owner' ? (
                          <button
                            type="button"
                            onClick={() => openDelete(user)}
                            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                          >
                            {ar ? 'حذف' : 'Delete'}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!accounts.length && (
                <div className="p-10 text-center text-slate-500">
                  {ar ? 'لا توجد حسابات بعد.' : 'No accounts yet.'}
                </div>
              )}
            </div>
          )}
        </div>

        {deleteUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-black text-slate-950">
                {ar ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {ar
                  ? 'اكتب باسورد حساب الـ Owner الحالي لتأكيد الحذف.'
                  : 'Enter the current Owner password to confirm deletion.'}
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="font-bold text-slate-900">
                  {deleteUser.name || '-'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {deleteUser.email}
                </div>
              </div>

              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={ar ? 'باسورد الـ Owner' : 'Owner Password'}
                className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
              />

              {deleteError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50"
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
                  onClick={closeDelete}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700"
                >
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      
        <Pagination
          page={page}
          totalItems={(accounts || []).length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          ar={ar}
        />
</div>
    </AccountLayout>
  )
}
