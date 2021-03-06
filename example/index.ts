import KingWorld from 'kingworld'

import cookie from '../src/index'

const app = new KingWorld<{
    store: {}
    request: {
        cookie: {
            counter: string
        }
    }
}>()
    .use(cookie)
    .get('/', ({ cookie, setCookie, responseHeaders }) => {
        setCookie(
            'counter',
            cookie?.counter ? `${+cookie.counter + 1}`.toString() : `1`,
            {
                httpOnly: true
            }
        )

        return cookie.counter
    })
    .listen(8080)
