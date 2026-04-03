import { Elysia } from 'elysia'

const prettyJson = new Elysia()
	.mapResponse(({ response }) => {
		if (
			response &&
			typeof response === 'object' &&
			!(response instanceof Response)
		)
			return new Response(JSON.stringify(response, null, 4), {
				headers: { 'content-type': 'application/json; charset=utf-8' }
			})
	})
	.as('scoped')

new Elysia()
	.use(prettyJson)
	.get('/', () => ({
		hello: 'world'
	}))
	.listen(3000)
