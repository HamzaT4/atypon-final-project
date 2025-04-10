package com.collabcode.server.controller;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class CodeController {

    @Value("${filesystem.service.url}")
    private String filesystemServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final FileMetadataRepository metadataRepository;

    public CodeController(FileMetadataRepository metadataRepository) {
        this.metadataRepository = metadataRepository;
    }

    @PostMapping("/code")
public ResponseEntity<?> saveCode(@RequestBody CodeRequest request) {
    try {
        String filename = request.getFilename();
        String extension = filename.substring(filename.lastIndexOf("."));

        Optional<FileMetadata> existing = metadataRepository.findAll()
            .stream()
            .filter(f -> f.getFilename().equals(filename))
            .findFirst();

        FileMetadata metadata;
        if (existing.isPresent()) {
            metadata = existing.get();
        } else {
            String newId = UUID.randomUUID().toString();
            metadata = new FileMetadata(
                newId,
                filename,
                "anonymous",
                LocalDateTime.now(),
                request.getFolderId() // Support FolderId
            );
            metadataRepository.save(metadata);
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String snapshotName = metadata.getId() + "_" + timestamp + extension;

        String url = filesystemServiceUrl + "/save";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        SnapshotRequest snapshotRequest = new SnapshotRequest(snapshotName, request.getCode());
        HttpEntity<SnapshotRequest> entity = new HttpEntity<>(snapshotRequest, headers);
        restTemplate.postForEntity(url, entity, Void.class);

        return ResponseEntity.ok().body(new SaveResponse(metadata.getId(), snapshotName));
    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error saving code: " + e.getMessage());
    }
}


static class CodeRequest {
    private String code;
    private String filename;
    private Long folderId; // New field

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public Long getFolderId() { return folderId; }
    public void setFolderId(Long folderId) { this.folderId = folderId; }
}


    static class SnapshotRequest {
        private String filename;
        private String content;

        public SnapshotRequest(String filename, String content) {
            this.filename = filename;
            this.content = content;
        }

        public String getFilename() { return filename; }
        public String getContent() { return content; }
    }

    static class SaveResponse {
        private String fileId;
        private String snapshotName;
    
        public SaveResponse(String fileId, String snapshotName) {
            this.fileId = fileId;
            this.snapshotName = snapshotName;
        }
    
        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
    
        public String getSnapshotName() { return snapshotName; }
        public void setSnapshotName(String snapshotName) { this.snapshotName = snapshotName; }
    }
    
}
