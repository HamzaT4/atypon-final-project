package com.collabcode.server.controller;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.factory.FileMetadataFactory;
import com.collabcode.server.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@RestController
@RequestMapping("/api/code")
public class CodeController {

    @Value("${filesystem.service.url}")
    private String filesystemServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final FileMetadataRepository metadataRepository;

    public CodeController(FileMetadataRepository metadataRepository) {
        this.metadataRepository = metadataRepository;
    }

    @PostMapping
    public ResponseEntity<?> saveCode(@RequestBody CodeRequest request) {
        try {
            String filename = request.getFilename();
            String extension = filename.substring(filename.lastIndexOf("."));
            FileMetadata metadata;

            // Check if a file with the same filename exists in the specified folder.
            Optional<FileMetadata> existing = metadataRepository.findAll().stream()
                    .filter(f -> f.getFilename().equals(filename) && f.getFolderId().equals(request.getFolderId()))
                    .findFirst();

            if (existing.isPresent()) {
                // If it exists, use the existing file metadata.
                metadata = existing.get();
            } else {
                // Create new FileMetadata using the factory.
                metadata = FileMetadataFactory.createFileMetadata(filename, "anonymous", request.getFolderId());
                metadataRepository.save(metadata);
            }

            // Generate a snapshot name based on the current timestamp.
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String snapshotName = metadata.getId() + "_" + timestamp + extension;

            // Forward the code snapshot to the filesystem service.
            String url = filesystemServiceUrl + "/save";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            SnapshotRequest snapshotRequest = new SnapshotRequest(snapshotName, request.getCode());
            HttpEntity<SnapshotRequest> entity = new HttpEntity<>(snapshotRequest, headers);
            restTemplate.postForEntity(url, entity, Void.class);

            return ResponseEntity.ok(new SaveResponse(metadata.getId(), snapshotName));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving code: " + e.getMessage());
        }
    }

    // Request class for receiving file creation or code save requests.
    public static class CodeRequest {
        private String code;
        private String filename;
        private Long folderId;

        public String getCode() {
            return code;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public String getFilename() {
            return filename;
        }

        public void setFilename(String filename) {
            this.filename = filename;
        }

        public Long getFolderId() {
            return folderId;
        }

        public void setFolderId(Long folderId) {
            this.folderId = folderId;
        }
    }

    // Class to represent the request sent to the filesystem service.
    public static class SnapshotRequest {
        private String filename;
        private String content;

        public SnapshotRequest(String filename, String content) {
            this.filename = filename;
            this.content = content;
        }

        public String getFilename() {
            return filename;
        }

        public String getContent() {
            return content;
        }
    }

    // Response object returned after saving code or creating a new file.
    public static class SaveResponse {
        private String fileId;
        private String snapshotName;

        public SaveResponse(String fileId, String snapshotName) {
            this.fileId = fileId;
            this.snapshotName = snapshotName;
        }

        public String getFileId() {
            return fileId;
        }

        public void setFileId(String fileId) {
            this.fileId = fileId;
        }

        public String getSnapshotName() {
            return snapshotName;
        }

        public void setSnapshotName(String snapshotName) {
            this.snapshotName = snapshotName;
        }
    }
}
