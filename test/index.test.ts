import KingWorld from 'kingworld'

import cookie from '../src'

import { describe, expect, it } from 'bun:test'

const req = (path: string) => new Request(path)

describe('Cookie', () => {
    it('should set cookie', async () => {
        const app = new KingWorld().use(cookie()).get('/', ({ cookie }) => {
            cookie.user = 'saltyaom'

            return cookie.user
        })

        const res = await app.handle(req('/'))
        expect(res.headers.get('set-cookie')).toBe('user=saltyaom; Path=/')
    })

    it('should remove cookie', async () => {
        const app = new KingWorld().use(cookie()).get('/', ({ cookie }) => {
            delete cookie.user

            return 'unset'
        })

        const res = await app.handle(
            new Request('/', {
                headers: {
                    cookie: 'user=saltyaom'
                }
            })
        )
        expect(res.headers.get('set-cookie')).toBe(
            'user=; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        )
    })

    it('skip cookie removal if cookie is absent', async () => {
        const app = new KingWorld().use(cookie()).get('/', ({ cookie }) => {
            delete cookie.user

            return 'unset'
        })

        const res = await app.handle(req('/'))
        expect(res.headers.get('set-cookie')).toBe(null)
    })
})
