import { useState, type FormEvent } from "react";
import { Lock, LogIn } from "lucide-react";
import { signIn } from "../lib/auth";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    try {
      await signIn(username, password);
      onLoginSuccess();
    } catch {
      // Generic message on purpose — don't reveal whether the username
      // exists or the password was wrong.
      setLoginError("Username atau password salah!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-black p-6 text-center border-b-4 border-yellow-400">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Lock size={32} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-yellow-400 tracking-wider">PONDE CLICK</h1>
          <p className="text-gray-400 text-sm mt-1">Silakan login untuk melanjutkan</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center font-medium">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50 focus:bg-white transition-all"
                placeholder="Masukkan username..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50 focus:bg-white transition-all"
                placeholder="Masukkan password..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-yellow-400 text-black font-black py-3 rounded-xl mt-4 hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
            >
              <LogIn size={20} /> {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}