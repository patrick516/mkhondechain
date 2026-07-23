import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axios from "@/api/axios";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/auth/login", { username, password });
      login(res.data.token, res.data.admin);
      toast.success(`Welcome back, ${res.data.admin.username}!`);
      navigate("/");
    } catch (err: any) {
      const message =
        err?.response?.data?.error || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 rounded-full bg-white opacity-5" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white opacity-[0.03]" />

        {/* Logo & Name */}
        <img
          src="/mkhondeChain.webp"
          alt="MkhondeChain Logo"
          className="h-24 w-24 mb-6 object-contain drop-shadow-lg"
        />
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          MkhondeChain
        </h1>
        <p className="text-blue-200 text-lg text-center max-w-sm leading-relaxed">
          Village Savings on Digital Finance
        </p>

        {/* Divider */}
        <div className="w-16 h-1 bg-accent rounded-full my-8" />

        {/* Features */}
        <div className="space-y-4 w-full max-w-sm">
          {[
            { icon: "📱", text: "USSD access for any phone" },

            { icon: "💸", text: "Airtel Money & TNM Mpamba" },
            { icon: "👩‍👩‍👧", text: "Built for Malawian communities" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 text-blue-100"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile logo — only shows on small screens */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <img
            src="/mkhondeChain.webp"
            alt="MkhondeChain Logo"
            className="h-16 w-16 mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-primary">MkhondeChain</h1>
          <p className="text-gray-500 text-sm">
            Village Savings on Digital Finance
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
            <p className="text-gray-500 text-sm mt-1">
              Sign in to manage your savings group
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            MkhondeChain Admin Dashboard · Malawi
          </p>
        </div>
      </div>
    </div>
  );
}
