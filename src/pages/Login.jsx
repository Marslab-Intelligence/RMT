import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      if (err === 'access_denied') {
        setShowAccessDenied(true);
      } else if (err === 'sso_failed') {
        setErrorMessage('SSO authentication failed. Please try again.');
      } else if (err === 'token_exchange_failed') {
        setErrorMessage('Authentication error. Please try again.');
      } else if (err === 'no_email') {
        setErrorMessage('Could not retrieve your email. Please try again.');
      } else if (err === 'sso_error') {
        setErrorMessage('An error occurred during sign-in. Please try again.');
      } else {
        setErrorMessage(err);
      }
      // Clean URL params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const dismissAccessDenied = () => {
    setShowAccessDenied(false);
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Access Denied Popup Modal */}
      <AnimatePresence>
        {showAccessDenied && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={dismissAccessDenied}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center relative border border-surface-200 dark:border-surface-700">
                <button
                  onClick={() => window.location.href = '/api/auth/zoho/logout'}
                  className="absolute top-4 right-4 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                  <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>

                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
                  Access Denied
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-2">
                  Your account is not authorized to access this portal.
                </p>
                <p className="text-xs text-surface-400 dark:text-surface-500 mb-6">
                  Please contact your system administrator if you believe this is an error.
                </p>

                <button
                  onClick={() => window.location.href = '/api/auth/zoho/logout'}
                  className="w-full py-2.5 px-4 rounded-lg bg-surface-900 dark:bg-white text-white dark:text-surface-900 text-sm font-semibold hover:bg-surface-800 dark:hover:bg-surface-100 transition-colors"
                >
                  Switch Zoho Account
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <img src="/logo.png" alt="MarsLab Logo" className="h-16 w-auto object-contain" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-center text-sm text-surface-600 dark:text-surface-400"
        >
          Enterprise Renewal Management System
        </motion.p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white dark:bg-surface-800 py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-surface-200 dark:border-surface-700">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-surface-900 dark:text-white">Single Sign-On</h3>
            <p className="mt-1 text-xs text-surface-500">Sign in securely using your official MarsLab corporate Zoho identity.</p>
          </div>

          {errorMessage && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg text-center">
              {errorMessage}
            </div>
          )}

          <div>
            <a
              href="/api/auth/zoho"
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm bg-surface-900 dark:bg-white text-sm font-semibold text-white dark:text-surface-900 hover:bg-surface-800 dark:hover:bg-surface-100 transition-all duration-200 no-underline"
            >
              Continue with Zoho SSO →
            </a>
          </div>

          <div className="mt-8 border-t border-surface-200 dark:border-surface-700 pt-6">
            <div className="text-xs text-center text-surface-400">
              Only authorized employees can access this portal.<br />
              If you don't have access, contact the administrator.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
