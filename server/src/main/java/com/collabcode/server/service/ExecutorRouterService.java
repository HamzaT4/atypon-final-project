package com.collabcode.server.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Service
public class ExecutorRouterService {

    private final Map<String, String> routes = Map.of(
        "java", "http://executor-java:8083/execute/java",
        "python", "http://executor-python:8084/execute/python",
        "c", "http://executor-c:8085/execute/c",
        "cpp", "http://executor-cpp:8086/execute/cpp",
        "js", "http://executor-js:8087/execute/js",
        "ruby", "http://executor-ruby:8088/execute/ruby"
    );

    public String forwardToExecutor(String language, String code) throws IOException, InterruptedException {
        String url = routes.get(language);
        if (url == null) throw new RuntimeException("Unsupported language: " + language);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .POST(HttpRequest.BodyPublishers.ofString(code))
            .header("Content-Type", "text/plain")
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }
}
