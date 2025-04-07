package com.collabcode.filesystem.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import com.collabcode.filesystem.entity.Snapshot;
import com.collabcode.filesystem.repository.SnapshotRepository;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
public class FileController {

    @Value("${filesystem.base-dir}")
    private String baseDir;

   
    @Autowired
    private SnapshotRepository snapshotRepository;

    @PostMapping("/save")
    public FileSystemResponse saveFile(@RequestBody CodeRequest request) {
        FileSystemResponse response = new FileSystemResponse();
        try {
            // Ensure the base directory exists
            Path dirPath = Paths.get(baseDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }
            // Create a unique filename using a timestamp
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "code_" + timestamp + ".txt";
            Path filePath = dirPath.resolve(filename);
            // Write the code to file
            Files.writeString(filePath, request.getCode(), StandardOpenOption.CREATE);
            snapshotRepository.save(new Snapshot(filename, "anonymous", LocalDateTime.now(), "Initial snapshot"));
            response.setMessage("Code saved as " + filename);
        } catch (IOException e) {
            e.printStackTrace();
            response.setMessage("Error saving code: " + e.getMessage());
        }
        return response;
    }
}

// DTO classes for the file system service
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