package com.collabcode.server.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

/**
 * ExecutorRouterService routes code execution requests to the proper executor based on language.
 * This refactoring applies a simple Strategy pattern to encapsulate the code execution logic.
 */
@Service
public class ExecutorRouterService {

    private interface ExecutorStrategy {
        String execute(String code) throws IOException, InterruptedException;
    }

    private static class HttpExecutorStrategy implements ExecutorStrategy {
        private final String executorUrl;

        public HttpExecutorStrategy(String executorUrl) {
            this.executorUrl = executorUrl;
        }

        @Override
        public String execute(String code) throws IOException, InterruptedException {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(executorUrl))
                    .POST(HttpRequest.BodyPublishers.ofString(code))
                    .header("Content-Type", "text/plain")
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return response.body();
        }
    }

    private final Map<String, ExecutorStrategy> strategyMap;

    public ExecutorRouterService() {
        strategyMap = Map.of(
            "java", new HttpExecutorStrategy("http://executor-java:8083/execute/java"),
            "python", new HttpExecutorStrategy("http://executor-python:8084/execute/python"),
            "c", new HttpExecutorStrategy("http://executor-c:8085/execute/c"),
            "cpp", new HttpExecutorStrategy("http://executor-cpp:8086/execute/cpp"),
            "js", new HttpExecutorStrategy("http://executor-js:8087/execute/js"),
            "ruby", new HttpExecutorStrategy("http://executor-ruby:8088/execute/ruby")
        );
    }

    /**
     * Forwards the given code to the appropriate executor based on language using the defined strategy.
     * @param language The programming language (e.g., "python", "java")
     * @param code The code to execute
     * @return The result of the code execution
     * @throws IOException
     * @throws InterruptedException
     */
    public String forwardToExecutor(String language, String code) throws IOException, InterruptedException {
        ExecutorStrategy strategy = strategyMap.get(language);
        if (strategy == null) {
            throw new RuntimeException("Unsupported language: " + language);
        }
        return strategy.execute(code);
    }
}
