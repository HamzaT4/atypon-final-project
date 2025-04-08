package com.collabcode.server.controller;

import com.collabcode.server.service.CodeExecutionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/execute")
public class CodeExecutionController {

    @Autowired
    private CodeExecutionService codeExecutionService;

    @PostMapping
    public ResponseEntity<String> executeCode(@RequestParam String fileId) {
        try {
            String output = codeExecutionService.executeFile(fileId);
            return ResponseEntity.ok(output);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Execution failed: " + e.getMessage());
        }
    }
}
