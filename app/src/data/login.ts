/*
 * The one sign-in for the deployed demo (plan 038). A demo gate, not security:
 * the password is never stored in the repo, only its hash (`npm --prefix app run login:hash`).
 */

export const LOGIN_EMAIL = 'demo@catalystsolutions.sg';

/** Hashed in front of the password. The email is not part of the hash, so the address can change on its own. */
export const LOGIN_SALT = 'ctai-login-v1:';

/** SHA-256 of `LOGIN_SALT + password`, lowercase hex. Replacing it signs everybody out. */
export const LOGIN_PASSWORD_SHA256 = 'ab821c04df2ba4f56df62b70d8a51fab3e080446c0300adfc284bcc93a03f540';
