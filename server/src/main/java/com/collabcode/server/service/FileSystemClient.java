package com.collabcode.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class FileSystemClient {

    @Value("${filesystem.service.url}")
    private String fsBaseUrl;

    public String getFileContent(String filename) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(fsBaseUrl + "/read?filename=" + filename))
            .GET()
            .build();
    
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    
        if (response.statusCode() != 200) {
            throw new RuntimeException("File system read failed: " + response.body());
        }
    
        return response.body();
    }

    public void createProjectFolder(Long projectId) {
        callSimplePost("/project/" + projectId);
    }
    
    public void deleteProjectFolder(Long projectId) {
        callSimpleDelete("/project/" + projectId);
    }
    
    private void callSimplePost(String path) {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(fsBaseUrl + path))
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();
    
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("Filesystem call failed: " + response.body());
            }
        } catch (Exception e) {
            throw new RuntimeException("Filesystem call failed: " + e.getMessage());
        }
    }

    public void createFolder(Long projectId, String folderName) {
        callSimplePost("/create-folder?projectId=" + projectId + "&folderName=" + folderName);
     }
     
    
    private void callSimpleDelete(String path) {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(fsBaseUrl + path))
                .DELETE()
                .build();
    
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("Filesystem call failed: " + response.body());
            }
        } catch (Exception e) {
            throw new RuntimeException("Filesystem call failed: " + e.getMessage());
        }
    }
    
    
}
