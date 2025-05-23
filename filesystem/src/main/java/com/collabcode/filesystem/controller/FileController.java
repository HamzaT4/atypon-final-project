package com.collabcode.filesystem.controller;

import com.collabcode.filesystem.entity.Snapshot;
import com.collabcode.filesystem.repository.SnapshotRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Filesystem façade. All filenames are given *relative* to baseDir,
 * where baseDir is /data/projects inside the container.
 */
@RestController
public class FileController {

    @Value("${filesystem.base-dir}") 
    private String baseDir;

    private final SnapshotRepository snapshots;

    public FileController(SnapshotRepository snapshots) {
        this.snapshots = snapshots;
    }

    /**
     * GET /snapshots?fileId=<fileId>
     * Returns all snapshots whose filename column exactly equals fileId.
     */
    @GetMapping("/snapshots")
    public ResponseEntity<List<Snapshot>> getSnapshots(@RequestParam String fileId) {
        List<Snapshot> snaps = snapshots.findByFilename(fileId);
        return ResponseEntity.ok(snaps);
    }

    /* ───────────────────────────── SAVE ────────────────────────────── */

    @PostMapping("/save")
    public FileSystemResponse saveFile(@RequestBody SnapshotRequest req) {
        FileSystemResponse rsp = new FileSystemResponse();
        try {
            Objects.requireNonNull(req.fileId,   "fileId is null");
            Objects.requireNonNull(req.filename, "filename is null");
            Objects.requireNonNull(req.content,  "content is null");
            Objects.requireNonNull(req.author,   "author is null");
            Objects.requireNonNull(req.summary,  "summary is null");

            Path filePath = Paths.get(baseDir).resolve(req.filename);
            Files.createDirectories(filePath.getParent());
            Files.writeString(
                filePath, req.content,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING
            );

            snapshots.save(new Snapshot(
                req.fileId,
                req.author,
                LocalDateTime.now(),
                req.summary
            ));

            rsp.message = "saved -> " + req.filename;
        } catch (Exception ex) {
            ex.printStackTrace();
            rsp.message = "ERROR: " + ex.getMessage();
        }
        return rsp;
    }

    /* ───────────────────────────── READ ────────────────────────────── */

    @GetMapping("/read")
    public ResponseEntity<String> readFile(@RequestParam String filename) {
        try {
            Path p = Paths.get(baseDir).resolve(filename);
            if (!Files.exists(p))
                return ResponseEntity.status(404).body("File not found: " + filename);
            return ResponseEntity.ok(Files.readString(p));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Read error: " + e.getMessage());
        }
    }

    /* ────────────────────── LATEST SNAPSHOT ───────────────────────── */

    @GetMapping("/latest")
    public ResponseEntity<LatestResponse> latest(@RequestParam Long projectId,
                                                 @RequestParam String fileDir) {
        Path dir = Paths.get(baseDir, String.valueOf(projectId), fileDir);
        if (!Files.exists(dir)) return ResponseEntity.status(404).build();

        try (Stream<Path> stream = Files.list(dir)) {
            Path latest = stream
                .filter(Files::isRegularFile)
                .max(Comparator.comparing(p -> p.getFileName().toString()))
                .orElse(null);
            if (latest == null) return ResponseEntity.status(404).build();

            LatestResponse res = new LatestResponse();
            res.snapshotName = projectId + "/" + fileDir + "/" + latest.getFileName();
            res.content      = Files.readString(latest);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /* ─────────────────────────── project helpers ──────────────────── */

    @PostMapping("/project/{projectId}")
    public ResponseEntity<String> createProject(@PathVariable String projectId) {
        try {
            Files.createDirectories(Paths.get(baseDir, projectId));
            return ResponseEntity.ok("project created");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/project/{projectId}")
    public ResponseEntity<String> deleteProject(@PathVariable String projectId) {
        try {
            Path p = Paths.get(baseDir, projectId);
            if (Files.exists(p))
                Files.walk(p)
                     .sorted(Comparator.reverseOrder())
                     .forEach(f -> f.toFile().delete());
            return ResponseEntity.ok("project deleted");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/create-folder")
    public ResponseEntity<String> createFolder(@RequestParam Long projectId,
                                               @RequestParam String folderName) {
        try {
            Files.createDirectories(
                Paths.get(baseDir, String.valueOf(projectId), folderName)
            );
            return ResponseEntity.ok("folder created");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    /* ───────────────────────────── DTOs ───────────────────────────── */

    public static class SnapshotRequest {
        public String fileId;
        public String filename;
        public String content;
        public String author;
        public String summary;
    }

    public static class FileSystemResponse {
        public String message;
    }

    public static class LatestResponse {
        public String snapshotName;
        public String content;
    }
}
