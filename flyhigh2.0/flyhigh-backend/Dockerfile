# ── Spring Boot Backend Dockerfile (multi-stage) ──
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn/ .mvn/

# Give execute permission to Maven Wrapper
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline --no-transfer-progress

COPY src/ src/

# Build application
RUN ./mvnw clean package -DskipTests --no-transfer-progress

# Runtime image
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /app/target/flyhigh-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java","--enable-preview","-jar","app.jar"]
