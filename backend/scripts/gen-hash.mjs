import crypto from 'node:crypto'
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }
const KEYLEN = 64
const password = 'vicedean@123'
const salt = crypto.randomBytes(16)
crypto.scrypt(password, salt, KEYLEN, SCRYPT_PARAMS, (err, derived) => {
  if (err) { console.error(err); process.exit(1) }
  console.log(`scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`)
})
