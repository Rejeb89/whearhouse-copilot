import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { Package, Truck, BarChart3, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setIsBlocked(false)
    
    // Trim inputs
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    
    if (!trimmedEmail) {
      setError('📧 يرجى إدخال البريد الإلكتروني')
      setLoading(false)
      return
    }
    
    if (!trimmedPassword) {
      setError('🔐 يرجى إدخال كلمة المرور')
      setLoading(false)
      return
    }
    
    try {
      const u = await login(trimmedEmail, trimmedPassword)
      navigate(u?.role === 'ADMIN' ? '/monitoring' : '/')
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || '❌ حدث خطأ أثناء تسجيل الدخول'
      setError(errorMessage)
      
      // التحقق من ما إذا كان الحساب موقوفاً
      if (errorMessage.includes('🔒')) {
        setIsBlocked(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950 flex-col justify-between p-14 relative overflow-hidden select-none">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white opacity-5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-700 opacity-10 rounded-full" />
        {/* Logo / brand */}
        <div className="relative z-10 flex items-center gap-4 hidden">
          <img
            src="/logo.png"
            alt="شعار الحرس الوطني"
            className="w-14 h-14 object-contain drop-shadow-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div>
            <p className="text-white text-xl font-bold leading-tight">الإدارة العامة للحرس الوطني</p>
          </div>
        </div>
        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          <img
            src="/logo.png"
            alt="شعار الحرس الوطني"
            className="w-44 h-44 object-contain drop-shadow-2xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <h1 className="text-4xl font-extrabold text-white text-center leading-snug">
            <span className="text-blue-200">الإدارة العامة للحرس الوطني</span>
          </h1>
          <p className="text-blue-100 text-base text-center max-w-sm leading-relaxed">
            منصة إدارة الموارد و الوسائل المادية مع ضمان رقابة شاملة وتقارير دقيقة.
          </p>
          <div className="grid grid-cols-4 gap-3 w-full mt-2">
            {[
              { label: 'ادارة الموارد', Icon: Package },
              { label: 'ادارة الوسائل', Icon: Truck },
              { label: 'تقارير فورية', Icon: BarChart3 },
              { label: 'مراقبة و تدقيق', Icon: Eye },
            ].map((f) => (
              <div key={f.label} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="mb-2 flex justify-center">
                  <f.Icon className="w-7 h-7 text-blue-200" strokeWidth={1.5} />
                </div>
                <p className="text-white text-xs font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <p className="relative z-10 text-blue-300 text-sm text-center">
          © 2026 الإدارة العامة للحرس الوطني — جميع الحقوق محفوظة
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <img
              src="/logo.png"
              alt="شعار الحرس الوطني"
              className="w-12 h-12 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div>
              <p className="text-foreground font-bold">الإدارة العامة للحرس الوطني</p>
              <p className="text-muted-foreground text-sm">منصة ادارة الموارد و الوسائل المادية</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-lg p-10 border border-border">
            {/* Form header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-4 border-blue-800 shadow-xl shadow-blue-200 flex items-center justify-center p-2">
                    <img
                      src="/logo.png"
                      alt="شعار الحرس الوطني التونسي"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = '<svg class="w-12 h-12 text-blue-800" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>'
                        }
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-1 -left-1 w-6 h-6 bg-blue-800 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">مرحباً بك</h2>
              <p className="text-muted-foreground text-sm mt-1">أدخل بياناتك للوصول إلى النظام</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-foreground">📧 البريد الإلكتروني</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your.email@example.com"
                    className="w-full border border-input bg-background rounded-xl py-3 pr-11 pl-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition hover:bg-muted/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-foreground">🔐 كلمة المرور</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-input bg-background rounded-xl py-3 pr-11 pl-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition hover:bg-muted/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground hover:text-foreground transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className={`flex items-center gap-2.5 border px-4 py-3 rounded-xl text-sm ${
                  isBlocked
                    ? 'bg-orange-50 border-orange-300 text-orange-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {isBlocked ? (
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 2.526a6 6 0 008.367 12.364zm1.414-1.414A8 8 0 111.414 2.586a8 8 0 0113.487 13.487z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{error}</p>
                    {isBlocked && (
                      <p className="text-xs mt-1 opacity-90">يرجى التواصل مع فريق الدعم للمساعدة في تفعيل حسابك.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-950 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>دخول</span>
                    <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
