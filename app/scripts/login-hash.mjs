// Prints the sign-in hash for a password (plan 038). Paste the output into LOGIN_PASSWORD_SHA256 in src/data/login.ts.
// Usage: npm --prefix app run login:hash   (asks for the password, so it never lands in shell history)

import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

/** Must match LOGIN_SALT in src/data/login.ts. */
const SALT = 'ctai-login-v1:';

// The prompt goes to stderr and what is typed doesn't echo, so stdout carries only the hash.
let muted = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!muted) process.stderr.write(chunk, encoding);
    done();
  },
});

const rl = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
rl.question('Password: ', (password) => {
  rl.close();
  process.stderr.write('\n');
  process.stdout.write(`${createHash('sha256').update(SALT + password).digest('hex')}\n`);
});
muted = true;
