package com.collabcode.server.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.repository.FileMetadataRepository;
import org.springframework.beans.factory.annotation.Autowired;


import java.util.Map;

@RestController
@RequestMapping("/api")
public class CodeController {

    @Value("${filesystem.service.url}")
    private String filesystemServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    private FileMetadataRepository fileMetadataRepository;


    @PostMapping("/code")
    public ResponseEntity<?> saveCode(@RequestBody CodeRequest request) {
        String url = filesystemServiceUrl + "/save";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<CodeRequest> entity = new HttpEntity<>(request, headers);
        ResponseEntity<FileSystemResponse> response = restTemplate.postForEntity(url, entity, FileSystemResponse.class);
    
        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            String message = response.getBody().getMessage();
            String fileId = extractFileId(message);
    
            if (fileId != null) {
                // ✅ Save metadata to the database
                FileMetadata meta = new FileMetadata();
                meta.setId(fileId); // this is your filename
                meta.setFilename(fileId);
                meta.setOwner("default"); // or get from session/token later
                meta.setCreatedAt(java.time.LocalDateTime.now());
    
                fileMetadataRepository.save(meta);
    
                return ResponseEntity.ok().body(Map.of("fileId", fileId));
            }
    
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to extract fileId.");
        }
    
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error saving code in file system");
    }

    private String extractFileId(String message) {
        // Expected: "Code saved as code_20250408_183142.cpp"
        if (message != null && message.contains("saved as")) {
            String[] parts = message.split(" ");
            return parts[parts.length - 1]; // return last part: "code_20250408_183142.cpp"
        }
        return null;
    }
}
class CodeRequest {
    private String filename;
    private String code;

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}

class FileSystemResponse {
    private String message;

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}