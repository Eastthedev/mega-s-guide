'use client';

import React, { useState } from 'react';
import { Heart, Stethoscope, Mail, Lock, Sparkles, Activity } from 'lucide-react';
import { supabase } from '../utils/supabase';
import styles from './AuthScreen.module.css';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onAddToast: (message: string) => void;
}

export default function AuthScreen({ onAuthSuccess, onAddToast }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onAddToast("Please fill in your email address! ✉️");
      return;
    }

    if (isForgotPassword) {
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        });

        if (error) throw error;

        onAddToast("Password reset link sent! Check your email! ✉️");
        setIsForgotPassword(false);
      } catch (err: any) {
        console.error(err);
        onAddToast(`Error: ${err.message || "Failed to send password reset email."}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      onAddToast("Please fill in your password! 🔒");
      return;
    }

    if (password.length < 6) {
      onAddToast("Password must be at least 6 characters. 🔒");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
          }
        });

        if (error) throw error;
        
        onAddToast("Signup successful! Welcome to your guide, future doctor! 🩺❤️");
        // If email confirmation is disabled (default in Supabase new projects), they log in immediately
        if (data?.session) {
          onAuthSuccess();
        } else {
          onAddToast("Check your email for a confirmation link! ✉️");
        }
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        onAddToast("Welcome back, Baby! Let's get to studying! 🩺🔥");
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error(err);
      onAddToast(`Auth Error: ${err.message || "Failed to authenticate."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* Decorative elements */}
        <div className={styles.decorCircle1} />
        <div className={styles.decorCircle2} />

        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <Heart className={styles.heartIcon} fill="var(--color-teal)" size={24} />
            <Activity className={styles.pulseIcon} size={14} />
            <Stethoscope className={styles.stethIcon} size={20} />
          </div>
          <h2 className={styles.title}>Mega's Guide</h2>
          <p className={styles.subtitle}>
            {isForgotPassword
              ? "Reset your password to access your guide."
              : isSignUp 
                ? "Create your personal medical companion account." 
                : "Welcome back, Baby! Ready to study?"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={16} />
              <input
                type="email"
                className={styles.input}
                placeholder="doctor.baby@exam.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div className={styles.inputGroup}>
              <div className={styles.passwordLabelRow}>
                <label className={styles.label}>Password</label>
                {!isSignUp && (
                  <button 
                    type="button" 
                    className={styles.forgotBtn}
                    onClick={() => setIsForgotPassword(true)}
                    disabled={isLoading}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={16} />
                <input
                  type="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            <Sparkles size={16} className={isLoading ? "animate-spin" : ""} />
            <span>
              {isLoading 
                ? "Please wait..." 
                : isForgotPassword 
                  ? "Send Reset Link" 
                  : isSignUp 
                    ? "Create Account" 
                    : "Access Guide"
              }
            </span>
          </button>
        </form>

        <div className={styles.footer}>
          {isForgotPassword ? (
            <button 
              type="button" 
              className={styles.toggleBtn}
              onClick={() => setIsForgotPassword(false)}
              disabled={isLoading}
            >
              Back to Login
            </button>
          ) : (
            <button 
              type="button" 
              className={styles.toggleBtn}
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
            >
              {isSignUp 
                ? "Already have an account? Log In" 
                : "Don't have an account? Sign Up"
              }
            </button>
          )}
          
          <p className={styles.heartNotice}>
            Built with love just for you. 🩺❤️
          </p>
        </div>
      </div>
    </div>
  );
}
