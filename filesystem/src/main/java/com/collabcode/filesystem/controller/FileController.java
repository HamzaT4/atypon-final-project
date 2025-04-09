package com.collabcode.filesystem.controller;

import com.collabcode.filesystem.entity.Snapshot;
import com.collabcode.filesystem.repository.SnapshotRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.Objects;

@RestController
public class FileController {

    @Value("${filesystem.base-dir}")
    private String baseDir;

    private final SnapshotRepository snapshotRepository;

    public FileController(SnapshotRepository snapshotRepository) {
        this.snapshotRepository = snapshotRepository;
    }

    @PostMapping("/save")
    public FileSystemResponse saveFile(@RequestBody SnapshotRequest request) {
        FileSystemResponse response = new FileSystemResponse();
        try {
            // Validate input
            Objects.requireNonNull(request.getFilename(), "Filename must not be null");
            Objects.requireNonNull(request.getContent(), "Code content must not be null");

            // Ensure base directory exists
            Path dirPath = Paths.get(baseDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            // Save file using exact filename provided
            Path filePath = dirPath.resolve(request.getFilename());
            Files.writeString(filePath, request.getContent(), StandardOpenOption.CREATE);

            snapshotRepository.save(new Snapshot(request.getFilename(), "anonymous", LocalDateTime.now(), "Snapshot saved"));

            response.setMessage("Saved successfully: " + request.getFilename());
        } catch (Exception e) {
            e.printStackTrace();
            response.setMessage("Error saving code: " + e.getMessage());
        }
        return response;
    }
    @GetMapping("/read")
    public ResponseEntity<String> readFile(@RequestParam String filename) {
        try {
            // Look inside /data/projects instead of just /data
            Path filePath = Paths.get(baseDir, filename);
            if (!Files.exists(filePath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not found: " + filename);
            }
            String content = Files.readString(filePath);
            return ResponseEntity.ok(content);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("Error reading file: " + e.getMessage());
        }
    }
    
    

    static class SnapshotRequest {
        private String filename;
        private String content;

        public String getFilename() { return filename; }
        public void setFilename(String filename) { this.filename = filename; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }

    static class FileSystemResponse {
        private String message;

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
