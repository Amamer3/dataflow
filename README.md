# DataHub Backend

A robust backend service for data purchasing and wallet management, built with Express.js, TypeScript, and Supabase. This project provides APIs for initiating data purchases, verifying transactions, and managing wallet top-ups through Paystack integration.

## Features

- **Data Purchasing**: Initiate and verify data purchases with secure transaction handling.
- **Wallet Management**: Top-up user wallets seamlessly.
- **Paystack Integration**: Secure payment processing for transactions.
- **Supabase Authentication**: Middleware for user authentication and authorization.
- **Type-Safe APIs**: Built with TypeScript and Zod for validation.
- **Database Migrations**: Supabase migrations for transactions, roles, and audit logs.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd data-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

4. Set up Supabase:
   - Ensure your Supabase project is configured.
   - Run the migrations in the `supabase/migrations/` directory.

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

The server will start on the port specified in your environment variables (default: 3000).

## API Endpoints

### Paystack Public Key
- `GET /api/paystack-public-key`: Retrieve the public key for Paystack integration.

### Buy Data
- `POST /api/buy-data/initiate`: Initiate a data purchase transaction.
- `POST /api/buy-data/verify`: Verify a completed data purchase transaction.

### Wallet
- `POST /api/wallet/topup`: Top-up a user's wallet.

All endpoints require proper authentication via Supabase auth middleware.

## Project Structure

```
data-backend/
├── package.json
├── tsconfig.json
├── server/
├── src/
│   ├── app.ts
│   ├── buy-data.functions.ts
│   ├── config.functions.ts
│   ├── api/
│   │   ├── index.ts
│   │   ├── paystack-public-key.ts
│   │   ├── buy-data/
│   │   │   ├── index.ts
│   │   │   ├── initiate.ts
│   │   │   └── verify.ts
│   │   └── wallet/
│   │       ├── index.ts
│   │       └── topup.ts
│   └── integrations/
│       └── supabase/
│           ├── auth-middleware.ts
│           ├── client.server.ts
│           ├── client.ts
│           └── types.ts
│   └── server/
│       ├── paystack.server.ts
│       ├── provider.server.ts
│       └── wallet.server.ts
└── supabase/
    ├── config.toml
    └── migrations/
        ├── 20260429143429_3ca02002-6254-4bf9-8571-52661531a408.sql
        ├── 20260429143442_fa1d5ee8-750c-46fa-8037-627abfd90d54.sql
        ├── 20260429143500_add_transactions_rls_policies.sql
        └── 20260429150000_add_admin_roles_and_audit.sql
```

## Technologies Used

- **Express.js**: Web framework for Node.js.
- **TypeScript**: Typed JavaScript for better development experience.
- **Supabase**: Backend-as-a-Service for database and authentication.
- **Paystack**: Payment gateway for transactions.
- **Zod**: Schema validation library.
- **JWT**: JSON Web Tokens for authentication.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/your-feature`.
5. Open a pull request.

## License

This project is private and proprietary.