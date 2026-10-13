import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createLoginSchema } from '../../lib/authSchemas'
import { completePasswordReset, loginUser, requestPasswordReset } from '../../lib/authApi'

export default function Login({ onGoRegister, onLoginSuccess, language, t, onToggleLanguage }) {
  const [serverError, setServerError] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetStep, setResetStep] = useState('login') // login | email | password | done
  const [resetEmail, setResetEmail] = useState('')
  const [resetId, setResetId] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetSecondsLeft, setResetSecondsLeft] = useState(0)
  const schema = useMemo(() => createLoginSchema(t.validation), [t])

  useEffect(() => {
    if (resetStep !== 'password' || resetSecondsLeft <= 0) return undefined
    const timer = window.setInterval(() => {
      setResetSecondsLeft((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resetStep, resetSecondsLeft])

  const resetTimerLabel = useMemo(() => {
    const minutes = Math.floor(resetSecondsLeft / 60)
    const seconds = String(resetSecondsLeft % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [resetSecondsLeft])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data) => {
    setServerError('')
    setAccountMessage('')
    setSuccess('')

    try {
      const response = await loginUser(data)

      if (response?.blocked && response?.blockReason === 'pending') {
        setAccountMessage(language === 'ar'
          ? 'حسابك قيد المراجعة حتى تتم الموافقة عليه من الإدارة.'
          : 'Your account is under review until it is approved by the administrator.')
        return
      }

      if (response?.blocked && response?.blockReason === 'rejected') {
        setServerError(language === 'ar'
          ? 'تم رفض طلب تسجيل حسابك. يرجى التواصل مع الإدارة.'
          : 'Your registration request was rejected. Please contact the administrator.')
        return
      }

      setSuccess(t.loginSuccess)
      onLoginSuccess?.(response?.user)
    } catch (error) {
      if (error?.code === 'account_pending') {
        setAccountMessage(language === 'ar'
          ? 'حسابك قيد المراجعة حتى تتم الموافقة عليه من الإدارة.'
          : 'Your account is under review until it is approved by the administrator.')
        return
      }
      setServerError(error instanceof Error ? error.message : t.loginFailed)
    }
  }

  const validatePassword = (value) => (
    value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)
  )

  const sendResetCode = async (event) => {
    event?.preventDefault?.()
    setResetError('')
    setResetMessage('')

    const email = resetEmail.trim()
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setResetError(t.validation.emailInvalid)
      return
    }

    setResetSubmitting(true)
    try {
      const response = await requestPasswordReset(email)
      setResetId(response?.resetId || '')
      setResetSecondsLeft(Number(response?.expiresIn || 600))
      setResetMessage(t.resetEmailSent)
      setResetStep('password')
    } catch (error) {
      setResetError(error instanceof Error ? error.message : t.resetEmailFailed)
    } finally {
      setResetSubmitting(false)
    }
  }

  const saveNewPassword = async (event) => {
    event.preventDefault()
    setResetError('')
    setResetMessage('')

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setResetError(t.invalidVerificationCode)
      return
    }
    if (!validatePassword(newPassword)) {
      setResetError(t.validation.passwordMin)
      return
    }
    if (newPassword !== confirmNewPassword) {
      setResetError(t.validation.passwordMismatch)
      return
    }

    setResetSubmitting(true)
    try {
      await completePasswordReset({
        email: resetEmail.trim(),
        resetId,
        code: verificationCode.replace(/\D/g, ''),
        password: newPassword,
      })
      setResetStep('done')
      setResetMessage(t.passwordResetSuccess)
      setVerificationCode('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error) {
      setResetError(error instanceof Error ? error.message : t.passwordResetFailed)
    } finally {
      setResetSubmitting(false)
    }
  }

  const backToLogin = () => {
    setResetStep('login')
    setResetError('')
    setResetMessage('')
    setResetEmail('')
    setResetId('')
    setVerificationCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    setResetSecondsLeft(0)
  }

  const isArabic = language === 'ar'
  const resetMode = resetStep !== 'login'

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-2">
        <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold">{t.merchantPortal}</div>
            <h1 className="mt-10 max-w-lg text-5xl font-black leading-tight">{t.loginHeroTitle}</h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-slate-300">{t.loginHeroText}</p>
          </div>
          <p className="text-sm text-slate-400">ElDokan ready integration</p>
        </section>

        <section className="relative flex items-center p-6 sm:p-10 lg:p-14">
          <button type="button" onClick={onToggleLanguage}
            className={`absolute top-5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 ${isArabic ? 'left-5' : 'right-5'}`}>
            {t.language}
          </button>

          <div className="mx-auto w-full max-w-md">
            <p className="text-sm font-bold text-slate-500">{resetMode ? t.resetPassword : t.welcomeBack}</p>
            <h2 className="mt-2 text-4xl font-black text-slate-950">{resetMode ? t.resetPassword : t.login}</h2>
            <p className="mt-3 text-slate-500">{resetMode ? t.resetPasswordSubtitle : t.loginSubtitle}</p>

            {resetStep === 'email' && (
              <form onSubmit={sendResetCode} className="mt-9 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t.email}</label>
                  <input type="email" autoComplete="email" value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)} placeholder="name@company.com"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                </div>
                {resetError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{resetError}</div>}
                <button disabled={resetSubmitting} className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {resetSubmitting ? t.sendingResetLink : t.sendResetLink}
                </button>
                <button type="button" onClick={backToLogin} className="w-full text-sm font-black text-slate-700 hover:text-slate-950 hover:underline">{t.backToLogin}</button>
              </form>
            )}

            {resetStep === 'password' && (
              <form onSubmit={saveNewPassword} className="mt-9 space-y-5">
                {resetMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{resetMessage}</div>}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t.verificationCode}</label>
                  <input inputMode="numeric" maxLength={6} value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-center text-xl tracking-[0.35em] outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                  <p className="mt-2 text-xs text-slate-500">{t.verificationCodeHint}</p>
                  <p className={`mt-2 text-xs font-black ${resetSecondsLeft > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {resetSecondsLeft > 0
                      ? (isArabic ? `الكود صالح لمدة ${resetTimerLabel}` : `Code expires in ${resetTimerLabel}`)
                      : (isArabic ? 'انتهت صلاحية الكود. اطلب كود جديد.' : 'Code expired. Request a new code.')}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t.newPassword}</label>
                  <input type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t.confirmNewPassword}</label>
                  <input type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                  <button type="button" onClick={() => setShowNewPassword(v => !v)} className="mt-2 text-xs font-bold text-slate-500 hover:underline">{showNewPassword ? t.hide : t.show}</button>
                </div>
                {resetError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{resetError}</div>}
                <button disabled={resetSubmitting || resetSecondsLeft <= 0} className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {resetSubmitting ? t.savingNewPassword : t.saveNewPassword}
                </button>
                <button type="button" disabled={resetSubmitting} onClick={sendResetCode} className="w-full text-sm font-black text-slate-700 hover:text-slate-950 hover:underline">{t.resendCode}</button>
                <button type="button" onClick={backToLogin} className="w-full text-sm font-black text-slate-700 hover:text-slate-950 hover:underline">{t.backToLogin}</button>
              </form>
            )}

            {resetStep === 'done' && (
              <div className="mt-9 space-y-5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">{resetMessage || t.passwordResetSuccess}</div>
                <button type="button" onClick={backToLogin} className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white hover:bg-slate-800">{t.backToLogin}</button>
              </div>
            )}

            {resetStep === 'login' && (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">{t.email}</label>
                  <input type="email" autoComplete="email" {...register('email')} placeholder="name@company.com"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100" />
                  {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-bold text-slate-700">{t.password}</label>
                    <button type="button" onClick={() => { setResetStep('email'); setResetError(''); setResetMessage(''); setServerError(''); setAccountMessage(''); setSuccess('') }}
                      className="text-xs font-black text-slate-700 hover:text-slate-950 hover:underline">{t.forgotPassword}</button>
                  </div>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...register('password')} placeholder="••••••••"
                      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100 ${isArabic ? 'pl-20' : 'pr-20'}`} />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className={`absolute top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 ${isArabic ? 'left-3' : 'right-3'}`}>
                      {showPassword ? t.hide : t.show}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>}
                </div>
                {accountMessage && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{accountMessage}</div>}
                {serverError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}
                {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}
                <button disabled={isSubmitting} className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? t.loggingIn : t.login}
                </button>
              </form>
            )}

            {resetStep === 'login' && (
              <p className="mt-7 text-center text-sm text-slate-500">
                {t.noAccount}{' '}
                <button type="button" onClick={onGoRegister} className="font-black text-slate-950 hover:underline">{t.createCompanyAccount}</button>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
