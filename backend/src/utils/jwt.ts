import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

export const signToken = (payload: object, expiresIn = '8h') => {
	const options = { expiresIn } as any
	return jwt.sign(payload, JWT_SECRET as Secret, options)
}

export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET as Secret)
