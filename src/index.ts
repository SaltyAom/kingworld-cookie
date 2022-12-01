import type { Handler } from 'kingworld'

import type KingWorld from 'kingworld'
import Cookie, { serialize, parse, type CookieSerializeOptions } from 'cookie'
import { sign } from 'cookie-signature'

export interface SetCookieOptions extends CookieSerializeOptions {
    value: string
    // Should cookie be signed or not
    signed?: boolean
}

export interface CookieOptions extends Omit<SetCookieOptions, 'value'> {
    /**
     * Secret key for signing cookie
     *
     * If array is passed, will use Key Rotation.
     *
     * Key rotation is when an encryption key is retired
     * and replaced by generating a new cryptographic key.
     */
    secret?: string | string[]
}

// ? Bun doesn't support `crypto.timingSafeEqual` yet, using string equality instead
// Temporary fix until native support
const unsign = (input: string, secret: string | null) => {
    if (null === secret) throw new TypeError('Secret key must be provided')

    const value = input.slice(0, input.lastIndexOf('.'))

    return input === sign(value, secret) ? value : false
}

export const cookie =
    ({ secret: secretKey, ...options }: CookieOptions = {}) =>
    (app: KingWorld) => {
        const secret = !secretKey
            ? undefined
            : typeof secretKey === 'string'
            ? secretKey
            : secretKey[0]

        const isStringKey = typeof secret === 'string'

        return app.inject((context) => {
            let store: Record<string, string> = {}
            let lazy = true

            const getStore = () => {
                lazy = false

                try {
                    const headerCookie = context.request.headers.get('cookie')

                    store = headerCookie ? parse(headerCookie) : {}
                } catch (error) {
                    store = {}
                }

                return store
            }

            return {
                // Always accept `string`
                unsignCookie(value: string | SetCookieOptions) {
                    if (typeof value === 'object')
                        throw new Error('unsignCookie expected to be string')

                    if (!secret) throw new Error('Secret key must be provided')

                    let unsigned: false | string = isStringKey
                        ? unsign(value, secret)
                        : false

                    if (isStringKey === false)
                        for (let i = 0; i < secret.length; i++) {
                            const temp = unsign(value, secret[i])

                            if (temp) {
                                unsigned = temp
                                break
                            }
                        }

                    return {
                        valid: unsigned !== false,
                        value: unsigned || undefined
                    }
                },
                cookie: new Proxy<Record<string, string | SetCookieOptions>>(
                    {},
                    {
                        get(_, key: string) {
                            if (lazy) {
                                const store = getStore()

                                if (key in store) return store[key]
                                return
                            }

                            if (key in store) return store[key]

                            return
                        },
                        set(_, key: string, value: string | SetCookieOptions) {
                            if (lazy) getStore()

                            if (typeof value === 'string') {
                                store[key] = value

                                context.set.headers['Set-Cookie'] = serialize(
                                    key,
                                    value,
                                    {
                                        path: '/',
                                        ...options
                                    }
                                )
                            } else {
                                if (value.signed) {
                                    if (!secret)
                                        throw new Error(
                                            'Secret key must be provided'
                                        )

                                    value.value = sign(value.value, secret)
                                }

                                store[key] = value.value

                                context.set.headers['Set-Cookie'] = serialize(
                                    key,
                                    value.value,
                                    {
                                        path: '/',
                                        ...options,
                                        ...value
                                    }
                                )
                            }

                            return true
                        },
                        deleteProperty(_, prop: string) {
                            if (lazy) getStore()

                            if (prop in store) {
                                delete store[prop]

                                context.set.headers['Set-Cookie'] = serialize(
                                    prop,
                                    '',
                                    {
                                        expires: new Date(
                                            'Thu, Jan 01 1970 00:00:00 UTC'
                                        )
                                    }
                                )
                            }

                            return true
                        }
                    }
                )
            }
        })
    }

// return {
//     get cookie() {
//         return getCookie()
//     },
//     set cookie(newCookie: Record<string, string>) {
//         _cookie = newCookie
//     },
//     setCookie(name, value, { signed = false, ...options } = {}) {
//         if (signed) {
//             if (!key)
//                 throw new Error(
//                     'No secret is provided to cookie plugin'
//                 )

//             value = sign(value, key)
//         }

//         context.set.headers['Set-Cookie'] = serialize(name, value, {
//             path: '/',
//             ...options
//         })

//         if (!_cookie) getCookie()
//         _cookie[name] = value
//     },
//     removeCookie(name: string) {
//         if (!getCookie()[name]) return

//         context.set.headers['Set-Cookie'] = serialize(name, '', {
//             expires: new Date('Thu, Jan 01 1970 00:00:00 UTC')
//         })

//         delete _cookie[name]
//     },
//     unsignCookie(value: string) {
//         if (!key)
//             throw new Error(
//                 'No secret is provided to cookie plugin'
//             )

//         let unsigned: false | string = isStringKey
//             ? unsign(value, key)
//             : false
//         if (isStringKey === false) {
//             for (let i = 0; i < key.length; i++) {
//                 const temp = unsign(value, key[i])

//                 if (temp) {
//                     unsigned = temp
//                     break
//                 }
//             }
//         }

//         return {
//             valid: unsigned !== false,
//             value: unsigned || undefined
//         }
//     }
// } as CookieRequest

export default cookie
