package com.collabcode.server.controller;

import com.collabcode.server.entity.FileMetadata;
import com.collabcode.server.entity.Folder;
import com.collabcode.server.entity.Project;
import com.collabcode.server.repository.FileMetadataRepository;
import com.collabcode.server.repository.FolderRepository;
import com.collabcode.server.service.FolderService;
import com.collabcode.server.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;



import org.springframework.core.io.Resource;
import org.springframework.http.*;
import java.nio.file.*;


@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @Autowired private FolderRepository folderRepo;
    @Autowired private FileMetadataRepository fileMetaRepo;
    @Autowired private FolderService folderService;
    @Autowired private FilesController filesController;
    @Autowired private CodeController codeController;
    
    @Value("${filesystem.service.url}")
    private String fsUrl;

    private final RestTemplate rest = new RestTemplate();

    // Updated create endpoint to take OAuth2AuthenticationToken,
    // so that the authenticated user's GitHub ID is used.
    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project, OAuth2AuthenticationToken authentication) {
        // Extract GitHub user ID from authentication attributes.
        String userId = authentication.getPrincipal().getAttribute("id").toString();
        Project createdProject = projectService.create(project, userId);
        return ResponseEntity.ok(createdProject);
    }

    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAll());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<Project>> getMyProjects(OAuth2AuthenticationToken authentication) {
        String userId = authentication.getPrincipal().getAttribute("id").toString();
        List<Project> projects = projectService.getProjectsByUser(userId);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable Long id, @RequestBody Project updated) {
        return ResponseEntity.ok(projectService.update(id, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/{id}/fork")
    public ResponseEntity<Project> forkProject(@PathVariable Long id, OAuth2AuthenticationToken auth) {
        try {
            String userId = auth.getPrincipal().getAttribute("id").toString();

            // 1. Get original folders
            List<Folder> originalFolders = folderRepo.findByProjectId(id);

            // 2. Get files from original project folders
            List<FileMetadata> originalFiles = fileMetaRepo.findAll().stream()
                    .filter(f -> originalFolders.stream().anyMatch(folder -> folder.getId().equals(f.getFolderId())))
                    .toList();

            // 3. Get content for each file's latest snapshot
            Map<String, String> fileContentMap = new HashMap<>();
            for (FileMetadata file : originalFiles) {
                Long folderId = file.getFolderId();
                Long projectId = folderRepo.findById(folderId).orElseThrow().getProjectId();
                String fileDir = file.getId() + "-" + file.getFilename().replace('.', '-');
                String url = fsUrl + "/latest?projectId=" + projectId + "&fileDir=" + fileDir;
                try {
                    ResponseEntity<CodeController.LatestResponse> response = rest.getForEntity(url, CodeController.LatestResponse.class);
                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        fileContentMap.put(file.getFilename(), response.getBody().getContent());
                    }
                } catch (Exception e) {
                    // skip files with no snapshot
                }
            }

            // 4. Create new project
            Project original = projectService.getById(id);
            Project newProject = new Project();
            newProject.setName(original.getName() + "-fork");
            newProject.setOwner(userId);
            Project savedProject = projectService.create(newProject, userId);

            // 5. Re-create folders (same names and hierarchy)
            Map<Long, Long> folderMap = new HashMap<>(); // oldId -> newId
            for (Folder folder : originalFolders) {
                Folder copy = new Folder();
                copy.setName(folder.getName());
                copy.setProjectId(savedProject.getId());
                if (folder.getParentId() != null) {
                    copy.setParentId(folderMap.get(folder.getParentId()));
                }
                copy.setName(URLEncoder.encode(copy.getName(), StandardCharsets.UTF_8));
                Folder saved = folderService.create(copy);
                folderMap.put(folder.getId(), saved.getId());
            }

            // 6. Re-create files + snapshots
            for (FileMetadata file : originalFiles) {
                Long newFolderId = folderMap.get(file.getFolderId());
                String filename = file.getFilename();
                String content = fileContentMap.getOrDefault(filename, "");

                FilesController.FileCreationRequest req = new FilesController.FileCreationRequest();
                req.setFilename(filename);
                req.setFolderId(newFolderId);
                req.setCode(content);
                FilesController.FileCreationResponse response = (FilesController.FileCreationResponse) filesController.createFile(req).getBody();
                if (response != null) {
                    CodeController.CodeRequest saveReq = new CodeController.CodeRequest();
                    saveReq.setFilename(filename);
                    saveReq.setFolderId(newFolderId);
                    saveReq.setCode(content);
                    saveReq.setSummary("forked from project " + id);
                    codeController.save(saveReq, auth);
                }
            }

            return ResponseEntity.ok(savedProject);

        } catch (Exception e) {
            e.printStackTrace(); 
            return ResponseEntity.status(500).body(null);
        }
    }


    @PostMapping("/{id}/merge")
    public ResponseEntity<Project> mergeProjects(
        @PathVariable Long id,
        @RequestBody MergeRequest mergeRequest,
        OAuth2AuthenticationToken auth
    ) {
        try {
            String userId = auth.getPrincipal().getAttribute("id").toString();
            Long otherId = mergeRequest.getOtherProjectId();

            Project project1 = projectService.getById(id);
            Project project2 = projectService.getById(otherId);

            List<Folder> folders1 = folderRepo.findByProjectId(id);
            List<Folder> folders2 = folderRepo.findByProjectId(otherId);
            List<Folder> allFolders = new ArrayList<>();
            allFolders.addAll(folders1);
            allFolders.addAll(folders2);

            List<FileMetadata> files = fileMetaRepo.findAll().stream()
                .filter(f -> allFolders.stream().anyMatch(folder -> folder.getId().equals(f.getFolderId())))
                .toList();

            Map<String, String> fileContents = new HashMap<>();
            for (FileMetadata file : files) {
                Long projectId = folderRepo.findById(file.getFolderId()).orElseThrow().getProjectId();
                String fileDir = file.getId() + "-" + file.getFilename().replace('.', '-');
                String url = fsUrl + "/latest?projectId=" + projectId + "&fileDir=" + fileDir;
                try {
                    ResponseEntity<CodeController.LatestResponse> rsp =
                        rest.getForEntity(url, CodeController.LatestResponse.class);
                    if (rsp.getStatusCode().is2xxSuccessful() && rsp.getBody() != null) {
                        fileContents.put(file.getId(), rsp.getBody().getContent());
                    }
                } catch (Exception ignored) {}
            }

            // 4. Create new project
            Project newProject = new Project();
            newProject.setName(project1.getName() + " + " + project2.getName());
            newProject.setOwner(userId);
            Project savedProject = projectService.create(newProject, userId);

            // 5. Recreate folders (skip duplicates by name)
            Map<String, Long> createdFolders = new HashMap<>();
            Map<Long, Long> folderMap = new HashMap<>();

            for (Folder folder : allFolders) {
                String folderKey = folder.getName();
                if (createdFolders.containsKey(folderKey)) {
                    // Check if the folder came from a different original folder (same name, different ID)
                    Long existingId = createdFolders.get(folderKey);
                    Folder existing = folderRepo.findById(existingId).orElse(null);
                    if (existing != null && !existing.getId().equals(folder.getId())) {
                        // still map it to same destination, but let files from both go to it
                        folderMap.put(folder.getId(), createdFolders.get(folderKey));
                        continue;
                    }
                }
                

                Folder copy = new Folder();
                copy.setName(URLEncoder.encode(folder.getName(), StandardCharsets.UTF_8));
                copy.setProjectId(savedProject.getId());
                if (folder.getParentId() != null && folderMap.containsKey(folder.getParentId())) {
                    copy.setParentId(folderMap.get(folder.getParentId()));
                }

                Folder saved = folderService.create(copy);
                folderMap.put(folder.getId(), saved.getId());
                createdFolders.put(folderKey, saved.getId());
            }

            // 6. Recreate files (rename duplicates)
            Map<String, Integer> fileNameCounts = new HashMap<>();

            for (FileMetadata file : files) {
                Long newFolderId = folderMap.get(file.getFolderId());
                String originalName = file.getFilename();
                String folderName = folderRepo.findById(file.getFolderId()).map(Folder::getName).orElse("default");
                String versionKey = originalName + "::" + folderName;
                
                int version = fileNameCounts.getOrDefault(versionKey, 0) + 1;
                fileNameCounts.put(versionKey, version);
                
                String newName;
                if (version == 1) {
                    newName = originalName;
                } else {
                    int dotIndex = originalName.lastIndexOf(".");
                    String base = dotIndex >= 0 ? originalName.substring(0, dotIndex) : originalName;
                    String ext = dotIndex >= 0 ? originalName.substring(dotIndex) : "";
                    newName = base + "-v" + version + ext;
                }
                

                FilesController.FileCreationRequest req = new FilesController.FileCreationRequest();
                req.setFilename(newName);
                req.setFolderId(newFolderId);
                req.setCode(""); // required but will be replaced below
                FilesController.FileCreationResponse resp = (FilesController.FileCreationResponse)
                        filesController.createFile(req).getBody();

                if (resp != null && fileContents.containsKey(file.getId())) {
                    CodeController.CodeRequest saveReq = new CodeController.CodeRequest();
                    saveReq.setFilename(newName);
                    saveReq.setFolderId(newFolderId);
                    saveReq.setCode(fileContents.get(file.getId()));
                    saveReq.setSummary("merged from project " + file.getFolderId());
                    codeController.save(saveReq, auth);
                }
            }

            return ResponseEntity.ok(savedProject);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    public static class MergeRequest {
        private Long otherProjectId;
        public Long getOtherProjectId() { return otherProjectId; }
        public void setOtherProjectId(Long otherProjectId) { this.otherProjectId = otherProjectId; }
    }

    @GetMapping("/{id}/download")
        public ResponseEntity<Resource> downloadProject(@PathVariable Long id) throws IOException {
        Project project = projectService.getById(id);
        List<Folder> folders = folderRepo.findByProjectId(id);
        List<FileMetadata> files = fileMetaRepo.findAll().stream()
            .filter(f -> folders.stream().anyMatch(folder -> folder.getId().equals(f.getFolderId())))
            .toList();

        Map<Long, Folder> folderMap = folders.stream().collect(Collectors.toMap(Folder::getId, f -> f));

        // Create a temp file for the zip
        Path zipPath = Files.createTempFile("project-", ".zip");
        try (ZipOutputStream zos = new ZipOutputStream(Files.newOutputStream(zipPath))) {
            for (FileMetadata file : files) {
                Folder folder = folderMap.get(file.getFolderId());
                String folderPath = folder != null ? folder.getName() : "unknown-folder";
                String fileName = file.getFilename();
                String zipEntryPath = folderPath + "/" + fileName;

                String fileDir = file.getId() + "-" + file.getFilename().replace('.', '-');
                String url = fsUrl + "/latest?projectId=" + id + "&fileDir=" + fileDir;

                String content = "";
                try {
                    ResponseEntity<CodeController.LatestResponse> rsp =
                        rest.getForEntity(url, CodeController.LatestResponse.class);
                    if (rsp.getStatusCode().is2xxSuccessful() && rsp.getBody() != null) {
                        content = rsp.getBody().getContent();
                    }
                } catch (Exception ignored) {}

                ZipEntry entry = new ZipEntry(zipEntryPath);
                zos.putNextEntry(entry);
                zos.write(content.getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }

        FileSystemResource resource = new FileSystemResource(zipPath.toFile());
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + project.getName().replaceAll(" ", "_") + "-clone.zip\"")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .contentLength(resource.contentLength())
            .body(resource);
    }

}
