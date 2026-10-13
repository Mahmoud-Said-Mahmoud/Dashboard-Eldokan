import { Component } from 'react'

// Catches a crash in any page so the seller sees a way to recover instead of
// a blank screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Dashboard error:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    const ar = document.documentElement.lang !== 'en'

    return (
      <main
        dir={ar ? 'rtl' : 'ltr'}
        className="flex min-h-screen items-center justify-center bg-slate-100 p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            {ar ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>

          <p className="mt-3 text-slate-500">
            {ar
              ? 'أعد تحميل الصفحة للمتابعة.'
              : 'Reload the page to continue.'}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-black px-5 py-3 font-bold text-white"
          >
            {ar ? 'إعادة تحميل الصفحة' : 'Reload Page'}
          </button>
        </div>
      </main>
    )
  }
}
