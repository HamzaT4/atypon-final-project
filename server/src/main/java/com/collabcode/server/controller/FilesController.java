package com.collabcode.server.controller;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.factory.FileMetadataFactory;
import com.collabcode.server.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/files")
public class FilesController {

    @Autowired
    private FileMetadataRepository fileMetadataRepository;

    /**
     * GET /api/files?folderId={id}
     * Returns a list of files for the given folder.
     */
    @GetMapping
    public ResponseEntity<List<FileMetadata>> getFilesByFolder(@RequestParam Long folderId) {
        List<FileMetadata> files = fileMetadataRepository.findAll().stream()
                .filter(file -> file.getFolderId() != null && file.getFolderId().equals(folderId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(files);
    }

    /**
     * POST /api/files/create
     * Creates a new file. This endpoint replicates the file creation logic of CodeController,
     * so you don't have to modify that controller.
     */
    @PostMapping("/create")
    public ResponseEntity<?> createFile(@RequestBody FileCreationRequest request) {
        try {
            String filename = request.getFilename();
            String extension = filename.substring(filename.lastIndexOf("."));
            FileMetadata metadata;

            // Use null-safe comparison for folderId
            Optional<FileMetadata> existing = fileMetadataRepository.findAll().stream()
                    .filter(f -> f.getFilename().equals(filename)
                            && Objects.equals(f.getFolderId(), request.getFolderId()))
                    .findFirst();

            if (existing.isPresent()) {
                metadata = existing.get();
            } else {
                // Create a new FileMetadata using your factory.
                metadata = FileMetadataFactory.createFileMetadata(filename, "anonymous", request.getFolderId());
                fileMetadataRepository.save(metadata);
            }

            // Generate a snapshot name based on the current timestamp.
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String snapshotName = metadata.getId() + "_" + timestamp + extension;

            // Here you might call your filesystem service to actually store the file content.
            // For example:
            // restTemplate.postForEntity(filesystemServiceUrl + "/save", snapshotRequest, Void.class);
            // We'll assume that call is not needed for file creation.

            return ResponseEntity.ok(new FileCreationResponse(metadata.getId(), snapshotName));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error creating file: " + e.getMessage());
        }
    }
    
    // DTO class for file creation request.
    public static class FileCreationRequest {
        private String filename;
        private Long folderId;
        private String code; // Can be empty

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
        public String getCode() {
            return code;
        }
        public void setCode(String code) {
            this.code = code;
        }
    }
    
    // DTO class for file creation response.
    public static class FileCreationResponse {
        private String fileId;
        private String snapshotName;

        public FileCreationResponse(String fileId, String snapshotName) {
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
