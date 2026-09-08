# Stage 1: Build application using Maven & Java 17
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Build production jar
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Lean runtime container
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy artifact from build stage
COPY --from=build /app/target/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
