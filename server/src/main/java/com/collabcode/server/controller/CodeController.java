package com.collabcode.server.controller;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.entity.Snapshot;
import com.collabcode.server.factory.FileMetadataFactory;
import com.collabcode.server.repository.FileMetadataRepository;
import com.collabcode.server.repository.FolderRepository;
import com.collabcode.server.service.FileSystemClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 *  –  POST /api/code         → save snapshot (with de‑duplication)
 *  –  GET  /api/code/latest  → newest snapshot + content for a file
 *  –  GET  /api/code/snapshots → list all snapshots for a file
 */
@RestController
@RequestMapping("/api/code")
public class CodeController {

    @Value("${filesystem.service.url}")
    private String fsUrl;

    private final RestTemplate rest = new RestTemplate();
    private final FileMetadataRepository metaRepo;
    private final FolderRepository folderRepo;
    private final FileSystemClient fsClient;

    public CodeController(FileMetadataRepository metaRepo,
                          FolderRepository folderRepo,
                          FileSystemClient fsClient) {
        this.metaRepo   = metaRepo;
        this.folderRepo = folderRepo;
        this.fsClient   = fsClient;
    }

    /* ───────────────────────── SNAPSHOTS LIST ─────────────────────── */

    @GetMapping("/snapshots")
    public ResponseEntity<SnapshotInfo[]> snapshots(@RequestParam String fileId) {
        String url = fsUrl + "/snapshots?fileId=" + fileId;
        ResponseEntity<Snapshot[]> fsResp = rest.getForEntity(url, Snapshot[].class);

        if (!fsResp.getStatusCode().is2xxSuccessful() || fsResp.getBody() == null) {
            return ResponseEntity.status(fsResp.getStatusCode()).build();
        }

        SnapshotInfo[] info = java.util.Arrays.stream(fsResp.getBody())
            .map(s -> new SnapshotInfo(
                s.getId(),
                s.getFilename(),
                s.getAuthor(),
                s.getSummary(),
                s.getTimestamp().toString()
            ))
            .toArray(SnapshotInfo[]::new);

        return ResponseEntity.ok(info);
    }

    /* ───────────────────────────── SAVE ───────────────────────────── */

    @PostMapping
    public ResponseEntity<SaveResponse> save(@RequestBody CodeRequest req,
                                             OAuth2AuthenticationToken auth) {
        try {
            // locate or create FileMetadata
            FileMetadata meta = metaRepo.findAll().stream()
                .filter(f -> f.getFilename().equals(req.getFilename())
                          && f.getFolderId().equals(req.getFolderId()))
                .findFirst()
                .orElseGet(() -> metaRepo.save(
                    FileMetadataFactory.createFileMetadata(
                        req.getFilename(), "anonymous", req.getFolderId()
                    )));

            Long projectId = folderRepo.findById(req.getFolderId())
                .orElseThrow(() -> new RuntimeException("Folder not found"))
                .getProjectId();
            String fileDir = meta.getId() + "-" + req.getFilename().replace('.', '-');

            // ensure folder exists on FS
            fsClient.createFolder(projectId, fileDir);

            // ─── deduplication: if there's a latest snapshot and content unchanged, skip
            boolean identical = false;
            try {
                String latestUrl = fsUrl
                    + "/latest?projectId=" + projectId
                    + "&fileDir=" + fileDir;
                ResponseEntity<LatestResponse> latestRsp =
                    rest.getForEntity(latestUrl, LatestResponse.class);

                if (latestRsp.getStatusCode() == HttpStatus.OK
                    && latestRsp.getBody() != null
                    && req.getCode().equals(latestRsp.getBody().getContent())) {
                    identical = true;
                    return ResponseEntity.ok(
                        new SaveResponse(meta.getId(), latestRsp.getBody().getSnapshotName())
                    );
                }
            } catch (HttpClientErrorException.NotFound nf) {
                // 404 means no snapshots yet – treat as “not identical”
            }

            // ─── build and save new snapshot
            String ts   = LocalDateTime.now()
                               .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String ext  = req.getFilename().substring(req.getFilename().lastIndexOf('.'));
            String snap = meta.getId() + "_" + ts + ext;
            String rel  = projectId + "/" + fileDir + "/" + snap;

            String author = "anonymous";
            if (auth != null && auth.getPrincipal() != null) {
                Object login = auth.getPrincipal().getAttribute("login");
                if (login != null) author = login.toString();
            }
            String summary = req.getSummary() != null ? req.getSummary() : "snapshot";

            SnapshotRequest body = new SnapshotRequest(
                meta.getId(), rel, req.getCode(), author, summary
            );
            HttpHeaders hdr = new HttpHeaders();
            hdr.setContentType(MediaType.APPLICATION_JSON);
            rest.postForEntity(fsUrl + "/save", new HttpEntity<>(body, hdr), Void.class);

            return ResponseEntity.ok(new SaveResponse(meta.getId(), rel));

        } catch (Exception e) {
            return ResponseEntity.status(500)
                   .body(new SaveResponse("ERROR", "Error saving code: " + e.getMessage()));
        }
    }

