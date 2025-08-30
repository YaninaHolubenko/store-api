import React from 'react';
import styles from './OAuthButtons.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function OAuthButtons() {
  const googleHref = `${API_URL}/auth/google`;

  return (
    <div className={styles.row} aria-label="Third-party sign in options">
      <a href={googleHref} className={styles.oauthBtn}>
        <span className={styles.logo} aria-hidden="true">
          {/* Official Google "G" mark (from Google Identity) */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="none" fillRule="evenodd">
              <path
                d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8445c-.2082 1.125-.8427 2.0772-1.7959 2.7168v2.2582h2.9082c1.7018-1.5673 2.6827-3.8741 2.6827-6.616z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.4673-.8063 5.9555-2.191v-2.2582h-2.9082c-.7927.5336-1.8041.8482-3.0473.8482-2.3436 0-4.3282-1.5836-5.0373-3.7127H.9555v2.3318C2.4355 15.9782 5.482 18 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.9627 10.6864c-.18-.5336-.2827-1.1036-.2827-1.6864 0-.5827.1027-1.1527.2827-1.6864V4.9818H.9555A8.9973 8.9973 0 000 9c0 1.4464.3464 2.8109.9555 4.0182l3.0072-2.3318z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.5455c1.319 0 2.5063.4536 3.4373 1.3436l2.5782-2.5782C13.4636.9127 11.4263 0 9 0 5.482 0 2.4355 2.0218.9555 4.9818l3.0072 2.3318C4.6718 5.1291 6.6564 3.5455 9 3.5455z"
                fill="#EA4335"
              />
            </g>
          </svg>
        </span>
        <span className={styles.label}>Continue with Google</span>
      </a>
    </div>
  );
}
