package com.collabcode.server.controller;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api")
public class CodeController {

    @Value("${filesystem.service.url}")
    private String filesystemServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/code")
    public ResponseEntity<?> saveCode(@RequestBody CodeRequest request) {
        // Forward the request to the File System Service
        String url = filesystemServiceUrl + "/save";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<CodeRequest> entity = new HttpEntity<>(request, headers);
        ResponseEntity<FileSystemResponse> response = restTemplate.postForEntity(url, entity, FileSystemResponse.class);

        if (response.getStatusCode() == HttpStatus.OK) {
            return ResponseEntity.ok().body(response.getBody());
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error saving code in file system");
        }
    }
}

// DTO classes can be placed in the same file or separate files
class CodeRequest {
    private String code;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}

class FileSystemResponse {
    private String message;

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}