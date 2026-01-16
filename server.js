const jsonServer = require("json-server");
const rateLimit = require("express-rate-limit");

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

const PORT = process.env.PORT || 3000;

// Middlewares padrão
server.use(middlewares);
server.use(jsonServer.bodyParser);

/**
 * 🔒 Rate limit para métodos de escrita
 * 5 operações por minuto por IP
 */
const writeLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minuto
	max: 5,
	message: {
		error: "Limite de operações atingido. Tente novamente em 1 minuto.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

/**
 * 🧠 Regra de negócio:
 * limita o TOTAL de registros por recurso
 */
const MAX_PRODUCTS = 30;

// Aplica proteções somente para escrita
server.use((req, res, next) => {
	const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

	if (!isWriteMethod) return next();

	// 1️⃣ Rate limit
	writeLimiter(req, res, () => {
		// 2️⃣ Limite total de produtos (apenas para POST /products)
		if (req.method === "POST" && req.path === "/products_catalog") {
			const products = router.db.get("products_catalog").value();

			if (products.length >= MAX_PRODUCTS) {
				return res.status(403).json({
					error: "Limite máximo de produtos atingido",
				});
			}
		}

		next();
	});
});

// Health check
server.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

// Rotas do json-server
server.use(router);

server.listen(PORT, () => {
	console.log(`JSON Server is running on port ${PORT}`);
});
