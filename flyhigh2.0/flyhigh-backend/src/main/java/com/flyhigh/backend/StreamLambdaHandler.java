package com.flyhigh.backend;

import com.amazonaws.serverless.exceptions.ContainerInitializationException;
import com.amazonaws.serverless.proxy.model.AwsProxyRequest;
import com.amazonaws.serverless.proxy.model.AwsProxyResponse;
import com.amazonaws.serverless.proxy.spring.SpringBootLambdaContainerHandler;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * AWS Lambda handler for Spring Boot 3.x.
 * Uses the aws-serverless-java-container library to proxy API Gateway
 * requests to the Spring Boot application context.
 *
 * The Spring context is loaded once and reused across invocations.
 * With SnapStart enabled, the initialized context is snapshotted and
 * restored on subsequent cold starts, eliminating JVM startup latency.
 */
public class StreamLambdaHandler implements RequestStreamHandler {

    private static final SpringBootLambdaContainerHandler<AwsProxyRequest, AwsProxyResponse> handler;

    static {
        try {
            handler = SpringBootLambdaContainerHandler.getAwsProxyHandler(
                FlyhighBackendApplication.class
            );
        } catch (ContainerInitializationException e) {
            throw new RuntimeException("Failed to initialize Spring Boot Lambda handler", e);
        }
    }

    @Override
    public void handleRequest(InputStream input, OutputStream output, Context context) throws IOException {
        handler.proxyStream(input, output, context);
    }
}