    /* ───────────────────────────── LATEST ──────────────────────────── */

    @GetMapping("/latest")
    public ResponseEntity<LatestResponse> latest(@RequestParam String fileId) {
        try {
            FileMetadata meta = metaRepo.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
            Long folderId  = meta.getFolderId();
            Long projectId = folderRepo.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"))
                .getProjectId();
            String fileDir = meta.getId() + "-" + meta.getFilename().replace('.', '-');

            ResponseEntity<LatestResponse> rsp =
                rest.getForEntity(
                  fsUrl + "/latest?projectId=" + projectId + "&fileDir=" + fileDir,
                  LatestResponse.class
                );
            return ResponseEntity.status(rsp.getStatusCode()).body(rsp.getBody());

        } catch (Exception e) {
            return ResponseEntity.status(500)
              .body(new LatestResponse(null,
                "ERROR retrieving latest snapshot: " + e.getMessage()));
        }
    }

    /* ─────────────────────────── DTOS ─────────────────────────────── */

    public static class CodeRequest {
        private String code;
        private String filename;
        private Long   folderId;
        private String summary;
        public String getCode()            { return code; }
        public void   setCode(String c)    { code = c; }
        public String getFilename()        { return filename; }
        public void   setFilename(String f){ filename = f; }
        public Long   getFolderId()        { return folderId; }
        public void   setFolderId(Long id) { folderId = id; }
        public String getSummary()         { return summary; }
        public void   setSummary(String s) { summary = s; }
    }

    private record SnapshotRequest(
        String fileId,
        String filename,
        String content,
        String author,
        String summary
    ) { }

    public static class SaveResponse {
        private String fileId;
        private String snapshotName;
        public SaveResponse(String f, String s) {
            fileId = f; snapshotName = s;
        }
        public String getFileId()          { return fileId; }
        public void   setFileId(String v)  { fileId = v; }
        public String getSnapshotName()    { return snapshotName; }
        public void   setSnapshotName(String v) { snapshotName = v; }
    }

    public static class LatestResponse {
        private String snapshotName;
        private String content;
        public LatestResponse() { }
        public LatestResponse(String s, String c) {
            snapshotName = s; content = c;
        }
        public String getSnapshotName()        { return snapshotName; }
        public void   setSnapshotName(String v){ snapshotName = v; }
        public String getContent()             { return content; }
        public void   setContent(String v)     { content = v; }
    }

    public static class SnapshotInfo {
        public Long   id;
        public String snapshotName;
        public String author;
        public String summary;
        public String timestamp;
        public SnapshotInfo(Long id, String name, String author,
                            String summary, String timestamp) {
            this.id           = id;
            this.snapshotName = name;
            this.author       = author;
            this.summary      = summary;
            this.timestamp    = timestamp;
        }
    }
}
