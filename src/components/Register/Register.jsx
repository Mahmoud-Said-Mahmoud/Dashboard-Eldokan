import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createRegisterSchema } from '../../lib/authSchemas'
import { registerUser } from '../../lib/authApi'

export default function Register({ onGoLogin, language, t, onToggleLanguage }) {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const schema = useMemo(() => createRegisterSchema(t.validation), [t])
  const isArabic = language === 'ar'

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
      companyAddress: '',
      taxNumber: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  const onSubmit = async (data) => {
    setServerError('')
    setSuccess('')

    try {
      await registerUser(data)
      setSuccess(t.registerSuccess)
      setSelectedFileName('')
      reset()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : t.registerFailed)
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100'

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="relative border-b border-slate-200 px-6 py-8 sm:px-10">
          <button
            type="button"
            onClick={onToggleLanguage}
            className={`absolute top-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 ${isArabic ? 'left-6' : 'right-6'}`}
          >
            {t.language}
          </button>

          <p className="text-sm font-black text-slate-500">{t.registration}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">{t.registerTitle}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-500">
            {isArabic
              ? 'أدخل بياناتك وبيانات الشركة وارفع ملف PDF واحد يحتوي على السجل الضريبي والبطاقة الشخصية أو الباسبور.'
              : 'Enter your details and company information, then upload one PDF containing the tax registration and National ID or passport.'}
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-9 p-6 sm:p-10">
          <section>
            <h2 className="text-lg font-black text-slate-900">{t.userData}</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.fullName}</label>
                <input {...register('fullName')} className={inputClass} />
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.email}</label>
                <input type="email" autoComplete="email" {...register('email')} className={inputClass} />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.phone}</label>
                <input {...register('phone')} className={inputClass} />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-black text-slate-900">{t.companyData}</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.companyName}</label>
                <input {...register('companyName')} className={inputClass} />
                {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.taxNumber}</label>
                <input {...register('taxNumber')} className={inputClass} />
                {errors.taxNumber && <p className="mt-1 text-sm text-red-600">{errors.taxNumber.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.companyAddress}</label>
                <textarea rows={3} {...register('companyAddress')} className={`${inputClass} resize-none`} />
                {errors.companyAddress && <p className="mt-1 text-sm text-red-600">{errors.companyAddress.message}</p>}
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-black text-slate-900">{t.documents}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isArabic
                ? 'ملف PDF واحد فقط، يحتوي على السجل/البطاقة الضريبية + البطاقة الشخصية أو الباسبور. الحد الأقصى 5MB.'
                : 'One PDF only containing the tax registration document + National ID or passport. Maximum size 5MB.'}
            </p>

            <div className="mt-5 max-w-2xl">
              <Controller
                control={control}
                name="verificationPdf"
                // A file input cannot take a value, so it is left out of {...field}.
                // eslint-disable-next-line no-unused-vars
                render={({ field: { onChange, value, ...field } }) => (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      {isArabic ? 'مستندات التحقق PDF' : 'Verification Documents PDF'}
                    </label>
                    <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-slate-500 hover:bg-slate-100">
                      <span className="text-base font-black text-slate-800">{t.choosePdf}</span>
                      <span className="mt-2 text-sm text-slate-500">
                        {selectedFileName || (isArabic ? 'PDF واحد — بحد أقصى 5MB' : 'One PDF — maximum 5MB')}
                      </span>
                      <input
                        {...field}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          setSelectedFileName(file?.name || '')
                          onChange(file)
                        }}
                      />
                    </label>
                    {errors.verificationPdf && <p className="mt-1 text-sm text-red-600">{errors.verificationPdf.message}</p>}
                  </div>
                )}
              />
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-black text-slate-900">{t.passwordSection}</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('password')}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className={`absolute top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 ${isArabic ? 'left-4' : 'right-4'}`}
                  >
                    {showPassword ? t.hide : t.show}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t.confirmPassword}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className={`absolute top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 ${isArabic ? 'left-4' : 'right-4'}`}
                  >
                    {showConfirmPassword ? t.hide : t.show}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <label className="mt-5 flex items-start gap-3">
              <input type="checkbox" {...register('acceptTerms')} className="mt-1 h-4 w-4 rounded border-slate-300" />
              <span className="text-sm leading-6 text-slate-600">{t.terms}</span>
            </label>
            {errors.acceptTerms && <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>}
          </section>

          {serverError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

          <div className="flex flex-col gap-4 border-t border-slate-200 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={onGoLogin} className="text-sm font-black text-slate-700 hover:text-slate-950">
              {t.backToLogin}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-slate-950 px-7 py-3.5 font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t.submitting : t.createAndSubmit}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
