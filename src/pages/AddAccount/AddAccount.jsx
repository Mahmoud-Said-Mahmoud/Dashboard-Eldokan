import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOwnerAccount } from '../../lib/authApi'
import AccountLayout from '../../components/AccountLayout/AccountLayout'

export default function AddAccount({
  language,
  currentUser,
  onToggleLanguage,
  onBack,
  onCreated,
  onProducts,
  onAddProduct,
  onImportProducts,
  onLogout,
}) {
  const ar = language === 'ar'
  const role = currentUser?.role || ''
  const isOwner = role === 'eldokan_owner'
  const isAdmin = role === 'eldokan_admin'
  const [serverError, setServerError] = useState('')

  const allowedRoles = isOwner
    ? ['eldokan_admin', 'eldokan_operator', 'eldokan_viewer']
    : ['eldokan_admin', 'eldokan_operator', 'eldokan_viewer']

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(2, ar ? 'الاسم مطلوب' : 'Name is required'),
          email: z.string().email(ar ? 'الإيميل غير صحيح' : 'Invalid email'),
          password: z
            .string()
            .min(8, ar ? 'الباسورد 8 أحرف على الأقل' : 'Password must be at least 8 characters'),
          confirmPassword: z.string(),
          role: z.enum(['eldokan_admin', 'eldokan_operator', 'eldokan_viewer']),
        })
        .refine((data) => data.password === data.confirmPassword, {
          path: ['confirmPassword'],
          message: ar ? 'الباسورد غير متطابق' : 'Passwords do not match',
        }),
    [ar]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: isOwner ? 'eldokan_admin' : 'eldokan_operator',
    },
  })

  if (!isOwner && !isAdmin) {
    return null
  }

  async function onSubmit(values) {
    setServerError('')

    if (!allowedRoles.includes(values.role)) {
      setServerError(
        ar ? 'غير مسموح بهذه الصلاحية.' : 'This role is not allowed.'
      )
      return
    }

    try {
      await createOwnerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
      })

      onCreated()
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر إنشاء الحساب'
          : 'Could not create account'
      )
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100'

  return (
    <AccountLayout
      language={language}
      role={role}
      active="add-account"
      onAccounts={onBack}
      onAddAccount={() => {}}
      onProducts={onProducts}
      onAddProduct={onAddProduct}
      onImportProducts={onImportProducts}
      onLogout={onLogout}
    >
      <div dir={ar ? 'rtl' : 'ltr'} className="p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-950">
                {ar ? 'إضافة حساب جديد' : 'Add New Account'}
              </h1>

              <p className="mt-2 text-slate-500">
                {isOwner
                  ? ar
                    ? 'Owner يقدر يضيف Admin أو Operator أو Viewer.'
                    : 'Owner can create Admin, Operator or Viewer.'
                  : ar
                  ? 'Admin يقدر يضيف Admin أو Operator أو Viewer بدون صلاحية حذف الحسابات.'
                  : 'Admin can create Admin, Operator or Viewer, but cannot delete accounts.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
            >
              {ar ? 'English' : 'العربية'}
            </button>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-8"
          >
            <div>
              <label className="mb-2 block text-sm font-bold">
                {ar ? 'الاسم' : 'Name'}
              </label>
              <input {...register('name')} className={inputClass} />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                {ar ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input type="email" {...register('email')} className={inputClass} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                {ar ? 'نوع الحساب' : 'Role'}
              </label>
              <select {...register('role')} className={inputClass}>
                <option value="eldokan_admin">Admin</option>
                <option value="eldokan_operator">Operator</option>
                <option value="eldokan_viewer">Viewer</option>
              </select>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  {ar ? 'الباسورد' : 'Password'}
                </label>
                <input type="password" {...register('password')} className={inputClass} />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  {ar ? 'تأكيد الباسورد' : 'Confirm Password'}
                </label>
                <input type="password" {...register('confirmPassword')} className={inputClass} />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white disabled:opacity-50"
              >
                {isSubmitting
                  ? ar
                    ? 'جاري إنشاء الحساب...'
                    : 'Creating Account...'
                  : ar
                  ? 'إنشاء الحساب'
                  : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-bold text-slate-700"
              >
                {ar ? 'رجوع' : 'Back'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AccountLayout>
  )
}
