import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export const hashPassword = (pw: string) => Promise.resolve(bcrypt.hashSync(pw, SALT_ROUNDS))
export const comparePassword = (pw: string, hash: string) => Promise.resolve(bcrypt.compareSync(pw, hash))
