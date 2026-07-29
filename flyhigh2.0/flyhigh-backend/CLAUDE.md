# CLAUDE.md — FlyHigh Backend

## Build & Run

```bash
# Compile (with preview features for Structured Concurrency)
mvnw compile

# Run (dev profile, port 8081)
mvnw spring-boot:run

# Run tests
mvnw test

# Clean build
mvnw clean compile
```

## AWS Deployment

This service is deployed as an AWS Lambda function via the CDK stack in `../infra/`.
- **SnapStart**: Enabled in the CDK (`SnapStartConf.ON_PUBLISHED_VERSIONS`) — `StreamLambdaHandler` is designed for this.
- **Secrets**: Read from AWS Secrets Manager at `flyhigh/{env}/credentials` (populated manually before first deploy).
- **Deployment source**: `../infra/lib/app-stack.ts` — Lambda function, API Gateway, IAM roles.
- **Build artifact**: `target/flyhigh-backend-0.0.1-SNAPSHOT.jar` is deployed as a Lambda ZIP (supports SnapStart).

## Architecture

```
com.flyhigh.backend
├── config/          — MongoConfig, SecurityConfig, AdminInitializer, ResilienceConfig, SecretsValidationRunner
├── controller/      — 11 REST controllers (Auth, GoogleAuth, User, ExpertProfile, ExpertSearch, ExpertEarning, VideoCall, Payment, RazorpayWebhook, Admin, Notification)
├── dto/             — 27 Request/Response DTOs (DropdownCatalogResponse includes commissionPercent)
├── exception/       — GlobalExceptionHandler (static messages, no leaks)
├── model/           — 15 MongoDB @Document entities (incl. Notification, AuditEntry)
├── repository/      — 13 Spring Data MongoRepository interfaces
├── security/        — JWT filter, rate limiter (Bucket4j), security headers (HSTS, CSP), entry point
├── seed/            — DevDataSeeder, SeedRunner, DevDataCleaner
└── service/         — 19 services (Auth, User, Pricing, Payment, ExpertSearch, ExpertEarning, VideoCall, Audit, etc.)
```

- **Java 21** + **Spring Boot 3.2.5** + **MongoDB Atlas** (SRV connection)
- Synchronous MongoDB driver (not reactive)
- Stateless JWT auth (httpOnly cookies with tokenVersion for invalidation)
- BCrypt strength 12
- OTP via Gmail SMTP (BCrypt-hashed at rest)
- All endpoints require authentication (8 previously unauthenticated endpoints now secured)
- Atomic rating updates via `findAndModify` (no read-modify-write race condition)

## Key Patterns

- All repositories extend `MongoRepository<T, String>` — no custom `@Query` annotations
- `ExpertSearchService` is the only service using `MongoTemplate` directly (dynamic Criteria queries)
- `MongoTemplate` is the entry point for all bulk/custom operations
- `DevDataSeeder` uses single `save()` calls — the new `BulkOperationService` fixes this
- Lombok `@Data` on Interaction, SessionPayment, Payout models only

## MongoDB Collections

`users`, `expert_profiles`, `call_requests`, `interactions`, `session_payments`, `expert_earnings`, `payouts`, `pending_users`, `password_reset_otps`, `reviews`, `dropdown_definitions`, `audit_entries`, `notifications` (13 collections)

**New indexes added:** `Interaction.razorpayOrderId` (@Indexed) for O(log n) webhook lookup.

## Connection Pool (MongoConfig)

| Setting | Default |
|---------|---------|
| min/max pool | 5 / 50 |
| max wait | 2s |
| max idle/life | 10min / 30min |
| connect/read timeout | 5s / 10s |
| server selection | 5s |

Configurable via `mongo.pool.*` and `mongo.timeout.*` in application.properties.

## Virtual Threads

`ThreadingConfig` provides a `virtualThreadExecutor` bean — `Executors.newThreadPerTaskExecutor()` with named `Thread.ofVirtual()` factory. Used by `BulkOperationService` for parallel collection inserts.

## Gotchas

1. **BulkOperationException from Spring Data only takes MongoBulkWriteException as cause** — use `BulkWriteFailedException` (custom) for general failures. See `BulkOperationService.java`.

2. **Structured Concurrency requires `--enable-preview`** — enabled in both `maven-compiler-plugin` and `spring-boot-maven-plugin` in pom.xml. Must be present at runtime too.

3. **Interaction model uses Lombok @Data** — if getters/setters go missing during compilation, check Lombok annotation processor config in pom.xml.

4. **DevDataSeeder is idempotent** — checks `isSeedData=true` before creating. Safe to run multiple times.

5. **MongoDB URI contains credentials** — use `MONGODB_URI` env var in production, never commit real credentials.

6. **RateLimiterFilter uses ConcurrentHashMap** — rate limits are in-memory only, reset on restart.

7. **Auto-index creation is ON** (`spring.data.mongodb.auto-index-creation=true`) — Spring Data creates `@Indexed` annotations at startup. Can slow first deploy.

8. **GlobalExceptionHandler returns static messages** — never exposes `ex.getMessage()` to clients. All internal details are logged server-side only.

9. **All endpoints require authentication** — 8 previously unauthenticated endpoints in VideoCallController and PaymentController now have auth guards.

10. **Rating average is atomic** — computed from CallRequest reviews (source of truth) via `findAndModify`. No read-modify-write race condition.

11. **Expert search uses DB-level pagination** — `skip/limit` applied at MongoDB query level. Post-filters (text search, availability) run only on the paginated page.

12. **Earnings queries are batch-optimized** — interactions and users are loaded in 2 queries regardless of page size (was N+1).

## Verification Checklist

After any change:
- [ ] `mvnw compile` passes
- [ ] No new warnings beyond pre-existing RateLimiterFilter deprecation
- [ ] New services have `@Service`, new configs have `@Configuration`
- [ ] Thread safety: stateless services only, no shared mutable state
- [ ] MongoDB operations use `MongoTemplate` or repository methods (not raw driver)
