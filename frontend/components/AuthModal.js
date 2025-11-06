'use client'

import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isLogin) {
        // Registration validation
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        if (formData.password.length < 8) {
          toast.error('Password must be at least 8 characters long');
          setLoading(false);
          return;
        }
      }

      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('walletrix_auth_token', data.token);
        localStorage.setItem('walletrix_user', JSON.stringify(data.user));
        
        toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
        
        // Call the authentication callback
        onAuthenticated(data.user, data.token);
        onClose();
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-purple-500/20 rounded-2xl p-8 w-full max-w-md relative">
        {/* Back button */}
        <button
          onClick={() => {
            onClose();
            toast.success('Back to welcome screen');
          }}
          className="absolute top-4 left-4 text-gray-400 hover:text-purple-400 transition-all duration-200 flex items-center gap-2 text-sm hover:bg-purple-500/10 px-2 py-1 rounded-lg"
          title="Back to welcome"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {isLogin ? <LogIn className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400">
            {isLogin ? 'Sign in to access your wallets' : 'Sign up to get started with Walletrix'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name field (registration only) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter your full name"
                required={!isLogin}
              />
            </div>
          )}

          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm password field (registration only) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Confirm your password"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={switchMode}
              className="text-purple-400 hover:text-purple-300 ml-1 font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}