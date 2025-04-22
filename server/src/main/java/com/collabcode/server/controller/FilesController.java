package com.collabcode.server.controller;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.factory.FileMetadataFactory;
import com.collabcode.server.repository.FileMetadataRepository;
import com.collabcode.server.repository.FolderRepository;
import com.collabcode.server.service.FileSystemClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/files")
public class FilesController {

    @Autowired private FileMetadataRepository fileRepo;
    @Autowired private FolderRepository       folderRepo;
    @Autowired private FileSystemClient       fsClient;

    /* ---------- list ---------- */

    @GetMapping
    public ResponseEntity<List<FileMetadata>> getByFolder(@RequestParam Long folderId) {
        List<FileMetadata> list = fileRepo.findAll().stream()
                .filter(f -> Objects.equals(f.getFolderId(), folderId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /* ---------- create (metadata + file‑dir) ---------- */

    @PostMapping("/create")
    public ResponseEntity<?> createFile(@RequestBody FileCreationRequest req) {
        try {
            String filename = req.getFilename();            // e.g. hamza1.rb
            String ext      = filename.substring(filename.lastIndexOf("."));

            /* metadata (reuse if same name inside same folder) */
            FileMetadata meta = fileRepo.findAll().stream()
                    .filter(f -> f.getFilename().equals(filename)
                            && Objects.equals(f.getFolderId(), req.getFolderId()))
                    .findFirst()
                    .orElseGet(() -> fileRepo.save(
                            FileMetadataFactory.createFileMetadata(
                                    filename, "anonymous", req.getFolderId())));

            /* derive project & build file‑directory name */
            Long projectId = folderRepo.findById(req.getFolderId())
                    .orElseThrow(() -> new RuntimeException("Folder not found"))
                    .getProjectId();
            String fileDir = meta.getId() + "-" + filename.replace(".", "-");   // fileId-hamza1-rb
            fsClient.createFolder(projectId, fileDir);

            /* first snapshot name (optional payload) */
            String ts   = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String snap = meta.getId() + "_" + ts + ext;

            return ResponseEntity.ok(new FileCreationResponse(meta.getId(), snap));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
    /* ---------- read (metadata + file‑dir) ---------- */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFile(@PathVariable String id) {
        try {
            fileRepo.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("Failed to delete file: " + e.getMessage());
        }
    }

    /* ---------- DTO ---------- */

    public static class FileCreationRequest {
        private String filename;
        private Long   folderId;
        private String code;
        // getters / setters
        public String getFilename(){return filename;}
        public void setFilename(String f){filename=f;}
        public Long getFolderId(){return folderId;}
        public void setFolderId(Long id){folderId=id;}
        public String getCode(){return code;}
        public void setCode(String c){code=c;}
    }
    public static class FileCreationResponse {
        private String fileId, snapshotName;
        public FileCreationResponse(String f,String s){fileId=f;snapshotName=s;}
        public String getFileId(){return fileId;}
        public void setFileId(String s){fileId=s;}
        public String getSnapshotName(){return snapshotName;}
        public void setSnapshotName(String s){snapshotName=s;}
    }
}
