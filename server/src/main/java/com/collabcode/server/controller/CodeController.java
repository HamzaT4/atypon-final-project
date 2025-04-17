package com.collabcode.server.controller;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.factory.FileMetadataFactory;
import com.collabcode.server.repository.FileMetadataRepository;
import com.collabcode.server.repository.FolderRepository;
import com.collabcode.server.service.FileSystemClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 *  –  POST /api/code         → save snapshot (with de‑duplication)
 *  –  GET  /api/code/latest  → newest snapshot + content for a file
 */
@RestController
@RequestMapping("/api/code")
public class CodeController {

    @Value("${filesystem.service.url}")
    private String fsUrl;

    private final RestTemplate           rest = new RestTemplate();
    private final FileMetadataRepository metaRepo;
    private final FolderRepository       folderRepo;
    private final FileSystemClient       fsClient;

    public CodeController(FileMetadataRepository metaRepo,
                          FolderRepository folderRepo,
                          FileSystemClient fsClient) {
        this.metaRepo   = metaRepo;
        this.folderRepo = folderRepo;
        this.fsClient   = fsClient;
    }

    /* ───────────────────────────── SAVE ───────────────────────────── */

    @PostMapping
    public ResponseEntity<SaveResponse> save(@RequestBody CodeRequest req) {

        try {
            /* ----- locate or create FileMetadata ----- */
            String filename = req.getFilename();
            String ext      = filename.substring(filename.lastIndexOf('.'));

            FileMetadata meta = metaRepo.findAll().stream()
                    .filter(f -> f.getFilename().equals(filename)
                              && f.getFolderId().equals(req.getFolderId()))
                    .findFirst()
                    .orElseGet(() -> metaRepo.save(
                            FileMetadataFactory.createFileMetadata(
                                    filename, "anonymous", req.getFolderId())));

            Long   projectId = folderRepo.findById(req.getFolderId())
                    .orElseThrow(() -> new RuntimeException("Folder not found"))
                    .getProjectId();
            String fileDir   = meta.getId() + "-" + filename.replace('.', '-');

            /* ensure folder exists on FS */
            fsClient.createFolder(projectId, fileDir);

            /* ----- DE‑DUPLICATION: compare with latest snapshot ----- */
            String latestUrl = fsUrl +
                    "/latest?projectId=" + projectId + "&fileDir=" + fileDir;

            ResponseEntity<LatestResponse> latestRsp =
                    rest.getForEntity(latestUrl, LatestResponse.class);

            if (latestRsp.getStatusCode() == HttpStatus.OK
                && latestRsp.getBody() != null
                && req.getCode().equals(latestRsp.getBody().getContent())) {

                /* identical – no new snapshot */
                return ResponseEntity.ok(
                        new SaveResponse(meta.getId(),
                                         latestRsp.getBody().getSnapshotName()));
            }

            /* ----- create NEW snapshot (content differs or none exists) ----- */
            String ts   = LocalDateTime.now()
                               .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String snap = meta.getId() + "_" + ts + ext;
            String rel  = projectId + "/" + fileDir + "/" + snap;

            SnapshotRequest body = new SnapshotRequest(rel, req.getCode());
            HttpHeaders hdr      = new HttpHeaders();
            hdr.setContentType(MediaType.APPLICATION_JSON);
            rest.postForEntity(fsUrl + "/save", new HttpEntity<>(body, hdr), Void.class);

            return ResponseEntity.ok(new SaveResponse(meta.getId(), rel));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                    new SaveResponse("ERROR", "Error saving code: " + e.getMessage()));
        }
    }

    /* ─────────────────────  LATEST SNAPSHOT  ─────────────────────── */

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

            String url = fsUrl +
                    "/latest?projectId=" + projectId + "&fileDir=" + fileDir;
            ResponseEntity<LatestResponse> rsp =
                    rest.getForEntity(url, LatestResponse.class);

            return ResponseEntity.status(rsp.getStatusCode()).body(rsp.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new LatestResponse(null,
                            "ERROR retrieving latest snapshot: " + e.getMessage()));
        }
    }

    /* ───────────────────────────── DTOs ──────────────────────────── */

    public static class CodeRequest {
        private String code; private String filename; private Long folderId;
        public String getCode()            { return code; }
        public void   setCode(String c)    { code = c; }
        public String getFilename()        { return filename; }
        public void   setFilename(String f){ filename = f; }
        public Long   getFolderId()        { return folderId; }
        public void   setFolderId(Long id) { folderId = id; }
    }

    private record SnapshotRequest(String filename, String content) { }

    public static class SaveResponse {
        private String fileId;      // “ERROR” on failure
        private String snapshotName;
        public SaveResponse(String f,String s){fileId=f;snapshotName=s;}
        public String getFileId(){return fileId;}               public void setFileId(String v){fileId=v;}
        public String getSnapshotName(){return snapshotName;}   public void setSnapshotName(String v){snapshotName=v;}
    }

    public static class LatestResponse {
        private String snapshotName;
        private String content;
        public LatestResponse(){ }
        public LatestResponse(String s,String c){snapshotName=s;content=c;}
        public String getSnapshotName(){return snapshotName;}   public void setSnapshotName(String v){snapshotName=v;}
        public String getContent(){return content;}             public void setContent(String v){content=v;}
    }
}
