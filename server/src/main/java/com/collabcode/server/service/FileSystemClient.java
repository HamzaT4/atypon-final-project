package com.collabcode.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/** Wraps HTTP calls to the Filesystem micro‑service. */
@Service
public class FileSystemClient {

    @Value("${filesystem.service.url}")
    private String fsBaseUrl;

    /* ---------- public helpers ---------- */

    public String getFileContent(String relativePath) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(fsBaseUrl + "/read?filename=" + relativePath))
                .GET().build();
        HttpResponse<String> resp = HttpClient.newHttpClient()
                .send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != 200)
            throw new RuntimeException("FS read failed: " + resp.body());
        return resp.body();
    }

    public void createProjectFolder(Long projectId) {
        postNoBody("/project/" + projectId);
    }

    public void deleteProjectFolder(Long projectId) {
        deleteNoBody("/project/" + projectId);
    }

    /** create nested folder(s) under given project. */
    public void createFolder(Long projectId, String folderPath) {
        postNoBody("/create-folder?projectId=" + projectId + "&folderName=" + folderPath);
    }

    /* ---------- internals ---------- */

    private void postNoBody(String path) { send(HttpRequest.newBuilder()
            .uri(URI.create(fsBaseUrl + path)).POST(HttpRequest.BodyPublishers.noBody()).build()); }

    private void deleteNoBody(String path) { send(HttpRequest.newBuilder()
            .uri(URI.create(fsBaseUrl + path)).DELETE().build()); }

    private void send(HttpRequest req) {
        try {
            HttpResponse<String> resp = HttpClient.newHttpClient()
                    .send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200)
                throw new RuntimeException("FS call failed: " + resp.body());
        } catch (Exception e) {
            throw new RuntimeException("FS call failed: " + e.getMessage());
        }
    }
}
