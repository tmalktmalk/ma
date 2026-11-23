# MySQL-backed web server

A small Express web server with a MySQL-backed CRUD API for items.

## Run with Docker Compose

1. Optionally set `DB_PASSWORD` and `DB_ROOT_PASSWORD` in your shell; the defaults are for local development only.
2. Start the server and database:

   ```sh
   docker compose up --build
   ```

The API is available at `http://localhost:3000`. MySQL data is persisted in the `mysql_data` volume.

## Run locally

1. Install Node.js 20+ and MySQL 8+.
2. Copy `.env.example` to `.env` and set your database credentials.
3. Create the configured database, then run:

   ```sh
   npm install
   npm start
   ```

The server creates the `items` table on startup.

## Endpoints

- `GET /` — server status
- `GET /health` — server and database health
- `GET /api/items` — list items
- `GET /api/items/:id` — get an item
- `POST /api/items` — create an item with JSON body `{ "name": "Example" }`
- `PUT /api/items/:id` — update an item with JSON body `{ "name": "Updated" }`
- `DELETE /api/items/:id` — delete an item
