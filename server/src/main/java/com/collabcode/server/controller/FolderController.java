package com.collabcode.server.controller;

import com.collabcode.server.entity.Folder;
import com.collabcode.server.service.FolderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    @Autowired
    private FolderService folderService;

    @PostMapping
    public ResponseEntity<Folder> createFolder(@RequestBody Folder folder) {
        return ResponseEntity.ok(folderService.create(folder));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Folder>> getFoldersByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(folderService.getAllByProject(projectId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Folder> getFolder(@PathVariable Long id) {
        return ResponseEntity.ok(folderService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Folder> updateFolder(@PathVariable Long id, @RequestBody Folder folder) {
        return ResponseEntity.ok(folderService.update(id, folder));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable Long id) {
        folderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
