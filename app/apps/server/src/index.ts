import "dotenv/config";
// import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'


const app = new OpenAPIHono();

app.use(logger());
// app.use(
// 	"/*",
// 	cors({
// 		origin: process.env.CORS_ORIGIN || "",
// 		allowMethods: ["GET", "POST", "OPTIONS"],
// 	}),
// );

app.get("/", (c) => {
	return c.text("OK");
});

app.get('/scalar', Scalar({ url: '/doc' }))


app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'My API',
  },
})

export default app;
